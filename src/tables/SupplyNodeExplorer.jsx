import React, { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { frmtNb } from "../fct.js";
import {
  imgbee, imgchkn, imgcow, imgflowerbed, imgfloatingIsland, imggoldOre,
  imgironOre, imgna, imgoil, imgpet, imgsheep, imgstoneRes, imgsynced, imgwoodRes,
} from "../constants/images.js";

Chart.register(...registerables);

const NODE_META = {
  tree: ["Tree", imgwoodRes, "Resources"], stone: ["Stone", imgstoneRes, "Resources"],
  iron: ["Iron", imgironOre, "Resources"], gold: ["Gold", imggoldOre, "Resources"],
  crimstone: ["Crimstone", imgstoneRes, "Resources"], sunstone: ["Sunstone", imgstoneRes, "Resources"],
  ascensionCrystal: ["Ascension Crystal", imgstoneRes, "Resources"], oil: ["Oil Reserve", imgoil, "Resources"],
  crop: ["Crop", imgflowerbed, "Farming"], fruitPatch: ["Fruit Patch", imgflowerbed, "Farming"],
  flowerBed: ["Flower Bed", imgflowerbed, "Farming"], beehive: ["Beehive", imgbee, "Farming"],
};
const ANIMAL_ICONS = { Chicken: imgchkn, Cow: imgcow, Sheep: imgsheep };
const BIOME_ICONS = { basic: "/icon/biome/petal.webp", spring: "/icon/biome/spring.webp", desert: "/icon/biome/desert.webp", swamp: "/icon/biome/swamp.webp", volcano: "/icon/biome/volcano.webp", spooky: "/icon/biome/spooky.webp", crystal: "/icon/biome/crystal.webp", galaxy: "/icon/biome/galaxy.webp", marble: "/icon/biome/marble.webp" };
const ACTIVITY_OPTIONS = [{ key: "all", label: "All", detail: "All farms" }, { key: "active1d", label: "1d", detail: "Active 1 day" }, { key: "active7d", label: "7d", detail: "Active 7 days" }, { key: "active90d", label: "90d", detail: "Active 90 days" }];
const CHART_COLORS = ["#e4b653", "#77bf87", "#df7d62", "#7da7dc", "#d07ba7", "#a88bd4", "#67b8b0", "#c99562", "#9bbd60", "#d46767", "#6f8fc1", "#b07b57"];

function number(value, digits = 0) {
  const safe = Number(value || 0);
  return Number.isFinite(safe) ? frmtNb(safe, digits) : "0";
}

function nodeMeta(key) {
  if (String(key).startsWith("animal:")) {
    const type = String(key).slice(7);
    return [type, ANIMAL_ICONS[type] || imgpet, "Animals"];
  }
  return NODE_META[key] || [key, imgna, "Other"];
}

function islandIcon(island) {
  return BIOME_ICONS[island] || imgfloatingIsland;
}

function toggleChoice(current, value) {
  if (value === "all") return ["all"];
  const withoutAll = current.filter((item) => item !== "all");
  const next = withoutAll.includes(value) ? withoutAll.filter((item) => item !== value) : [...withoutAll, value];
  return next.length > 0 ? next : ["all"];
}

function createScope() {
  return { farms: 0, nodeTotal: 0, nodes: {} };
}

function mergeScopes(scopes) {
  const target = createScope();
  scopes.filter(Boolean).forEach((scope) => {
    target.farms += Number(scope?.farms || 0);
    target.nodeTotal += Number(scope?.nodeTotal || 0);
    Object.entries(scope?.nodes || {}).forEach(([key, item]) => {
      if (!target.nodes[key]) target.nodes[key] = { farms: 0, total: 0, tiers: { t1: 0, t2: 0, t3: 0 }, tierFarms: { t1: 0, t2: 0, t3: 0 }, distribution: {}, tierDistributions: { t1: {}, t2: {}, t3: {} } };
      const node = target.nodes[key];
      node.farms += Number(item?.farms || 0);
      node.total += Number(item?.total || 0);
      ["t1", "t2", "t3"].forEach((tier) => {
        node.tiers[tier] += Number(item?.tiers?.[tier] || 0);
        node.tierFarms[tier] += Number(item?.tierFarms?.[tier] || 0);
        Object.entries(item?.tierDistributions?.[tier] || {}).forEach(([count, farms]) => { node.tierDistributions[tier][count] = Number(node.tierDistributions[tier][count] || 0) + Number(farms || 0); });
      });
      Object.entries(item?.distribution || {}).forEach(([count, farms]) => { node.distribution[count] = Number(node.distribution[count] || 0) + Number(farms || 0); });
    });
  });
  return target;
}

function activityAnalytics(analytics, activity) {
  return activity === "all" ? analytics : analytics?.[activity];
}

function selectedScope(analytics, activity, islands) {
  const dimension = activityAnalytics(analytics, activity);
  if (islands.includes("all")) return dimension?.global || createScope();
  return mergeScopes(islands.map((island) => dimension?.byIsland?.[island]));
}

function nodeTotals(scope, nodes) {
  const keys = nodes.includes("all") ? Object.keys(scope?.nodes || {}) : nodes;
  return keys.reduce((sum, key) => sum + Number(scope?.nodes?.[key]?.total || 0), 0);
}

function tierTotals(scope, nodes) {
  const keys = nodes.includes("all") ? Object.keys(scope?.nodes || {}) : nodes;
  return Object.fromEntries(["t1", "t2", "t3"].map((tier) => [tier, keys.reduce((sum, key) => sum + Number(scope?.nodes?.[key]?.tiers?.[tier] || 0), 0)]));
}

function ExplorerChart({ groups, type }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return undefined;
    chartRef.current?.destroy();
    const circular = type === "doughnut" || type === "polarArea";
    chartRef.current = new Chart(canvasRef.current, {
      type,
      data: { labels: groups.map((group) => group.label), datasets: [{ data: groups.map((group) => group.value), backgroundColor: groups.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]), borderColor: circular ? "#211713" : groups.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]), borderWidth: circular ? 2 : 1, borderRadius: type === "bar" ? 4 : 0 }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: type === "bar" ? "y" : "x", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.label}: ${number(context.raw)}` } } }, scales: circular ? {} : { x: { beginAtZero: true, ticks: { color: "rgba(255,255,255,.55)", font: { size: 9 } }, grid: { color: "rgba(255,255,255,.06)" } }, y: { ticks: { color: "rgba(255,255,255,.72)", font: { size: 10 } }, grid: { display: false } } } },
    });
    return () => chartRef.current?.destroy();
  }, [groups, type]);
  return <div className="supply-chart-canvas"><canvas ref={canvasRef} /></div>;
}

function ChoiceGroup({ title, options, selected, onChange, compact = false }) {
  return <div className={`supply-choice-group${compact ? " compact" : ""}`}><strong>{title}</strong><div>{options.map((option) => <button type="button" key={option.key} className={selected.includes(option.key) ? "active" : ""} onClick={() => onChange(toggleChoice(selected, option.key))}>{option.icon ? <img src={option.icon} alt="" /> : null}<span>{option.label}</span>{option.detail ? <small>{option.detail}</small> : null}</button>)}</div></div>;
}

function ChartPanel({ groups, chartType, setChartType }) {
  const total = groups.reduce((sum, group) => sum + group.value, 0);
  return <div className="supply-chart-panel"><div className="supply-chart-types"><button type="button" className={chartType === "bar" ? "active" : ""} onClick={() => setChartType("bar")}>Bars</button><button type="button" className={chartType === "doughnut" ? "active" : ""} onClick={() => setChartType("doughnut")}>Donut</button><button type="button" className={chartType === "polarArea" ? "active" : ""} onClick={() => setChartType("polarArea")}>Polar</button></div><ExplorerChart groups={groups} type={chartType} /><div className="supply-chart-legend">{groups.map((group, index) => <div key={group.key}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} /><img src={group.icon || imgna} alt="" /><span>{group.label}</span><b>{number(group.value)} <small>{total > 0 ? `${(group.value / total * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : "0%"}</small></b></div>)}</div></div>;
}

function NodesView({ analytics, islands, islandSelection, activitySelection }) {
  const allNodes = useMemo(() => Object.keys(analytics?.global?.nodes || {}).sort((a, b) => nodeMeta(a)[0].localeCompare(nodeMeta(b)[0])), [analytics]);
  const [nodeSelection, setNodeSelection] = useState(["all"]);
  const [compareBy, setCompareBy] = useState("node");
  const [view, setView] = useState("table");
  const [chartType, setChartType] = useState("bar");
  const nodeKeys = nodeSelection.includes("all") ? allNodes : nodeSelection;
  const islandKeys = islandSelection.includes("all") ? islands : islandSelection;
  const groups = [];
  if (compareBy === "node") {
    activitySelection.forEach((activity) => {
      const scope = selectedScope(analytics, activity, islandSelection);
      nodeKeys.forEach((node) => groups.push({ key: `${activity}:${node}`, label: `${nodeMeta(node)[0]}${activitySelection.length > 1 ? ` · ${ACTIVITY_OPTIONS.find((item) => item.key === activity)?.label}` : ""}`, icon: nodeMeta(node)[1], value: Number(scope?.nodes?.[node]?.total || 0), farms: Number(scope?.nodes?.[node]?.farms || 0), tiers: scope?.nodes?.[node]?.tiers || {} }));
    });
  } else if (compareBy === "island") {
    activitySelection.forEach((activity) => islandKeys.forEach((island) => { const scope = activityAnalytics(analytics, activity)?.byIsland?.[island] || createScope(); groups.push({ key: `${activity}:${island}`, label: `${island}${activitySelection.length > 1 ? ` · ${ACTIVITY_OPTIONS.find((item) => item.key === activity)?.label}` : ""}`, icon: islandIcon(island), value: nodeTotals(scope, nodeSelection), farms: scope.farms, tiers: tierTotals(scope, nodeSelection) }); }));
  } else {
    activitySelection.forEach((activity) => { const scope = selectedScope(analytics, activity, islandSelection); groups.push({ key: activity, label: ACTIVITY_OPTIONS.find((item) => item.key === activity)?.detail || activity, icon: activity === "all" ? imgfloatingIsland : imgsynced, value: nodeTotals(scope, nodeSelection), farms: scope.farms, tiers: tierTotals(scope, nodeSelection) }); });
  }
  const visibleGroups = groups.filter((group) => group.value > 0);
  const total = visibleGroups.reduce((sum, group) => sum + group.value, 0);
  const baseScope = selectedScope(analytics, activitySelection[0], islandSelection);
  const nodeOptions = [{ key: "all", label: "All nodes", icon: imgstoneRes }, ...allNodes.map((key) => ({ key, label: nodeMeta(key)[0], icon: nodeMeta(key)[1] }))];
  const distributionNode = nodeSelection.length === 1 && nodeSelection[0] !== "all" ? nodeSelection[0] : null;

  return <><ChoiceGroup title="Nodes" options={nodeOptions} selected={nodeSelection} onChange={setNodeSelection} /><div className="supply-explorer-toolbar"><span>Compare by</span>{[{ key: "node", label: "Nodes" }, { key: "island", label: "Islands" }, { key: "activity", label: "Activity" }].map((item) => <button type="button" key={item.key} className={compareBy === item.key ? "active" : ""} onClick={() => setCompareBy(item.key)}>{item.label}</button>)}<i /><button type="button" className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Table</button><button type="button" className={view === "chart" ? "active" : ""} onClick={() => setView("chart")}>Charts</button><button type="button" className={view === "distribution" ? "active" : ""} onClick={() => setView("distribution")}>Distribution</button></div><div className="supply-explorer-summary"><div><span>Selected farms</span><b>{number(baseScope.farms)}</b></div><div><span>Selected nodes</span><b>{number(nodeTotals(baseScope, nodeSelection))}</b></div><div><span>Islands compared</span><b>{islandKeys.length}</b></div><div><span>Average / farm</span><b>{baseScope.farms > 0 ? number(nodeTotals(baseScope, nodeSelection) / baseScope.farms, 2) : "0"}</b></div></div>{view === "chart" ? <ChartPanel groups={visibleGroups} chartType={chartType} setChartType={setChartType} /> : view === "distribution" ? (!distributionNode ? <div className="supply-explorer-empty">Select exactly one node to display its placement distribution.</div> : <div className="supply-distribution-grid">{activitySelection.map((activity) => { const scope = selectedScope(analytics, activity, islandSelection); const rows = Object.entries(scope?.nodes?.[distributionNode]?.distribution || {}).sort(([a], [b]) => Number(a) - Number(b)); return <div className="supply-distribution" key={activity}><h4>{nodeMeta(distributionNode)[0]} · {ACTIVITY_OPTIONS.find((item) => item.key === activity)?.detail}</h4><div className="supply-distribution-head"><span>Placed</span><span>Farms</span><span>% farms</span></div>{rows.map(([count, farms]) => <div key={count}><span>{count} nodes</span><b>{number(farms)}</b><span>{scope.farms > 0 ? `${(Number(farms) / scope.farms * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%` : "0%"}</span></div>)}</div>; })}</div>) : <div className="supply-explorer-table-wrap"><table className="supply-explorer-table"><thead><tr><th>{compareBy}</th><th>Nodes</th><th>Farms</th><th>Share</th></tr></thead><tbody>{visibleGroups.map((group) => { const share = total > 0 ? group.value / total * 100 : 0; return <tr key={group.key}><td><img src={group.icon} alt="" /><span>{group.label}<small>{["t1", "t2", "t3"].filter((tier) => Number(group.tiers?.[tier]) > 0).map((tier) => <i key={tier}>{tier.toUpperCase()} {number(group.tiers[tier])}</i>)}</small></span></td><td>{number(group.value)}</td><td>{number(group.farms)}</td><td><span className="supply-share"><i style={{ width: `${share}%` }} /></span>{share.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</td></tr>; })}</tbody></table></div>}</>;
}

function ExpansionsView({ expansionSupply, islands, islandSelection, activitySelection }) {
  const [view, setView] = useState("heatmap");
  const [chartType, setChartType] = useState("bar");
  const islandKeys = islandSelection.includes("all") ? islands : islandSelection;
  const fieldFor = (activity) => activity === "all" ? "farms" : activity;
  const expansions = [...new Set(islandKeys.flatMap((island) => Object.keys(expansionSupply?.[island] || {})))].sort((a, b) => Number(a) - Number(b));
  const series = activitySelection.flatMap((activity) => islandKeys.map((island) => ({ key: `${activity}:${island}`, island, activity, label: `${island}${activitySelection.length > 1 ? ` · ${ACTIVITY_OPTIONS.find((item) => item.key === activity)?.label}` : ""}`, icon: islandIcon(island) })));
  const groups = series.flatMap((item) => expansions.map((expansion) => ({ key: `${item.key}:${expansion}`, label: `${item.label} · Exp. ${expansion}`, icon: item.icon, value: Number(expansionSupply?.[item.island]?.[expansion]?.[fieldFor(item.activity)] || 0) }))).filter((item) => item.value > 0);
  const max = Math.max(1, ...groups.map((item) => item.value));
  return <><div className="supply-explorer-toolbar"><span>Expansion distribution</span><i /><button type="button" className={view === "heatmap" ? "active" : ""} onClick={() => setView("heatmap")}>Heatmap</button><button type="button" className={view === "table" ? "active" : ""} onClick={() => setView("table")}>Table</button><button type="button" className={view === "chart" ? "active" : ""} onClick={() => setView("chart")}>Charts</button></div>{view === "chart" ? <ChartPanel groups={groups} chartType={chartType} setChartType={setChartType} /> : <div className="supply-expansion-matrix"><table><thead><tr><th>Island / activity</th>{expansions.map((expansion) => <th key={expansion}>Exp. {expansion}</th>)}</tr></thead><tbody>{series.map((item) => { const rowTotal = expansions.reduce((sum, expansion) => sum + Number(expansionSupply?.[item.island]?.[expansion]?.[fieldFor(item.activity)] || 0), 0); return <tr key={item.key}><td><img src={item.icon} alt="" /><span>{item.label}</span></td>{expansions.map((expansion) => { const value = Number(expansionSupply?.[item.island]?.[expansion]?.[fieldFor(item.activity)] || 0); const percent = rowTotal > 0 ? value / rowTotal * 100 : 0; return <td key={expansion} style={view === "heatmap" ? { backgroundColor: `rgba(228,182,83,${Math.max(.03, value / max * .58)})` } : undefined}><b>{number(value)}</b><small>{percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%</small></td>; })}</tr>; })}</tbody></table></div>}</>;
}

export default function SupplyNodeExplorer({ analytics, expansionSupply = {} }) {
  const [mode, setMode] = useState("nodes");
  const [islandSelection, setIslandSelection] = useState(["all"]);
  const [activitySelection, setActivitySelection] = useState(["all"]);
  const islands = useMemo(() => Object.keys(analytics?.byIsland || {}).sort(), [analytics]);
  const islandOptions = [{ key: "all", label: "All islands", icon: imgfloatingIsland }, ...islands.map((key) => ({ key, label: key, icon: islandIcon(key) }))];
  return <section className="supply-section supply-explorer"><div className="supply-section-title supply-explorer-title"><img src={imgfloatingIsland} alt="" /><div><h3>Farms explorer</h3><p>Build comparisons with multiple islands, nodes and activity windows</p></div><div className="supply-mode-switch"><button type="button" className={mode === "nodes" ? "active" : ""} onClick={() => setMode("nodes")}><img src={imgstoneRes} alt="" />Nodes</button><button type="button" className={mode === "expansions" ? "active" : ""} onClick={() => setMode("expansions")}><img src={imgfloatingIsland} alt="" />Expansions</button></div></div><div className="supply-explorer-selections"><ChoiceGroup title="Islands" options={islandOptions} selected={islandSelection} onChange={setIslandSelection} compact /><ChoiceGroup title="Activity" options={ACTIVITY_OPTIONS.map((item) => ({ ...item, icon: item.key === "all" ? imgfloatingIsland : imgsynced }))} selected={activitySelection} onChange={setActivitySelection} compact /></div>{mode === "nodes" ? <NodesView analytics={analytics} islands={islands} islandSelection={islandSelection} activitySelection={activitySelection} /> : <ExpansionsView expansionSupply={expansionSupply} islands={islands} islandSelection={islandSelection} activitySelection={activitySelection} />}</section>;
}
