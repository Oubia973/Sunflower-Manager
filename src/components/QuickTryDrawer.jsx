import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAppCtx } from "../context/AppCtx.js";
import { fetchJson } from "../services/apiClient.js";
import { getOrCreateDeviceId, mergeFarmStateDeep, unpackFarmPayloadTables } from "../fct.js";
import { imgna, normalizeServerImagesDeep } from "../constants/images.js";
import {
  buildCanonicalTryitSnapshot,
  buildPackedTryitSnapshot,
  hasTryitPayloadContent,
  isValidTryitConfig,
  syncTryitStateAcrossFarmState,
  writeTryitSnapshot,
} from "../tryitStorage.js";
import { getQuickTryKnownHashes } from "../utils/quickTryHashes.js";
import { collectKnownProjectionHashes } from "../utils/farmState.js";

const TABLE_LABELS = {
  all: "All",
  nft: "Collectibles",
  nftw: "Wearables",
  buildng: "Craft",
  bud: "Buds",
  shrine: "Shrines",
  skill: "Skills",
  skilllgc: "Legacy",
};

const TABLE_ORDER = ["nft", "nftw", "buildng", "bud", "shrine", "skill", "skilllgc"];
const APPLY_DELAY_MS = 650;
const QUICK_TRY_POSITION_KEY = "sunflower-manager:quick-try-position";
const QUICK_TRY_PANEL_POSITION_KEY = "sunflower-manager:quick-try-panel-position";
const QUICK_TRY_PANEL_SIZE_KEY = "sunflower-manager:quick-try-panel-size";
const QUICK_TRY_MARGIN = 9;
const QUICK_TRY_BUTTON_SIZE = 36;
const QUICK_TRY_PANEL_MIN_WIDTH = 230;
const QUICK_TRY_PANEL_MIN_HEIGHT = 180;

function clampQuickTryPosition(position, width = QUICK_TRY_BUTTON_SIZE, height = QUICK_TRY_BUTTON_SIZE) {
  const maxLeft = Math.max(QUICK_TRY_MARGIN, window.innerWidth - width - QUICK_TRY_MARGIN);
  const maxTop = Math.max(QUICK_TRY_MARGIN, window.innerHeight - height - QUICK_TRY_MARGIN);
  return {
    left: Math.min(Math.max(QUICK_TRY_MARGIN, Number(position?.left) || QUICK_TRY_MARGIN), maxLeft),
    top: Math.min(Math.max(QUICK_TRY_MARGIN, Number(position?.top) || QUICK_TRY_MARGIN), maxTop),
  };
}

function clampQuickTryPanelSize(size) {
  const maxWidth = Math.max(QUICK_TRY_PANEL_MIN_WIDTH, Math.min(320, window.innerWidth - 18));
  const maxHeight = Math.max(QUICK_TRY_PANEL_MIN_HEIGHT, Math.min(540, window.innerHeight - 78));
  return {
    width: Math.min(Math.max(QUICK_TRY_PANEL_MIN_WIDTH, Number(size?.width) || QUICK_TRY_PANEL_MIN_WIDTH), maxWidth),
    height: Math.min(Math.max(QUICK_TRY_PANEL_MIN_HEIGHT, Number(size?.height) || QUICK_TRY_PANEL_MIN_HEIGHT), maxHeight),
  };
}

function withTryTables(farmState = {}) {
  const extra = farmState?.tryNftData;
  if (!extra || typeof extra !== "object") return farmState || {};
  return {
    ...(farmState || {}),
    skillUpgrade: extra?.skillUpgrade || farmState?.skillUpgrade || {},
    itables: { ...(farmState?.itables || {}), ...(extra?.itables || {}) },
    boostables: { ...(extra?.boostables || {}), ...(farmState?.boostables || {}) },
  };
}

function getTryValue(tableName, item) {
  if (tableName === "skill") return Number(item?.leveltry ?? item?.level ?? 0);
  return Number(item?.tryit || 0) > 0 ? 1 : 0;
}

function getActiveValue(tableName, item) {
  if (tableName === "skill") return Number(item?.level ?? 0);
  return Number(item?.isactive || 0) > 0 ? 1 : 0;
}

function getQuickTryFallbackImage(entry) {
  const wearableId = String(entry?.item?.id || "").trim();
  if (entry?.tableName === "nftw" && /^\d+$/.test(wearableId)) {
    return `https://sunflower-land.com/play/wearables/images/${wearableId}.png`;
  }
  return imgna;
}

function handleQuickTryImageError(event, entry) {
  const image = event.currentTarget;
  const fallback = getQuickTryFallbackImage(entry);
  if (!image.dataset.quickTryFallback && fallback !== imgna) {
    image.dataset.quickTryFallback = "official";
    image.src = fallback;
    return;
  }
  image.onerror = null;
  image.src = imgna;
}

export default function QuickTryDrawer({
  onOpenFull,
  onEnsureData,
  currentSections = [],
  knownHashes = {},
  knownTableHashes = {},
}) {
  const {
    data: { dataSet, dataSetFarm },
    config: { API_URL, tryitConfig },
    ui: { TryChecked, selectedTrySeason, selectedInv },
    actions: { handleRefreshfTNFT, setUIField },
  } = useAppCtx();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [changedOnly, setChangedOnly] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [position, setPosition] = useState(null);
  const [panelPosition, setPanelPosition] = useState(null);
  const [panelSize, setPanelSize] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // Keep edits visible in this drawer without publishing an incomplete
  // recalculation to the rest of the application.
  const [pendingTryState, setPendingTryState] = useState(null);
  const latestStateRef = useRef(null);
  const applyTimerRef = useRef(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const didDragRef = useRef(false);
  const panelRef = useRef(null);
  const validConfig = isValidTryitConfig(tryitConfig);
  const farmId = String(dataSet?.options?.farmId || dataSetFarm?.frmid || "");
  const hasBoostData = !!withTryTables(dataSetFarm)?.boostables;

  useEffect(() => {
    latestStateRef.current = withTryTables(dataSetFarm);
  }, [dataSetFarm]);

  useEffect(() => () => {
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    abortRef.current?.abort?.();
  }, []);

  useEffect(() => {
    try {
      const savedPosition = JSON.parse(localStorage.getItem(QUICK_TRY_POSITION_KEY));
      if (savedPosition) setPosition(clampQuickTryPosition(savedPosition));
      const savedPanelPosition = JSON.parse(localStorage.getItem(QUICK_TRY_PANEL_POSITION_KEY));
      if (savedPanelPosition) setPanelPosition(savedPanelPosition);
      const savedPanelSize = JSON.parse(localStorage.getItem(QUICK_TRY_PANEL_SIZE_KEY));
      if (savedPanelSize) setPanelSize(clampQuickTryPanelSize(savedPanelSize));
    } catch {
      // A saved position is optional; leave the button at its default location.
    }
  }, []);

  useEffect(() => {
    const keepPositionVisible = () => {
      setPosition((current) => current && clampQuickTryPosition(current));
      setPanelPosition((current) => {
        if (!current || !panelRef.current) return current;
        const rect = panelRef.current.getBoundingClientRect();
        return clampQuickTryPosition(current, rect.width, rect.height);
      });
      setPanelSize((current) => current && clampQuickTryPanelSize(current));
    };
    window.addEventListener("resize", keepPositionVisible);
    return () => window.removeEventListener("resize", keepPositionVisible);
  }, []);

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const keepPanelVisible = () => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      setPanelPosition((current) => {
        if (current) return clampQuickTryPosition(current, rect.width, rect.height);
        const buttonRect = document.querySelector(".quick-try-fab")?.getBoundingClientRect();
        return clampQuickTryPosition(
          { left: buttonRect?.left ?? rect.left, top: buttonRect?.top ?? rect.top },
          rect.width,
          rect.height,
        );
      });
    };
    keepPanelVisible();
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(keepPanelVisible) : null;
    resizeObserver?.observe(panelRef.current);
    window.addEventListener("resize", keepPanelVisible);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", keepPanelVisible);
    };
  }, [open]);

  const entries = useMemo(() => {
    const boosts = withTryTables(pendingTryState || dataSetFarm)?.boostables || {};
    const normalizedQuery = query.trim().toLowerCase();
    return TABLE_ORDER.flatMap((tableName) => Object.entries(boosts?.[tableName] || {}).map(([name, item]) => ({
      tableName,
      name,
      item: item || {},
      tryValue: getTryValue(tableName, item),
      activeValue: getActiveValue(tableName, item),
    })))
      .filter((entry) => tableFilter === "all" || entry.tableName === tableFilter)
      .filter((entry) => !changedOnly || entry.tryValue !== entry.activeValue)
      .filter((entry) => !normalizedQuery || `${entry.name} ${entry.item?.boost || ""}`.toLowerCase().includes(normalizedQuery));
  }, [dataSetFarm, pendingTryState, query, tableFilter, changedOnly]);

  const changedCount = useMemo(() => {
    const boosts = withTryTables(pendingTryState || dataSetFarm)?.boostables || {};
    return TABLE_ORDER.reduce((count, tableName) => count + Object.values(boosts?.[tableName] || {})
      .filter((item) => getTryValue(tableName, item) !== getActiveValue(tableName, item)).length, 0);
  }, [dataSetFarm, pendingTryState]);

  const applyState = async (state, requestId) => {
    const snapshot = buildCanonicalTryitSnapshot(state, tryitConfig) || {};
    if (!hasTryitPayloadContent(snapshot)) return;
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("applying");
    setError("");
    try {
      const baseBody = {
          frmid: farmId,
          deviceId: getOrCreateDeviceId(),
          options: {
            ...(dataSet?.options || {}),
            username: dataSet?.options?.username || state?.username || "",
          },
          username: dataSet?.options?.username || state?.username || "",
          simulatedSeason: selectedTrySeason,
          include: [...new Set(Array.isArray(currentSections) ? currentSections : [])],
          page: selectedInv || "trynft",
          knownHashes: getQuickTryKnownHashes(knownHashes, currentSections),
          knownProjectionHashes: collectKnownProjectionHashes(latestStateRef.current || state),
          knownTableHashes,
      };
      const sendTryRequest = (body) => fetchJson(API_URL, "/settry", {
        method: "POST",
        signal: controller.signal,
        timeoutMs: 30000,
        body: { ...baseBody, ...body },
      });
      const sendSnapshot = async () => {
        const packed = buildPackedTryitSnapshot(state, snapshot, tryitConfig);
        if (!packed) return sendTryRequest({ tryitarrays: snapshot, tryitMode: "snapshot" });
        try {
          return await sendTryRequest({ tryitarrays: {}, tryitpacked: packed, tryitMode: "snapshot" });
        } catch (packedError) {
          if (packedError?.status !== 409 || packedError?.code !== "TRYIT_PACKED_CATALOG_MISMATCH") {
            throw packedError;
          }
          return sendTryRequest({ tryitarrays: snapshot, tryitMode: "snapshot" });
        }
      };
      const payload = await sendSnapshot();
      if (requestId !== requestIdRef.current) return;
      const responseState = withTryTables(normalizeServerImagesDeep(unpackFarmPayloadTables(payload)));
      const latestState = latestStateRef.current || state;
      const merged = syncTryitStateAcrossFarmState(
        mergeFarmStateDeep(latestState, responseState, tryitConfig),
        tryitConfig,
        buildCanonicalTryitSnapshot(latestState, tryitConfig)
      );
      latestStateRef.current = merged;
      setPendingTryState(null);
      if (!TryChecked) setUIField("TryChecked", true);
      handleRefreshfTNFT(dataSet, merged, { persistTrySnapshot: false, markTryitSynced: true });
      setStatus("done");
    } catch (applyError) {
      if (requestId !== requestIdRef.current || applyError?.code === "REQUEST_CANCELLED") return;
      setStatus("error");
      if (applyError?.status === 429) setError("Wait a few seconds");
      else setError(`Recalculation failed${applyError?.status ? ` (${applyError.status})` : ""}`);
    }
  };

  const queueApply = (nextState) => {
    const requestId = ++requestIdRef.current;
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    setStatus("pending");
    applyTimerRef.current = setTimeout(() => {
      applyState(nextState, requestId);
    }, APPLY_DELAY_MS);
  };

  const commitEntry = (entry, nextValue) => {
    if (!validConfig) return;
    const current = JSON.parse(JSON.stringify(latestStateRef.current || withTryTables(dataSetFarm) || {}));
    const table = current?.boostables?.[entry.tableName];
    if (!table?.[entry.name]) return;
    if (entry.tableName === "skill") {
      const maxLevel = Math.max(1, Number(table[entry.name]?.maxLevel || 1));
      const level = Math.max(0, Math.min(maxLevel, Math.floor(Number(nextValue) || 0)));
      table[entry.name] = { ...table[entry.name], leveltry: level, tryit: level };
    } else {
      table[entry.name] = { ...table[entry.name], tryit: Number(nextValue) > 0 ? 1 : 0 };
    }
    const synced = syncTryitStateAcrossFarmState(current, tryitConfig);
    latestStateRef.current = synced;
    setPendingTryState(synced);
    const snapshot = buildCanonicalTryitSnapshot(synced, tryitConfig);
    if (snapshot) writeTryitSnapshot(snapshot, farmId);
    queueApply(synced);
  };

  if (!farmId || !validConfig) return null;

  const statusLabel = status === "pending" ? "Changes…"
    : status === "applying" ? "Applying…"
      : status === "loading" ? "Loading…"
      : status === "done" ? "Up to date"
        : status === "error" ? error : "Auto";

  const handleDragStart = (event, target = "button") => {
    if ((target === "button" && open) || event.button > 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const draggedRect = target === "panel" ? panelRef.current?.getBoundingClientRect() || rect : rect;
    const currentPosition = target === "panel" ? panelPosition : position;
    dragRef.current = {
      target,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: currentPosition?.left ?? draggedRect.left,
      top: currentPosition?.top ?? draggedRect.top,
      draggedRect,
    };
    didDragRef.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleDragMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const moved = Math.abs(event.clientX - drag.startX) > 4 || Math.abs(event.clientY - drag.startY) > 4;
    if (!moved && !didDragRef.current) return;
    didDragRef.current = true;
    setIsDragging(true);
    const deltaX = Math.min(
      Math.max(QUICK_TRY_MARGIN - drag.draggedRect.left, event.clientX - drag.startX),
      window.innerWidth - QUICK_TRY_MARGIN - drag.draggedRect.right,
    );
    const deltaY = Math.min(
      Math.max(QUICK_TRY_MARGIN - drag.draggedRect.top, event.clientY - drag.startY),
      window.innerHeight - QUICK_TRY_MARGIN - drag.draggedRect.bottom,
    );
    const nextPosition = clampQuickTryPosition({
      left: drag.left + deltaX,
      top: drag.top + deltaY,
    }, drag.draggedRect.width, drag.draggedRect.height);
    if (drag.target === "panel") setPanelPosition(nextPosition);
    else setPosition(nextPosition);
  };

  const handleDragEnd = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (didDragRef.current) {
      const setDraggedPosition = drag.target === "panel" ? setPanelPosition : setPosition;
      const storageKey = drag.target === "panel" ? QUICK_TRY_PANEL_POSITION_KEY : QUICK_TRY_POSITION_KEY;
      setDraggedPosition((current) => {
        if (current) localStorage.setItem(storageKey, JSON.stringify(current));
        return current;
      });
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const handleResizeStart = (event) => {
    if (event.button > 0 || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
    };
    setIsResizing(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleResizeMove = (event) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    setPanelSize(clampQuickTryPanelSize({
      width: resize.width + event.clientX - resize.startX,
      height: resize.height + event.clientY - resize.startY,
    }));
  };

  const handleResizeEnd = (event) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    setIsResizing(false);
    setPanelSize((current) => {
      if (current) localStorage.setItem(QUICK_TRY_PANEL_SIZE_KEY, JSON.stringify(current));
      return current;
    });
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <div
      className={`quick-try ${open ? "is-open" : ""}`}
      style={position ? { left: `${position.left}px`, top: `${position.top}px`, right: "auto", bottom: "auto" } : undefined}
    >
      <button
        type="button"
        className={`quick-try-fab ${isDragging ? "is-dragging" : ""}`}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onClick={async () => {
          if (didDragRef.current) {
            didDragRef.current = false;
            return;
          }
          if (open) {
            setOpen(false);
            return;
          }
          setOpen(true);
          if (typeof onEnsureData === "function") {
            setStatus("loading");
            setError("");
            try {
              const loadedState = await onEnsureData();
              latestStateRef.current = withTryTables(loadedState || latestStateRef.current || {});
              setStatus("idle");
            } catch {
              setStatus("error");
              setError("Unable to load boosts");
            }
          }
        }}
        aria-expanded={open}
        aria-controls="quick-try-panel"
        title="Quick Tryset controls"
      >
        <span aria-hidden="true">⚡</span>
        {changedCount > 0 && <span className="quick-try-badge">{changedCount}</span>}
      </button>
      {open && (
        <section
          ref={panelRef}
          id="quick-try-panel"
          className={`quick-try-panel ${isResizing ? "is-resizing" : ""}`}
          style={{
            ...(panelPosition ? { left: `${panelPosition.left}px`, top: `${panelPosition.top}px` } : {}),
            ...(panelSize ? { width: `${panelSize.width}px`, height: `${panelSize.height}px` } : {}),
          }}
          aria-label="Quick Tryset controls"
        >
          <header
            className={`quick-try-header ${isDragging ? "is-dragging" : ""}`}
            onPointerDown={(event) => {
              if (event.target.closest("button")) return;
              handleDragStart(event, "panel");
            }}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <div>
              <strong>Quick Tryset</strong>
              <span className={`quick-try-status is-${status}`}>{statusLabel}</span>
            </div>
            <button type="button" className="quick-try-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </header>
          <div className="quick-try-tools">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              aria-label="Search boosts or skills"
            />
            <select value={tableFilter} onChange={(event) => setTableFilter(event.target.value)} aria-label="Category">
              <option value="all">All</option>
              {TABLE_ORDER.filter((tableName) => withTryTables(dataSetFarm)?.boostables?.[tableName]).map((tableName) => (
                <option key={tableName} value={tableName}>{TABLE_LABELS[tableName]}</option>
              ))}
            </select>
          </div>
          <label className="quick-try-changed-filter" title="Show only changes from the Active set">
            <input type="checkbox" checked={changedOnly} onChange={(event) => setChangedOnly(event.target.checked)} />
            Changed <span>{changedCount}</span>
          </label>
          <div className="quick-try-list">
            {entries.map((entry) => {
              const isSkill = entry.tableName === "skill";
              const currentValue = entry.tryValue;
              return (
                <div className={`quick-try-row ${currentValue !== entry.activeValue ? "is-changed" : ""}`} key={`${entry.tableName}:${entry.name}`}>
                  <img
                    src={entry.item?.img || getQuickTryFallbackImage(entry)}
                    alt=""
                    loading="lazy"
                    onError={(event) => handleQuickTryImageError(event, entry)}
                  />
                  <button type="button" className="quick-try-name" onClick={() => !isSkill && commitEntry(entry, currentValue ? 0 : 1)}>
                    <span>{entry.name}</span>
                    <small>{entry.item?.boost || TABLE_LABELS[entry.tableName]}</small>
                  </button>
                  {isSkill ? (
                    <div className="quick-try-level">
                      <button type="button" onClick={() => commitEntry(entry, currentValue - 1)} disabled={currentValue <= 0}>−</button>
                      <b>{currentValue}</b>
                      <button type="button" onClick={() => commitEntry(entry, currentValue + 1)} disabled={currentValue >= Math.max(1, Number(entry.item?.maxLevel || 1))}>+</button>
                    </div>
                  ) : (
                    <label className="quick-try-switch">
                      <input type="checkbox" checked={currentValue > 0} onChange={(event) => commitEntry(entry, event.target.checked ? 1 : 0)} />
                      <span />
                    </label>
                  )}
                </div>
              );
            })}
            {entries.length === 0 && <p className="quick-try-empty">{hasBoostData ? "No results" : "Loading boosts…"}</p>}
          </div>
          <footer className="quick-try-footer">
            <span>Auto-apply</span>
            <button type="button" onClick={() => { setOpen(false); onOpenFull?.(); }}>Full view</button>
          </footer>
          <div
            className="quick-try-resize-handle"
            role="presentation"
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
          />
        </section>
      )}
    </div>
  );
}
