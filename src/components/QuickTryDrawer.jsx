import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppCtx } from "../context/AppCtx.js";
import { fetchJson } from "../services/apiClient.js";
import { getOrCreateDeviceId, mergeFarmStateDeep, unpackFarmPayloadTables } from "../fct.js";
import {
  buildCanonicalTryitSnapshot,
  hasTryitPayloadContent,
  isValidTryitConfig,
  syncTryitStateAcrossFarmState,
  writeTryitSnapshot,
} from "../tryitStorage.js";

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

export default function QuickTryDrawer({ onOpenFull, onEnsureData, currentSections = [] }) {
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
  const latestStateRef = useRef(null);
  const applyTimerRef = useRef(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
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

  const entries = useMemo(() => {
    const boosts = withTryTables(dataSetFarm)?.boostables || {};
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
  }, [dataSetFarm, query, tableFilter, changedOnly]);

  const changedCount = useMemo(() => {
    const boosts = withTryTables(dataSetFarm)?.boostables || {};
    return TABLE_ORDER.reduce((count, tableName) => count + Object.values(boosts?.[tableName] || {})
      .filter((item) => getTryValue(tableName, item) !== getActiveValue(tableName, item)).length, 0);
  }, [dataSetFarm]);

  const applyState = async (state, requestId) => {
    const snapshot = buildCanonicalTryitSnapshot(state, tryitConfig) || {};
    if (!hasTryitPayloadContent(snapshot)) return;
    abortRef.current?.abort?.();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("applying");
    setError("");
    try {
      const payload = await fetchJson(API_URL, "/settry", {
        method: "POST",
        signal: controller.signal,
        timeoutMs: 30000,
        body: {
          frmid: farmId,
          deviceId: getOrCreateDeviceId(),
          options: {
            ...(dataSet?.options || {}),
            username: dataSet?.options?.username || state?.username || "",
          },
          username: dataSet?.options?.username || state?.username || "",
          simulatedSeason: selectedTrySeason,
          tryitarrays: snapshot,
          tryitMode: "snapshot",
          include: [...new Set([
            "inventory",
            "boosts",
            "trynftpage",
            ...(Array.isArray(currentSections) ? currentSections : []),
          ])],
          page: selectedInv || "trynft",
          knownHashes: state?.sectionHashes || {},
          knownTableHashes: state?.tableHashes || {},
        },
      });
      if (requestId !== requestIdRef.current) return;
      const responseState = withTryTables(unpackFarmPayloadTables(payload));
      const latestState = latestStateRef.current || state;
      const merged = syncTryitStateAcrossFarmState(
        mergeFarmStateDeep(latestState, responseState, tryitConfig),
        tryitConfig,
        buildCanonicalTryitSnapshot(latestState, tryitConfig)
      );
      latestStateRef.current = merged;
      handleRefreshfTNFT(dataSet, merged, { persistTrySnapshot: false });
      setStatus("done");
    } catch (applyError) {
      if (requestId !== requestIdRef.current || applyError?.code === "REQUEST_CANCELLED") return;
      setStatus("error");
      setError(applyError?.status === 429 ? "Wait a few seconds" : "Recalculation failed");
    }
  };

  const queueApply = (nextState) => {
    const requestId = ++requestIdRef.current;
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    setStatus("pending");
    applyTimerRef.current = setTimeout(() => applyState(nextState, requestId), APPLY_DELAY_MS);
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
    const snapshot = buildCanonicalTryitSnapshot(synced, tryitConfig);
    if (snapshot) writeTryitSnapshot(snapshot, farmId);
    handleRefreshfTNFT(dataSet, synced);
    if (!TryChecked) setUIField("TryChecked", true);
    queueApply(synced);
  };

  if (!farmId || !validConfig) return null;

  const visibleEntries = entries.slice(0, 100);
  const statusLabel = status === "pending" ? "Changes…"
    : status === "applying" ? "Applying…"
      : status === "loading" ? "Loading…"
      : status === "done" ? "Up to date"
        : status === "error" ? error : "Auto";

  return (
    <div className={`quick-try ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="quick-try-fab"
        onClick={async () => {
          if (open) {
            setOpen(false);
            return;
          }
          if (!hasBoostData && typeof onEnsureData === "function") {
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
          setOpen(true);
        }}
        aria-expanded={open}
        aria-controls="quick-try-panel"
        title="Quick Tryset controls"
      >
        <span aria-hidden="true">⚡</span>
        {changedCount > 0 && <span className="quick-try-badge">{changedCount}</span>}
      </button>
      {open && (
        <section id="quick-try-panel" className="quick-try-panel" aria-label="Quick Tryset controls">
          <header className="quick-try-header">
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
              {TABLE_ORDER.filter((tableName) => dataSetFarm?.boostables?.[tableName]).map((tableName) => (
                <option key={tableName} value={tableName}>{TABLE_LABELS[tableName]}</option>
              ))}
            </select>
          </div>
          <label className="quick-try-changed-filter" title="Show only changes from the Active set">
            <input type="checkbox" checked={changedOnly} onChange={(event) => setChangedOnly(event.target.checked)} />
            Changed <span>{changedCount}</span>
          </label>
          <div className="quick-try-list">
            {visibleEntries.map((entry) => {
              const isSkill = entry.tableName === "skill";
              const currentValue = entry.tryValue;
              return (
                <div className={`quick-try-row ${currentValue !== entry.activeValue ? "is-changed" : ""}`} key={`${entry.tableName}:${entry.name}`}>
                  <img src={entry.item?.img || ""} alt="" loading="lazy" />
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
            {visibleEntries.length === 0 && <p className="quick-try-empty">{hasBoostData ? "No results" : "Loading boosts…"}</p>}
            {entries.length > visibleEntries.length && <p className="quick-try-empty">Refine your search to see the other {entries.length - visibleEntries.length}.</p>}
          </div>
          <footer className="quick-try-footer">
            <span>Auto-apply</span>
            <button type="button" onClick={() => { setOpen(false); onOpenFull?.(); }}>Full view</button>
          </footer>
        </section>
      )}
    </div>
  );
}
