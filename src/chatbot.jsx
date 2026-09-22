import React, { useEffect, useRef, useState } from "react";
import { imgcancel, imggoblinThinking, imggrubnuk, imgarrowUp } from "./constants/images.js";
import ChatbotMarkdown from "./components/chatbot/ChatbotMarkdown.jsx";
import ChatbotDebugPanel from "./components/chatbot/ChatbotDebugPanel.jsx";
import useChatbotConversation from "./components/chatbot/useChatbotConversation.js";
import "./components/chatbot/chatbot-ui.css";

function ModalChatbot({ onClose, API_URL, farmId, options, tryChecked, tryitPayload, currentPage, username }) {
  const {
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
    reportAnswer,
    sendMessage,
    setInput,
  } = useChatbotConversation({ API_URL, farmId, options, tryChecked, tryitPayload, currentPage, username });
  const [isOpen, setIsOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [modalSize, setModalSize] = useState(null);
  const [resizing, setResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef(null);
  const fullscreenRestoreRef = useRef(null);

  const resizeInput = (element) => {
    if (!element || typeof window === "undefined") return;
    const styles = window.getComputedStyle(element);
    const minHeight = Number.parseFloat(styles.minHeight) || 0;
    const maxHeight = Number.parseFloat(styles.maxHeight);
    // Measuring from zero avoids the browser's default textarea row height
    // being mistaken for actual content and forcing an empty second line.
    element.style.height = "0px";
    const nextHeight = Math.max(minHeight, Math.min(
      element.scrollHeight,
      Number.isFinite(maxHeight) ? maxHeight : element.scrollHeight,
    ));
    element.style.height = `${nextHeight}px`;
  };
  
  const closeModal = () => {
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const getClientPos = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const isInteractive = (target) =>
    !!target.closest("input, textarea, select, button, a, label, [role=\"button\"]");

  const handleMouseDown = (e) => {
    if (isFullscreen || isInteractive(e.target)) return;
    const { x, y } = getClientPos(e);
    dragStartMouse.current = { x, y };
    dragStartOffset.current = dragOffset;
    setDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    const { x, y } = getClientPos(e);
    setDragOffset({
      x: dragStartOffset.current.x + (x - dragStartMouse.current.x),
      y: dragStartOffset.current.y + (y - dragStartMouse.current.y),
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const clampModalSize = ({ width, height }) => {
    const horizontalMargin = window.innerWidth <= 700 ? 8 : 32;
    const verticalMargin = window.innerWidth <= 700 ? 8 : 32;
    const maxWidth = Math.max(0, window.innerWidth - horizontalMargin);
    const maxHeight = Math.max(0, window.innerHeight - verticalMargin);
    return {
      width: Math.min(maxWidth, Math.max(Math.min(320, maxWidth), width)),
      height: Math.min(maxHeight, Math.max(Math.min(360, maxHeight), height)),
    };
  };

  const handleResizeStart = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;
    resizeStart.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
      dragOffset,
    };
    setResizing(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleResizeMove = (event) => {
    const start = resizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const nextSize = clampModalSize({
      width: start.width + event.clientX - start.startX,
      height: start.height + event.clientY - start.startY,
    });
    setModalSize(nextSize);
    setDragOffset({
      x: start.dragOffset.x + (nextSize.width - start.width) / 2,
      y: start.dragOffset.y + (nextSize.height - start.height) / 2,
    });
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      const restore = fullscreenRestoreRef.current;
      setModalSize(restore?.modalSize || null);
      setDragOffset(restore?.dragOffset || { x: 0, y: 0 });
      setIsFullscreen(false);
      return;
    }
    fullscreenRestoreRef.current = { modalSize, dragOffset };
    setDragOffset({ x: 0, y: 0 });
    setIsFullscreen(true);
  };

  const handleResizeEnd = (event) => {
    const start = resizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    resizeStart.current = null;
    setResizing(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };


  useEffect(() => {
    setTimeout(() => setIsOpen(true), 50);
  }, []);

  useEffect(() => {
    resizeInput(inputRef.current);
  }, [input]);


  return (
    <div
      className={`tooltip-wrapper ${isOpen ? "open" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      <div
        ref={modalRef}
        className={`tooltip chatbot-modal ${isFullscreen ? "is-fullscreen" : ""}`}
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          ...(modalSize ? { width: `${modalSize.width}px`, height: `${modalSize.height}px` } : {}),
          "--chatbot-dx": `${dragOffset.x}px`,
          "--chatbot-dy": `${dragOffset.y}px`,
          willChange: dragging || resizing ? "width, height, transform" : "transform",
          touchAction: "none",
          transition: dragging || resizing ? "none" : undefined,
          cursor: dragging ? "grabbing" : "grab",
        }}
      >
        <div
          className="chatbot-header"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        >
          <div className="chatbot-header-main">
            <img src={imggrubnuk} alt="Grubnuk" className="chatbot-title-icon" title="Grubnuk" />
            <div className="chatbot-header-copy">
              <strong>Grubnuk</strong>
              <span>Ask about your farm or Sunflower Land mechanics</span>
            </div>
            <span className="chatbot-beta-badge">BETA</span>
          </div>
          <div className="chatbot-header-meta">
            {isSubscriber ? null : (
              <span className="chatbot-remaining-questions" title={`Remaining today: ${Math.max(0, dailyLimit - chatbotUsed)}`}>
                {Math.max(0, dailyLimit - chatbotUsed)}/{dailyLimit} <span className="chatbot-remaining-questions-label">daily limit</span>
              </span>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="button chatbot-fullscreen-button"
              title={isFullscreen ? "Exit full screen" : "Full screen"}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
            >
              <span className={`chatbot-fullscreen-icon ${isFullscreen ? "is-active" : ""}`} aria-hidden="true" />
            </button>
            <button onClick={closeModal} className="button" title="Close">
              <img src={imgcancel} alt="" className="resico" />
            </button>
          </div>
        </div>
        <div className="chatbot-body" ref={bodyRef} onScroll={handleBodyScroll}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chatbot-message chatbot-message-${message.role}`}>
              <div className="chatbot-activity-row">
                <ChatbotDebugPanel
                  statusLog={message.statusLog}
                  messageIndex={index}
                  isActive={loading && index === messages.length - 1}
                  showWhenEmpty={Boolean(message.responseId)}
                />
                {message.role === "assistant" && message.responseId && !(loading && index === messages.length - 1) ? (
                  <button type="button" className="chatbot-feedback-button" onClick={() => reportAnswer(message.responseId)}
                    disabled={message.feedbackState === "sending" || message.feedbackState === "sent"}
                    title={message.feedbackState === "sent" ? "Reported" : "Report a bad answer"}
                    aria-label={message.feedbackState === "sent" ? "Answer reported" : "Report this answer"}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7 14V3H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2ZM7 14l4.1 6.1a2 2 0 0 0 3.6-1.5l-.6-4.6h5.1a2 2 0 0 0 1.9-2.6l-2.2-7A2 2 0 0 0 17 3H7" />
                    </svg>
                    <span>{message.feedbackState === "sent" ? "Reported" : message.feedbackState === "error" ? "Retry bad answer" : "Bad answer"}</span>
                  </button>
                ) : null}
              </div>
              <ChatbotMarkdown content={message.content} role={message.role} />
            </div>
          ))}
          {loading && !messages[messages.length - 1]?.statusLog?.length ? (
            <div className="chatbot-message chatbot-message-assistant chatbot-loading-message">
              <img src={imggoblinThinking} alt="Thinking" className="chatbot-loading-gif" />
              <div className="chatbot-progress-live" aria-live="polite">
                <span className="chatbot-progress-dot" aria-hidden="true" />
                <span>{messages[messages.length - 1]?.status || "Preparing the answer…"}</span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="chatbot-input-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeInput(e.target);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message Grubnuk"
            maxLength={4000}
            rows={1}
          />
          <button
            onClick={sendMessage}
            className="button chatbot-send-button"
            disabled={loading || cooldown > 0 || !input.trim()}
            title="Send"
          >
            {cooldown > 0 ? `${cooldown}s` : <img src={imgarrowUp} alt="Send" className="resico" />}
          </button>
        </div>
        {isFullscreen ? null : (
          <div
            className={`chatbot-resize-handle ${resizing ? "is-resizing" : ""}`}
            role="presentation"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
          />
        )}
      </div>
    </div>
  );
}

export default ModalChatbot;
