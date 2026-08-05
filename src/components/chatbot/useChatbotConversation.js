import { useEffect, useRef, useState } from "react";
import { createChatbotStreamParser, STREAM_FINAL_PREFIX, STREAM_STATUS_PREFIX } from "./streamParser.js";

const QUESTION_COOLDOWN_SECONDS = 15;

function getUtcDayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function useChatbotConversation({ API_URL, farmId, options, tryChecked, tryitPayload, currentPage, username }) {
  const isSubscriber = !!options?.isAbo;
  const storageKey = `sflman_chatbot_used:${String(farmId || username || "global").trim()}`;
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi, ask me a question about your farm or the game mechanics." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(5);
  const [chatbotUsed, setChatbotUsed] = useState(() => readChatbotUsedFromStorage().count);
  const bodyRef = useRef(null);
  const bodyAutoScrollRef = useRef(true);
  const streamBufferRef = useRef("");
  const streamParserRef = useRef(null);
  const streamRenderTimerRef = useRef(null);
  const streamRenderedTextRef = useRef("");
  const streamNeedsFlushRef = useRef(false);

  function readChatbotUsedFromStorage() {
    if (isSubscriber) return { count: 0, date: "" };
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return { count: 0, date: "" };
      const parsed = JSON.parse(stored);
      if (parsed?.date !== getUtcDayKey()) return { count: 0, date: "" };
      return { count: Number(parsed?.count || 0), date: parsed.date };
    } catch {
      return { count: 0, date: "" };
    }
  }

  function writeChatbotUsedToStorage(value, date = getUtcDayKey()) {
    if (isSubscriber) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        count: Number(value || 0),
        date,
      }));
    } catch {
      // Ignore localStorage errors.
    }
  }

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
    if (payload?.chatbotUsed != null) {
      const newUsed = payload.chatbotUsed;
      setChatbotUsed(newUsed);
      writeChatbotUsedToStorage(newUsed, payload.chatbotUsedDate || getUtcDayKey());
    }
    if (payload?.dailyLimit != null) setDailyLimit(payload.dailyLimit);
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
        }),
      });
      if (!response.ok || !response.body) {
        const responseData = await response.json().catch(() => ({}));
        if (responseData.dailyLimit != null) {
          setDailyLimit(responseData.dailyLimit);
          const newUsed = responseData.dailyUsed || 0;
          setChatbotUsed(newUsed);
          writeChatbotUsedToStorage(newUsed, responseData.dailyUsedDate || getUtcDayKey());
        }
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
    chatbotUsed,
    cooldown,
    dailyLimit,
    handleBodyScroll,
    handleKeyDown,
    input,
    isSubscriber,
    loading,
    messages,
    sendMessage,
    setInput,
  };
}
