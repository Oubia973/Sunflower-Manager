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
    sendMessage,
    setInput,
  } = useChatbotConversation({ API_URL, farmId, options, tryChecked, tryitPayload, currentPage, username });
  const [isOpen, setIsOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [modalSize, setModalSize] = useState(null);
  const [resizing, setResizing] = useState(false);
  const modalRef = useRef(null);
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef(null);
  
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
    if (isInteractive(e.target)) return;
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
    };
    setResizing(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleResizeMove = (event) => {
    const start = resizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setModalSize(clampModalSize({
      width: start.width + event.clientX - start.startX,
      height: start.height + event.clientY - start.startY,
    }));
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
        className="tooltip chatbot-modal"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          ...(modalSize ? { width: `${modalSize.width}px`, height: `${modalSize.height}px` } : {}),
          "--chatbot-dx": `${dragOffset.x}px`,
          "--chatbot-dy": `${dragOffset.y}px`,
          willChange: "transform",
          touchAction: "none",
          transition: dragging ? "none" : undefined,
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
            <button onClick={closeModal} className="button" title="Close">
              <img src={imgcancel} alt="" className="resico" />
            </button>
          </div>
        </div>
        <div className="chatbot-body" ref={bodyRef} onScroll={handleBodyScroll}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`chatbot-message chatbot-message-${message.role}`}>
              <ChatbotMarkdown content={message.content} role={message.role} />
              <ChatbotDebugPanel statusLog={message.statusLog} messageIndex={index} />
            </div>
          ))}
          {loading ? (
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Grubnuk"
            maxLength={4000}
            rows={2}
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
        <div
          className={`chatbot-resize-handle ${resizing ? "is-resizing" : ""}`}
          role="presentation"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
        />
      </div>
    </div>
  );
}

export default ModalChatbot;
