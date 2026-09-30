import { useEffect, useRef, useState } from "react";
import { createChatbotStreamParser, STREAM_FINAL_PREFIX, STREAM_STATUS_PREFIX } from "./streamParser.js";

const QUESTION_COOLDOWN_SECONDS = 15;

export default function useChatbotConversation({ API_URL, farmId, options, tryChecked, tryitPayload, currentPage, username }) {
  const farmKey = String(farmId || username || "global").trim();
  const modelStorageKey = `sflman_chatbot_model:${farmKey}`;
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, ask me a question about your farm or the game mechanics." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [modelQuotas, setModelQuotas] = useState(null);
  const lunaAvailable = modelQuotas?.luna?.unlimited === true || Number(modelQuotas?.luna?.remaining || 0) > 0;
  const [quotaRevision, setQuotaRevision] = useState(0);
  const [selectedModel, setSelectedModelState] = useState(() => {
    try {
      const stored = String(localStorage.getItem(modelStorageKey) || "").toLowerCase();
      if (stored === "luna") return "luna";
      if (stored === "qwen") return "qwen";
    } catch {
      // Ignore unavailable localStorage (private mode, browser restrictions, etc.).
    }
    return "qwen";
  });
  const bodyRef = useRef(null);
  const bodyAutoScrollRef = useRef(true);
  const streamBufferRef = useRef("");
  const streamParserRef = useRef(null);
  const streamRenderTimerRef = useRef(null);
  const streamRenderedTextRef = useRef("");
  const streamNeedsFlushRef = useRef(false);

  function setSelectedModel(model) {
    const next = model === "luna" && lunaAvailable ? "luna" : "qwen";
    setSelectedModelState(next);
    try {
      localStorage.setItem(modelStorageKey, next);
    } catch {
      // Model selection still works when localStorage is unavailable.
    }
  }

  useEffect(() => {
    if (!farmId && !username) return undefined;
    const controller = new AbortController();
    fetch(`${API_URL || ""}/chatbot/quota?farmId=${encodeURIComponent(farmId || username)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((quota) => {
        if (!quota?.ok) return;
        const models = quota.models || null;
        setModelQuotas(models);
        if (selectedModel === "luna" && !(models?.luna?.unlimited === true || Number(models?.luna?.remaining || 0) > 0)) {
          setSelectedModelState("qwen");
          try {
            localStorage.setItem(modelStorageKey, "qwen");
          } catch {
            // Model fallback still works when localStorage is unavailable.
          }
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [API_URL, farmId, username, quotaRevision]);

  function clearStreamTimer() {
    if (!streamRenderTimerRef.current) return;
    if (typeof window !== "undefined" && typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(streamRenderTimerRef.current);
    } else {
      clearTimeout(streamRenderTimerRef.current);
    }
    streamRenderTimerRef.current = null;
  }

  function resetStreamState() {
    streamBufferRef.current = "";
    streamRenderedTextRef.current = "";
    streamNeedsFlushRef.current = false;
    streamParserRef.current = createChatbotStreamParser({
      onText: appendAnswerText,
      onStatus: appendStatus,
      onFinal: appendFinal,
    });
    clearStreamTimer();
  }

  function replaceAnswerText(text) {
    streamBufferRef.current = String(text || "");
    streamRenderedTextRef.current = streamBufferRef.current;
    setMessages((prev) => {
      const copy = [...prev];
      const lastIndex = copy.length - 1;
      if (lastIndex >= 0 && copy[lastIndex].role === "assistant") {
        copy[lastIndex] = { ...copy[lastIndex], content: streamBufferRef.current, status: "" };
      }
      return copy;
    });
  }

  function appendFinal(payload) {
    if (payload?.answer != null) replaceAnswerText(payload.answer);
    if (payload?.responseId) setMessages((prev) => prev.map((message, index) => index === prev.length - 1 ? { ...message, responseId: payload.responseId } : message));
    if (payload?.tokenUsed != null || payload?.tokenLimit != null) {
      const model = payload.selectedModel === "luna" ? "luna" : selectedModel;
      setModelQuotas((current) => ({ ...current, [model]: {
        ...current?.[model],
        tokenUsed: Number(payload.tokenUsed ?? current?.[model]?.tokenUsed ?? 0),
        tokenLimit: payload.tokenLimit ?? current?.[model]?.tokenLimit ?? null,
      } }));
    }
    if (payload?.tokenUsed != null) setQuotaRevision((revision) => revision + 1);
    if (payload?.selectedModel) setSelectedModelState(payload.selectedModel === "luna" ? "luna" : "qwen");
  }

  function appendAnswerText(text) {
    if (!text) return;
    streamBufferRef.current += text;
    if (streamNeedsFlushRef.current) return;
    streamNeedsFlushRef.current = true;
    const flush = () => {
      streamRenderTimerRef.current = null;
      streamNeedsFlushRef.current = false;
      const nextContent = streamBufferRef.current;
      if (nextContent === streamRenderedTextRef.current) return;
      streamRenderedTextRef.current = nextContent;
      setMessages((prev) => {
        const copy = [...prev];
        const lastIndex = copy.length - 1;
        if (lastIndex >= 0 && copy[lastIndex].role === "assistant") {
          copy[lastIndex] = { ...copy[lastIndex], content: nextContent, status: copy[lastIndex].status || "" };
        }
        return copy;
      });
    };
    streamRenderTimerRef.current = typeof window !== "undefined" && typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame(flush)
      : setTimeout(flush, 16);
  }

  function appendStatus(payload) {
    const label = String(payload?.label || "").trim();
    const detail = String(payload?.detail || "").trim();
    const statusText = [label, detail].filter(Boolean).join(": ");
    if (!statusText) return;
    setMessages((prev) => {
      const copy = [...prev];
      const lastIndex = copy.length - 1;
      if (lastIndex < 0 || copy[lastIndex].role !== "assistant") return copy;
      const previousLog = Array.isArray(copy[lastIndex].statusLog) ? copy[lastIndex].statusLog : [];
      const nextLog = previousLog[previousLog.length - 1] === statusText
        ? previousLog
        : [...previousLog, statusText].slice(-20);
      copy[lastIndex] = {
        ...copy[lastIndex],
        status: statusText,
        statusLog: nextLog,
      };
      return copy;
    });
  }

  function handleStreamChunk(chunk) {
    if (!streamParserRef.current) resetStreamState();
    streamParserRef.current.push(chunk);
  }

  async function sendMessage() {
    const prompt = input.trim();
    if (!prompt || loading || cooldown > 0) return;
    const nextMessages = [...messages, { role: "user", content: prompt }];
    setMessages(nextMessages);
    setInput("");
    setCooldown(QUESTION_COOLDOWN_SECONDS);
    setLoading(true);
    bodyAutoScrollRef.current = true;
    try {
      resetStreamState();
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const response = await fetch((API_URL || "") + "/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          messages: nextMessages.slice(-10),
          farmId,
          username,
          options: { ...(options || {}), tryChecked: !!tryChecked },
          tryitarrays: tryitPayload?.tryitarrays || {},
          tryitMode: tryitPayload?.tryitMode || "active",
          uiContext: { currentPage: currentPage || "home", trysetEnabled: !!tryChecked },
          stream: true,
          model: selectedModel,
        }),
      });
      if (!response.ok || !response.body) {
        const responseData = await response.json().catch(() => ({}));
        if (responseData.tokenUsed != null || responseData.tokenLimit != null) {
          setModelQuotas((current) => ({ ...current, [selectedModel]: {
            ...current?.[selectedModel],
            tokenUsed: Number(responseData.tokenUsed ?? current?.[selectedModel]?.tokenUsed ?? 0),
            tokenLimit: responseData.tokenLimit ?? current?.[selectedModel]?.tokenLimit ?? null,
          } }));
        }
        if (response.status === 429) setQuotaRevision((revision) => revision + 1);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: responseData.limitMessage || responseData.error || "Grubnuk is not here for now" },
        ]);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      while (!done) {
        const result = await reader.read();
        done = !!result.done;
        if (done) break;
        handleStreamChunk(decoder.decode(result.value, { stream: true }));
      }
      streamParserRef.current?.flush();
      clearStreamTimer();
      setMessages((prev) => {
        const copy = [...prev];
        const lastIndex = copy.length - 1;
        if (lastIndex >= 0 && copy[lastIndex].role === "assistant") {
          copy[lastIndex] = { ...copy[lastIndex], content: streamBufferRef.current, status: "" };
        }
        return copy;
      });
    } catch {
      clearStreamTimer();
      const pendingText = String(streamParserRef.current?.getPending() || "");
      if (
        pendingText
        && !pendingText.startsWith(STREAM_STATUS_PREFIX)
        && !pendingText.startsWith(STREAM_FINAL_PREFIX)
      ) {
        streamBufferRef.current += pendingText;
        streamParserRef.current?.reset();
      }
      const partialContent = String(streamBufferRef.current || "").trim();
      setMessages((prev) => {
        const copy = [...prev];
        const lastIndex = copy.length - 1;
        if (lastIndex >= 0 && copy[lastIndex].role === "assistant" && partialContent) {
          copy[lastIndex] = {
            ...copy[lastIndex],
            content: streamBufferRef.current,
            status: "Generation interrupted after a partial answer",
          };
          return copy;
        }
        if (lastIndex >= 0 && copy[lastIndex].role === "assistant" && !copy[lastIndex].content) {
          copy[lastIndex] = { role: "assistant", content: "Grubnuk is not here for now" };
          return copy;
        }
        return [...copy, { role: "assistant", content: "Grubnuk is not here for now" }];
      });
    } finally {
      clearStreamTimer();
      setLoading(false);
    }
  }

  async function reportAnswer(responseId) {
    const target = messages.find((message) => message.responseId === responseId);
    if (!target || (target.feedbackState && target.feedbackState !== "error")) return;
    setMessages((prev) => prev.map((message) => message.responseId === responseId ? { ...message, feedbackState: "sending" } : message));
    try {
      const response = await fetch((API_URL || "") + "/chatbot/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ responseId }),
      });
      if (!response.ok) throw new Error("Feedback failed");
      setMessages((prev) => prev.map((message) => message.responseId === responseId ? { ...message, feedbackState: "sent" } : message));
    } catch {
      setMessages((prev) => prev.map((message) => message.responseId === responseId ? { ...message, feedbackState: "error" } : message));
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleBodyScroll() {
    const element = bodyRef.current;
    if (!element) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    bodyAutoScrollRef.current = distanceFromBottom < 80;
  }

  useEffect(() => {
    if (!bodyAutoScrollRef.current) return;
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  return {
    bodyRef,
    cooldown,
    modelQuotas,
    handleBodyScroll,
    handleKeyDown,
    input,
    lunaAvailable,
    loading,
    messages,
    reportAnswer,
    sendMessage,
    selectedModel,
    setSelectedModel,
    setInput,
  };
}
