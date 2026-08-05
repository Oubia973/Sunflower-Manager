import React, { useEffect, useMemo, useState } from "react";

export default function AutoRefreshProgress({
  active = false,
  resetKey = "",
  durationMs = 60 * 1000,
  deadlineMs = 0,
  variant = "circle",
  color = "#4caf50",
  circleSize = 34,
  circleRadius = 16,
  circleStrokeWidth = 3,
  circleStyle = null,
  barWidth = 48,
  barHeight = 5,
  barBorder = "1px solid #555",
  barBackground = "#111",
  barFillStyle = null,
}) {
  const [progress, setProgress] = useState(0);
  const duration = Math.max(1, Number(durationMs) || 1);
  const deadline = Number(deadlineMs) || 0;

  useEffect(() => {
    setProgress(0);
  }, [resetKey, active, duration, deadline]);

  useEffect(() => {
    if (!active) return undefined;

    const setProgressIfChanged = (next) => {
      setProgress((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };

    const hasDeadline = deadline > 0;
    let startAt = Date.now();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (hasDeadline) {
        const remain = Math.max(0, deadline - Date.now());
        const next = Math.min(((duration - remain) / duration) * 100, 100);
        setProgressIfChanged(next);
        return;
      }
      const elapsed = Date.now() - startAt;
      const next = Math.min((elapsed / duration) * 100, 100);
      if (next >= 100) {
        startAt = Date.now();
        setProgressIfChanged(0);
        return;
      }
      setProgressIfChanged(next);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, duration, resetKey, deadline]);

  const clamped = useMemo(
    () => Math.max(0, Math.min(100, Number(active ? progress : 0))),
    [active, progress]
  );

  if (variant === "bar") {
    return (
      <div
        style={{
          width: `${barWidth}px`,
          height: `${barHeight}px`,
          border: barBorder,
          borderRadius: "10px",
          overflow: "hidden",
          background: barBackground,
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: color,
            transition: "width 0.25s linear",
            ...(barFillStyle || {}),
          }}
        />
      </div>
    );
  }

  const circumference = 2 * Math.PI * circleRadius;
  return (
    <svg
      style={circleStyle || { position: "absolute", left: -1, zIndex: 1, pointerEvents: "none" }}
      width={circleSize}
      height={circleSize + 1}
    >
      <circle
        cx={circleRadius + 2}
        cy={circleRadius + 2}
        r={circleRadius}
        stroke={color}
        strokeWidth={circleStrokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        style={{ transition: "stroke-dashoffset 0.5s linear" }}
      />
    </svg>
  );
}
