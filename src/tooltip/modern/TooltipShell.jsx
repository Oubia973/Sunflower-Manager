import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const VIEWPORT_MARGIN = 12;

export default function TooltipShell({
  title,
  titleSuffix,
  subtitle,
  icon,
  draggable = true,
  variant = "",
  clickPosition,
  onClose,
  children,
}) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const closeTimerRef = useRef(null);
  const closingRef = useRef(false);
  const placedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN });
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight);

  const clamp = useCallback((x, y) => {
    const panel = panelRef.current;
    const width = panel?.offsetWidth || 0;
    const height = panel?.offsetHeight || 0;
    return {
      x: Math.min(Math.max(x, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)),
      y: Math.min(Math.max(y, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN)),
    };
  }, []);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => onClose?.(), 160);
  }, [onClose]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    const placeInitially = () => {
      if (placedRef.current) return;
      const x = (clickPosition?.x ?? window.innerWidth / 2) - panel.offsetWidth / 2;
      const y = (clickPosition?.y ?? window.innerHeight / 2) - Math.min(56, panel.offsetHeight / 3);
      setPosition(clamp(x, y));
      placedRef.current = true;
    };
    const frame = requestAnimationFrame(placeInitially);
    const keepInsideViewport = () => {
      setViewportHeight(window.innerHeight);
      setPosition((current) => clamp(current.x, current.y));
    };
    window.addEventListener("resize", keepInsideViewport);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", keepInsideViewport);
    };
  }, [clickPosition?.x, clickPosition?.y, clamp]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(closeTimerRef.current);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("no-select");
    };
  }, [close]);

  useEffect(() => {
    document.body.classList.toggle("no-select", dragging);
    return () => document.body.classList.remove("no-select");
  }, [dragging]);

  const startDrag = (event) => {
    if (!draggable || event.button !== 0) return;
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      dx: event.clientX - position.x,
      dy: event.clientY - position.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  };

  const moveDrag = (event) => {
    if (!dragging || dragRef.current?.pointerId !== event.pointerId) return;
    setPosition(clamp(event.clientX - dragRef.current.dx, event.clientY - dragRef.current.dy));
  };

  const stopDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      className={`modern-tooltip-backdrop ${visible && !closing ? "is-visible" : ""}`}
    >
      <section
        ref={panelRef}
        className={`modern-tooltip ${variant ? `modern-tooltip--${variant}` : ""} ${dragging ? "is-dragging" : ""}`}
        style={{
          left: position.x,
          top: position.y,
          maxHeight: Math.max(
            0,
            Math.min(viewportHeight * 0.9, viewportHeight - position.y - VIEWPORT_MARGIN),
          ),
        }}
        role="dialog"
        aria-modal="false"
        aria-label={title || "Details"}
      >
        <header
          className={`modern-tooltip__header ${draggable ? "is-draggable" : ""}`}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
        >
          {icon ? <img className="modern-tooltip__icon" src={icon} alt="" /> : null}
          <div className="modern-tooltip__heading">
            <strong>{title}{titleSuffix ? <span className="modern-tooltip__title-suffix">{titleSuffix}</span> : null}</strong>
            {subtitle ? <span>{subtitle}</span> : null}
          </div>
          <button
            type="button"
            className="modern-tooltip__close"
            aria-label="Close"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={close}
          >
            ×
          </button>
        </header>
        <div className="modern-tooltip__content">{children}</div>
      </section>
    </div>
  );
}
