import React, { useEffect, useRef, useState } from "react";
import { imgcancel, imggoblinThinking, imggrubnuk, imgarrowUp } from "./constants/images.js";
import ChatbotMarkdown from "./components/chatbot/ChatbotMarkdown.jsx";
import ChatbotDebugPanel from "./components/chatbot/ChatbotDebugPanel.jsx";
import useChatbotConversation from "./components/chatbot/useChatbotConversation.js";

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
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });
  
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
        className="tooltip chatbot-modal"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
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
          <img src={imggrubnuk} alt="Grubnuk" className="chatbot-title-icon" title="Grubnuk" />
          <span className="chatbot-beta-badge">BETA</span>
          {isSubscriber ? null : (
            <span className="chatbot-remaining-questions" title={`Remaining today: ${Math.max(0, dailyLimit - chatbotUsed)}`}>
              {Math.max(0, dailyLimit - chatbotUsed)}/{dailyLimit} <span className="chatbot-remaining-questions-label">daily limit</span>
            </span>
          )}
          <button onClick={closeModal} className="button" title="Close">
            <img src={imgcancel} alt="" className="resico" />
          </button>
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
            placeholder="Message"
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
      </div>
    </div>
  );
}

export default ModalChatbot;
