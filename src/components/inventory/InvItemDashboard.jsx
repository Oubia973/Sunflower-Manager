import React, { useEffect, useRef, useState } from "react";
import { useAppCtx } from "../../context/AppCtx";
import { fetchJson } from "../../services/apiClient.js";
import { frmtNb, timeToDays } from "../../fct.js";
import { selectCurrentProjection } from "../../utils/farmState.js";
import { buildBoostTooltipContract } from "../../tooltip/boostTooltipContract.js";
import { getMondaySeasonMarkers } from "../../utils/graphSeasons.js";
import "./inv-item-dashboard.css";

const PERIODS = { "24h": { days: 1, form: "H", interval: "" }, "7d": { days: 7, form: "H", interval: "12h" }, "31d": { days: 31, form: "D", interval: "" } };
const num = (value) => Number(value) || 0;
const fmt = (value) => Number.isFinite(Number(value)) ? frmtNb(Number(value)) : "—";

function parsePointDate(value) {
  const text = String(value || "");
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}$/.test(text) ? `${text.slice(0, 10)}T${text.slice(11)}:00:00Z` : text;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : null;
}

export function buildMiniGraphPoints(rows, itemId) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => Number(row?.id) === Number(itemId))
    .map((row) => ({ time: parsePointDate(row?.date), price: Number(row?.unit) }))
    .filter((point) => point.time != null && Number.isFinite(point.price) && point.price > 0)
    .sort((a, b) => a.time - b.time);
}

export function MiniPriceGraph({ points, currentSeason = "spring" }) {
  if (points.length < 2) return <div className="inv-item-graph-empty">{points.length ? `One price point: ${fmt(points[0].price)} SFL` : "No price history for this period."}</div>;
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || Math.max(max * .05, 1);
  const start = points[0].time;
  const duration = points[points.length - 1].time - start || 1;
  const amplitude = (max - min) / min * 100;
  const position = (point) => ({ x: 12 + (point.time - start) / duration * 296, y: 130 - (point.price - min) / range * 76 });
  const coords = points.map((point) => { const { x, y } = position(point); return `${x},${y}`; }).join(" ");
  const extrema = min === max ? [{ label: "Min / Max", point: points[0] }] : [
    { label: "Max", point: points.find((point) => point.price === max) },
    { label: "Min", point: points.find((point) => point.price === min) },
  ];
  return <div className="inv-item-graph-plot">
    <svg viewBox="0 0 320 150" role="img" aria-label={`Market price history, ${points.length} points. Min ${fmt(min)} SFL, max ${fmt(max)} SFL, min-to-max difference ${amplitude.toFixed(1)} percent.`}>
      {getMondaySeasonMarkers(start, points[points.length - 1].time, currentSeason).map((marker) => {
        const x = 12 + (marker.time - start) / duration * 296;
        return <g key={marker.time}>
          <title>{`${marker.season} - ${new Date(marker.time).toISOString().slice(0, 10)} Monday 00:00 UTC`}</title>
          <line x1={x} y1="34" x2={x} y2="136" stroke={marker.line} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <image href={marker.icon} x={Math.max(12, Math.min(292, x - 8))} y="32" width="16" height="16" />
        </g>;
      })}
      <text x="160" y="22" textAnchor="middle" className="inv-item-graph-label">Min to max: {amplitude.toFixed(1)}%</text>
      {extrema.map(({ label, point }) => {
        const { y } = position(point);
        return <g key={label}>
          <line x1="12" y1={y} x2="308" y2={y} className="inv-item-graph-grid" strokeDasharray="3 4" />
          <text x="12" y={y - 9} className="inv-item-graph-label">{label} {fmt(point.price)} SFL</text>
        </g>;
      })}
      <polyline points={coords} className="inv-item-graph-line" />
      {extrema.map(({ label, point }) => {
        const { x, y } = position(point);
        return <circle key={label} cx={x} cy={y} r="3.5" className="inv-item-graph-point"><title>{`${label}: ${fmt(point.price)} SFL - ${new Date(point.time).toLocaleString()}`}</title></circle>;
      })}
    </svg>
    <div><span>{new Date(start).toLocaleDateString()}</span><span>{new Date(points[points.length - 1].time).toLocaleDateString()}</span></div>
  </div>;
}

export default function InvItemDashboard({ name, item, onClose }) {
  const {
    data: { dataSet, dataSetFarm },
    config: { API_URL },
    ui: { TryChecked, selectedQuantity, xHrvst, xHrvsttry },
    actions: { handleTooltip, handleTraderClick, handleUIChange },
  } = useAppCtx();
  const [period, setPeriod] = useState("7d");
  const [history, setHistory] = useState({ status: "loading", points: [] });
  const cacheRef = useRef(new Map());
  const closeButtonRef = useRef(null);
  const page = selectCurrentProjection(dataSetFarm, "invData") || {};
  const currentSeason = String(page?.meta?.curSeason || selectCurrentProjection(dataSetFarm, "cookData")?.meta?.curSeason || selectCurrentProjection(dataSetFarm, "tryNftData")?.meta?.curSeason || "spring").toLowerCase();
  const boostIndex = page?.tooltipData?.boostIndex || {};
  const hourlyRoot = page?.tooltipData?.productionCosts?.items?.[name];
  const hourly = hourlyRoot?.[TryChecked ? "try" : "active"]?.hourly;
  const cost = num(TryChecked ? (item.cat === "crop" ? item.pcosttry : item.costtry) : (item.cat === "crop" ? item.pcost : item.cost)) / (num(dataSet?.options?.coinsRatio) || 1);
  const market = num(item.costp2pt);
  const profitRatio = cost > 0 && market > 0 ? (market * (1 - num(dataSet?.options?.tradeTax) / 100) / cost - 1) * 100 : null;
  const daily = num(TryChecked ? item.dailysfltry : item.dailysfl);
  const gain = num(TryChecked ? item.gainhtry : item.gainh);
  const mode = TryChecked ? "try" : "active";
  const openTooltip = (context, payload, event) => handleTooltip(name, context, payload, event);
  const itemId = Number(item.id);

  useEffect(() => {
    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previousFocus?.focus?.(); };
  }, [onClose]);

  useEffect(() => {
    if (!Number.isSafeInteger(itemId) || itemId <= 0) {
      setHistory({ status: "empty", points: [] });
      return undefined;
    }
    const key = `${itemId}|${period}`;
    if (cacheRef.current.has(key)) {
      setHistory({ status: "ready", points: cacheRef.current.get(key) });
      return undefined;
    }
    const controller = new AbortController();
    const config = PERIODS[period];
    const start = new Date(Date.now() - config.days * 86_400_000).toISOString();
    setHistory({ status: "loading", points: [] });
    fetchJson(API_URL, "/getHT", {
      method: "GET",
      headers: {
        xformdate: config.form,
        xinterval: config.interval,
        xgraphdate: start,
        xsource: "Marketplace",
        xitemid: String(itemId),
        frmid: String(dataSet?.options?.farmId || 0),
        username: String(dataSet?.options?.username || ""),
      },
      timeoutMs: 30_000,
      signal: controller.signal,
    }).then((rows) => {
      if (controller.signal.aborted) return;
      const points = buildMiniGraphPoints(rows, itemId);
      cacheRef.current.set(key, points);
      setHistory({ status: "ready", points });
    }).catch(() => {
      if (!controller.signal.aborted) setHistory({ status: "error", points: [] });
    });
    return () => controller.abort();
  }, [API_URL, dataSet?.options?.farmId, dataSet?.options?.username, itemId, period]);

  const maxCycles = num(TryChecked ? (item.dailycycletry ?? item.dailycycle) : item.dailycycle);
  const cycles = num((TryChecked ? xHrvsttry : xHrvst)?.[name] ?? maxCycles);

  return <div className="inv-item-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="inv-item-dashboard" role="dialog" aria-modal="true" aria-label={`${name} details`}>
      <header><div><img src={item.img} alt="" /><h2>{name}</h2></div><button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close item dashboard">×</button></header>
      <section className="inv-item-graph-section" aria-label="Market price history">
        <div className="inv-item-section-head"><h3>Market price</h3><div>{Object.keys(PERIODS).map((key) => <button key={key} type="button" onClick={() => setPeriod(key)} className={period === key ? "is-active" : ""} aria-pressed={period === key}>{key}</button>)}</div></div>
        {history.status === "loading" ? <div className="inv-item-graph-empty">Loading price history…</div> : history.status === "error" ? <div className="inv-item-graph-empty">Price history unavailable.</div> : <MiniPriceGraph points={history.points} currentSeason={currentSeason} />}
        <button type="button" className="inv-item-full-graph" onClick={() => { onClose(); handleTraderClick(); }}>Open full Market graph</button>
      </section>
      <section className="inv-item-metrics" aria-label="Item figures">
        <button type="button" className="tooltipcell" onClick={(event) => openTooltip("costp", cost, event)}><span>Production cost</span><strong>{fmt(cost)} SFL/u</strong></button>
        <button type="button" className="tooltipcell" onClick={(event) => openTooltip("market", { itemQuant: 1, itemPrice: market, CostChecked: false }, event)}><span>Market price</span><strong>{fmt(market)} SFL/u</strong></button>
        <button type="button" className="tooltipcell" onClick={(event) => openTooltip("coef", profitRatio == null ? 0 : Math.ceil(profitRatio), event)}><span>Profit ratio</span><strong className={profitRatio >= 0 ? "is-positive" : "is-negative"}>{profitRatio == null ? "—" : `${profitRatio > 0 ? "+" : ""}${profitRatio.toFixed(1)}%`}</strong></button>
        <button type="button" className="tooltipcell" onClick={(event) => openTooltip("dailysfl", cost, event)}><span>Daily</span><strong className={daily >= 0 ? "is-positive" : "is-negative"}>{fmt(daily)} SFL</strong></button>
        <button type="button" className="tooltipcell" onClick={(event) => openTooltip("gainh", hourly ? { ...hourly, itemName: name, itemImage: hourlyRoot?.shared?.itemImage || item.img } : null, event)}><span>Hourly</span><strong className={gain >= 0 ? "is-positive" : "is-negative"}>{fmt(gain)} SFL</strong></button>
        <button type="button" className="tooltipcell" onClick={(event) => openTooltip("boostdetails", buildBoostTooltipContract(boostIndex, name, item, mode, "yield"), event)}><span>Yield</span><strong>{fmt(TryChecked ? item.myieldtry : item.myield)}</strong></button>
        <button type="button" className="tooltipcell" onClick={(event) => openTooltip("boostdetails", buildBoostTooltipContract(boostIndex, name, item, mode, "timechg"), event)}><span>Time</span><strong>{timeToDays(String((TryChecked ? item.timetry : item.time) || "")) || "—"}</strong></button>
        <button type="button" className="tooltipcell" onClick={(event) => openTooltip("harvest", num(item.tobharvest), event)}><span>Growing</span><strong>{fmt(item.tobharvest)}</strong></button>
      </section>
      {selectedQuantity === "daily" && <section className="inv-item-plan"><label><input type="checkbox" name={`farmit:${name}`} checked={num(item.farmit) === 1} onChange={handleUIChange} /> Include in Daily</label><label>Harvests <input type="number" min="0" max={maxCycles} step="0.1" value={cycles} onChange={(event) => handleUIChange({ target: { name: `${TryChecked ? "xHrvsttry" : "xHrvst"}.${name}`, value: Math.max(0, Math.min(maxCycles, num(event.target.value))) } })} /> / {fmt(maxCycles)}</label></section>}
      <section className="inv-item-plan"><label><input type="checkbox" name={`buyit:${name}`} checked={num(item.buyit) === 1} onChange={handleUIChange} /> Buy this item</label></section>
    </aside>
  </div>;
}
