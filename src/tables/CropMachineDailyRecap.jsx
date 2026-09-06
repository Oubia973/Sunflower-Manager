import React, { useEffect, useMemo, useRef, useState } from "react";
import { ColorValue, convTime, frmtNb, getOrCreateDeviceId } from "../fct.js";
import { imgcrops, imggem, imgexchng, imgsfl, imgsunflowerseed, imgstopwatch } from "../constants/images.js";
import { fetchJson } from "../services/apiClient.js";
import { useAppCtx } from "../context/AppCtx.js";
import DList from "../dlist.jsx";

const number = (input) => Number(input || 0);
const value = (input) => frmtNb(number(input));
const signed = (input) => `${number(input) > 0 ? "+" : ""}${value(input)}`;

const recapResponseCache = new Map();

export default function CropMachineDailyRecap({ rows = [], options = {}, oilImage, source, priority: priorityOverride, restocks: restocksOverride, showControls = true }) {
  const { config: { API_URL }, data: { dataSetFarm }, ui: { TryChecked, selectedSeedsCM }, actions: { handleOptionChange } } = useAppCtx();
  const [expanded, setExpanded] = useState(true);
  const [restockPolicy, setRestockPolicy] = useState("0");
  const [priority, setPriority] = useState("table");
  const [manualOrder, setManualOrder] = useState([]);
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  useEffect(() => { if (priorityOverride != null) setPriority(priorityOverride); }, [priorityOverride]);
  useEffect(() => { if (restocksOverride != null) setRestockPolicy(restocksOverride); }, [restocksOverride]);
  const activeNames = rows.filter((row) => row.active && row.available).map((row) => row.name);
  const activePriority = priorityOverride ?? priority;
  const activeRestockPolicy = restocksOverride ?? restockPolicy;
  const packPolicy = selectedSeedsCM === "stock" ? "stock" : "selected";
  const unlimitedRestocks = activeRestockPolicy === "unlimited";
  const restockLimit = unlimitedRestocks ? 0 : Math.max(0, number(activeRestockPolicy));
  const requestBody = useMemo(() => ({
    farmId: String(dataSetFarm?.frmid || options.farmId || ""),
    username: String(options.username || dataSetFarm?.username || ""),
    sourceHash: String(source?._source?.contentHash || ""),
    sourceVersion: [source?._source?.contentHash, dataSetFarm?.tryitRevision, dataSetFarm?.updated].filter((entry) => entry !== undefined && entry !== null && entry !== "").join(":"),
    deviceId: getOrCreateDeviceId(),
    tryMode: !!TryChecked,
    crops: rows.filter((row) => row.active && row.available).map((row) => ({ name: row.name, seeds: number(row.seeds) })),
    packPolicy,
    priority: activePriority,
    manualOrder,
    unlimitedRestocks,
    restockLimit,
    gemsRatio: number(options.gemsRatio),
    countRestockCost: !!options.restockCostDaily,
  }), [dataSetFarm?.frmid, dataSetFarm?.username, dataSetFarm?.tryitRevision, dataSetFarm?.updated, source?._source?.contentHash, options.farmId, options.username, TryChecked, rows, packPolicy, activePriority, manualOrder, unlimitedRestocks, restockLimit, options.gemsRatio, options.restockCostDaily]);
  const requestSignature = JSON.stringify(requestBody);

  useEffect(() => {
    if (!requestBody.farmId || requestBody.crops.length < 1) { setSimulation(null); setLoading(false); return undefined; }
    const requestId = ++requestRef.current;
    const cached = recapResponseCache.get(requestSignature);
    if (cached && Date.now() - cached.savedAt < 60_000) { setSimulation(cached.result); setLoading(false); setError(""); return undefined; }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        let result;
        try {
          result = await fetchJson(API_URL, "/crop-machine/daily-recap", { method: "POST", body: requestBody, signal: controller.signal, timeoutMs: 10000 });
        } catch (requestError) {
          if (requestError?.status !== 409 || !source) throw requestError;
          result = await fetchJson(API_URL, "/crop-machine/daily-recap", { method: "POST", body: { ...requestBody, source }, signal: controller.signal, timeoutMs: 10000 });
        }
        if (requestId !== requestRef.current) return;
        recapResponseCache.set(requestSignature, { result, savedAt: Date.now() });
        if (recapResponseCache.size > 100) recapResponseCache.delete(recapResponseCache.keys().next().value);
        setSimulation(result); setError("");
      } catch (requestError) {
        if (requestId === requestRef.current && requestError?.code !== "REQUEST_CANCELLED") setError("Daily recap unavailable");
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    }, 500);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [API_URL, requestSignature, source]);

  const fallbackQueue = rows.filter((row) => row.active && row.available).map((row) => ({ name: row.name, image: row.crop.img, requestedSeeds: packPolicy === "stock" ? row.stock : row.seeds }));
  const queue = simulation?.queue || fallbackQueue;
  const totals = simulation?.totals || {};
  const traces = simulation?.traces || [];
  const states = simulation?.states || {};
  const durationHours = 24;
  const moveCrop = (name, direction) => setManualOrder((current) => {
    const base = activeNames.reduce((list, cropName) => list.includes(cropName) ? list : [...list, cropName], current.filter((cropName) => activeNames.includes(cropName)));
    const index = base.indexOf(name);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= base.length) return base;
    const next = [...base];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  return <section className={`cm-daily-recap ${expanded ? "is-expanded" : "is-collapsed"}`}>
    <button className="cm-daily-recap__toggle" type="button" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded}>
      <span className="cm-daily-recap__title"><b>{value(durationHours)}h queue simulation</b><small>{loading ? "Updating…" : error || "Selected packs run together in order, then the queue repeats"}</small></span>
      <span className="cm-daily-recap__current"><span className="cm-daily-recap__stack">{queue.slice(0, 5).map((row) => <img key={row.name} src={row.image} alt="" />)}</span><strong>{queue.length} crop{queue.length === 1 ? "" : "s"}</strong><em style={{ color: ColorValue(totals.profit, 0, 10) }}><Unit value={signed(totals.profit)} icon={imgsfl} label="Flower" />/day</em></span>
      <i aria-hidden="true">{expanded ? "−" : "+"}</i>
    </button>
    {expanded ? activeNames.length ? <div className={`cm-daily-recap__body ${loading ? "is-updating" : ""}`}>
      {showControls ? <div className="cm-daily-recap__controls">
        <DList title="Priority" options={[{ value: "table", label: "Table order" }, { value: "profit", label: "Best profit/hour" }, { value: "shortest", label: "Shortest first" }, { value: "manual", label: "Manual order" }]} value={priority} emitEvent={false} onChange={setPriority} height={28} />
        <DList title="Restocks" options={[{ value: "0", label: "None" }, { value: "1", label: "1 restock" }, { value: "2", label: "2 restocks" }, { value: "3", label: "3 restocks" }, { value: "unlimited", label: "Full packs" }]} value={restockPolicy} emitEvent={false} onChange={setRestockPolicy} height={28} />
        <label className="cm-daily-recap__restock-counted"><input type="checkbox" name="restockCostDaily" checked={!!options.restockCostDaily} onChange={handleOptionChange} /><span>Restock counted</span></label>
      </div> : null}
      <div className="cm-daily-recap__queue" aria-label="Machine queue order">
        {queue.map((row, index) => {
          const firstRun = traces.find((trace) => trace.name === row.name);
          const loadedSeeds = simulation ? number(firstRun?.seeds) : number(row.requestedSeeds);
          const isPartial = loadedSeeds + 1e-9 < number(row.requestedSeeds);
          return <React.Fragment key={row.name}>{index ? <i aria-hidden="true">›</i> : null}<span title={isPartial ? `${value(loadedSeeds)} loaded / ${value(row.requestedSeeds)} requested` : `${value(loadedSeeds)} seeds loaded`}><img src={row.image} alt="" /><b>{row.name}</b><small><Unit value={value(loadedSeeds)} icon={imgsunflowerseed} label="Seeds loaded" />{isPartial ? <s>{value(row.requestedSeeds)}</s> : null}</small>{priority === "manual" ? <span className="cm-daily-recap__order"><button type="button" disabled={index === 0} onClick={() => moveCrop(row.name, -1)} aria-label={`Move ${row.name} earlier`}>‹</button><button type="button" disabled={index === queue.length - 1} onClick={() => moveCrop(row.name, 1)} aria-label={`Move ${row.name} later`}>›</button></span> : null}</span></React.Fragment>;
        })}
        {queue.length > 1 ? <i className="is-loop" title="Queue repeats" aria-label="Queue repeats">↻</i> : null}
      </div>
      {simulation ? <><div className="cm-daily-recap__metrics">
        <Metric icon={imgstopwatch} label="Machine time" value={convTime(totals.time)} note={totals.idle > 1e-8 ? `${convTime(totals.idle)} idle (seed limit)` : `Full ${value(durationHours)}h window`} />
        <Metric icon={imgsunflowerseed} label="Restocks needed" value={value(totals.restocks)} note={<><Unit value={value(totals.restockGems)} icon={imggem} label="Gems" /> · <Unit value={value(totals.restockFlower)} icon={imgsfl} label="Flower" /></>} />
        <Metric icon={oilImage} label="Oil" value={value(totals.oil)} note={<Unit value={value(totals.oilCost)} icon={imgsfl} label="Flower" />} />
        <Metric label="Production cost" value={<Unit value={value(totals.cost)} icon={imgsfl} label="Flower" />} note={countedRestockNote(options, totals)} />
        <Metric icon={imgexchng} label="Market" value={<Unit value={value(totals.market)} icon={imgsfl} label="Flower" />} note={`${value(options.tradeTax)}% tax`} />
        <Metric label="Combined profit" value={<Unit value={signed(totals.profit)} icon={imgsfl} label="Flower" />} note={totals.cost > 0 ? `${signed(Math.ceil((totals.market / totals.cost) * 100) - 100)}%` : "—"} tone={ColorValue(totals.profit, 0, 10)} featured />
      </div>
      <div className="cm-daily-recap__breakdown">
        <div className="cm-daily-recap__breakdown-columns"><span><img src={imgcrops} alt="Crop" /></span><span>Time</span><span>Pack</span><span>Harvest</span><span>Cost <img src={imgsfl} alt="Flower" /></span><span>Profit <img src={imgsfl} alt="Flower" /></span></div>
        {queue.map((row) => { const result = states[row.name]; return <div className="cm-daily-recap__crop-result" key={row.name}>
          <span><img src={row.image} alt={row.name} /></span>
          <b>{convTime(result.time)}</b><b>{value(result.runs)}</b><b>{value(result.harvest)}</b><b>{value(result.cost)}</b><b style={{ color: ColorValue(result.profit, 0, 10) }}>{signed(result.profit)}</b>
        </div>; })}
      </div></> : <div className="cm-daily-recap__loading">{error || "Calculating daily recap…"}</div>}
    </div> : <p className="cm-daily-recap__empty">Select at least one crop in the table to build the 24-hour machine queue.</p> : null}
  </section>;
}

function countedRestockNote(options, totals) {
  const base = `${value(totals.seedCost)} seeds · ${value(totals.oilCost)} oil`;
  if (!totals.restocks) return base;
  return options.restockCostDaily ? `${base} · ${value(totals.restockCost)} restock` : `${base} · restock excluded`;
}

function Metric({ icon, label, value: metricValue, note, tone, featured = false }) {
  return <div className={`cm-daily-recap__metric ${featured ? "is-featured" : ""}`}><small>{icon ? <img src={icon} alt="" /> : null}{label}</small><strong style={tone ? { color: tone } : undefined}>{metricValue}</strong>{note ? <span>{note}</span> : null}</div>;
}

function Unit({ value: unitValue, icon, label }) {
  return <span className="cm-daily-recap__unit">{unitValue}<img src={icon} alt={label} title={label} /></span>;
}
