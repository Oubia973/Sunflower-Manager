import React, { useEffect, useMemo, useState } from "react";
import { useAppCtx } from "../context/AppCtx";
import { frmtNb } from "../fct.js";
import { fetchJson } from "../services/apiClient.js";
import {
  imgadmin, imgbee, imgcheer, imgcoins, imgfloatingIsland, imggem, imggoldOre, imggoldSmall, imgironOre, imgironSmall, imgkeyluxury, imgkeyrare, imgkeytreasure, imglovecharm, imgmark, imgna, imgpotionticket, imgsfl,
  imgl2GoldRock, imgl2IronRock, imgl2StoneRock, imgl3GoldRock, imgl3IronRock,
  imgl3StoneRock, imgstoneRes, imgsummerBasicAncientTree,
  imgsummerBasicSacredTree, imgstone, imgwood, imgwoodRes, imgflowerbed, imgoil,
  imgchkn, imgcow, imgsheep, imgpet,
} from "../constants/images.js";
import "./Supply.css";
import SupplyNodeExplorer from "./SupplyNodeExplorer.jsx";

const BIOME_META = {
  basic: { label: "Basic", color: "#84c769" },
  spring: { label: "Spring", color: "#eb8cb5" },
  desert: { label: "Desert", color: "#e7b45c" },
  volcano: { label: "Volcano", color: "#e36a57" },
};

const NODE_ICONS = { tree: imgwoodRes, stone: imgstoneRes, iron: imgironOre, gold: imggoldOre };
const NODE_CATEGORY_ICONS = { ...NODE_ICONS, beehive: imgbee, flowerBed: imgflowerbed, oil: imgoil };
const ANIMAL_ICONS = { Chicken: imgchkn, Cow: imgcow, Sheep: imgsheep };
const NODE_TIER_ICONS = {
  tree: { t1: imgwood, t2: imgsummerBasicAncientTree, t3: imgsummerBasicSacredTree },
  stone: { t1: imgstone, t2: imgl2StoneRock, t3: imgl3StoneRock },
  iron: { t1: imgironSmall, t2: imgl2IronRock, t3: imgl3IronRock },
  gold: { t1: imggoldSmall, t2: imgl2GoldRock, t3: imgl3GoldRock },
};

function displayNumber(value, digits = 0) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? frmtNb(number, digits) : "0";
}

function totalValues(source) {
  return Object.values(source || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
}

function getNodeLabel(name) {
  return String(name).startsWith("animal:") ? String(name).slice("animal:".length) : name;
}

function getNodeIcon(name) {
  if (String(name).startsWith("animal:")) return ANIMAL_ICONS[getNodeLabel(name)] || imgpet;
  return NODE_CATEGORY_ICONS[name] || imgna;
}

function StatCard({ icon, label, value, detail }) {
  return (
    <div className="supply-stat-card">
      <img src={icon} alt="" className="supply-stat-icon" />
      <div><small>{label}</small><strong>{value}</strong>{detail ? <span>{detail}</span> : null}</div>
    </div>
  );
}

const CURRENCY_META = [
  ["Coins", imgcoins], ["Gem", imggem], ["Prize Ticket", imgpotionticket], ["Mark", imgmark],
  ["Love Charm", imglovecharm], ["Cheer", imgcheer], ["Potion Ticket", imgpotionticket],
  ["Treasure Key", imgkeytreasure], ["Rare Key", imgkeyrare], ["Luxury Key", imgkeyluxury],
];

function BiomeCard({ biome, values }) {
  const total = Number(values?.total || 0);
  const inactive = Number(values?.inactive || 0);
  const banned = Number(values?.banned || 0);
  const active = Math.max(0, total - inactive - banned);
  const meta = BIOME_META[biome] || { label: biome, color: "#b7b7b7" };
  const percent = (value) => total > 0 ? `${Math.max(0, value / total * 100)}%` : "0%";
  return (
    <article className="supply-biome-card" style={{ "--supply-biome": meta.color }}>
      <div className="supply-biome-heading"><strong>{meta.label}</strong><b>{displayNumber(total)}</b></div>
      <div className="supply-progress" aria-label={`${meta.label} farm status`}>
        <span className="supply-status-active" style={{ width: percent(active) }} /><span className="supply-status-inactive" style={{ width: percent(inactive) }} /><span className="supply-status-banned" style={{ width: percent(banned) }} />
      </div>
      <div className="supply-biome-legend"><span><i className="supply-status-active" />Active {displayNumber(active)}</span><span><i className="supply-status-inactive" />Inactive {displayNumber(inactive)}</span><span><i className="supply-status-banned" />Banned {displayNumber(banned)}</span></div>
      <div className="supply-biome-recent"><span><b>{displayNumber(values?.["7d"])}</b> active in 7 days</span><span><b>{displayNumber(values?.["30d"])}</b> active in 30 days</span></div>
    </article>
  );
}

export default function SupplyTable() {
  const { data: { dataSetFarm }, ui: { selectedInv }, config: { API_URL } } = useAppCtx();
  const [snapshot, setSnapshot] = useState(null);
  const [state, setState] = useState("idle");
  const [farmDistributionOpen, setFarmDistributionOpen] = useState(true);
  const isAboFarm = !!dataSetFarm?.isabo;

  useEffect(() => {
    if (selectedInv !== "supply" || !isAboFarm) return undefined;
    let cancelled = false;
    async function loadSupply() {
      setState("loading");
      try {
        const result = await fetchJson(API_URL, "/getfarmsrank", { method: "GET" });
        if (!cancelled) { setSnapshot(result && typeof result === "object" ? result : {}); setState("ready"); }
      } catch {
        if (!cancelled) setState("error");
      }
    }
    loadSupply();
    return () => { cancelled = true; };
  }, [selectedInv, isAboFarm, API_URL]);

  const farmSupply = useMemo(() => snapshot?.farmSupply || {}, [snapshot]);
  if (selectedInv !== "supply") return null;
  if (!isAboFarm) return <div className="supply-access-message">Supply is available for ABO farms only.</div>;
  if (state === "loading" || state === "idle") return <div className="supply-access-message">Loading supply snapshot...</div>;
  if (state === "error") return <div className="supply-access-message">Supply snapshot is unavailable. Please try again shortly.</div>;

  const nodeTotal = Number(snapshot?.nodeTotals?.total) || totalValues(Object.values(snapshot?.nodes || {}).map(totalValues));
  const nodeTotalsByIsland = snapshot?.nodeTotalsByIsland || {};
  const nodesPlacedByIsland = snapshot?.nodesPlacedByIsland || {};
  const currencyTotals = snapshot?.currencyTotals || {};
  const sunflowerVipFarms = snapshot?.sunflowerVipFarms || {};
  return (
    <div className="supply-page">
      <section className="supply-section supply-collapsible"><button type="button" className="supply-collapsible-toggle" aria-expanded={farmDistributionOpen} onClick={() => setFarmDistributionOpen((open) => !open)}><span>Farm distribution</span><b>{farmDistributionOpen ? "▴" : "▾"}</b></button>{farmDistributionOpen ? <div className="supply-biome-grid">{Object.entries(farmSupply).map(([biome, values]) => <BiomeCard key={biome} biome={biome} values={values} />)}</div> : null}</section>
      {snapshot?.nodeAnalytics ? <SupplyNodeExplorer analytics={snapshot.nodeAnalytics} expansionSupply={snapshot.expansionSupply} currencyAnalytics={snapshot.currencyAnalytics} /> : <><section className="supply-group supply-nodes"><header><img src={imgstoneRes} alt="" /><strong>Nodes</strong><span>{displayNumber(nodeTotal)}</span></header><div className="supply-node-grid">{Object.entries(snapshot?.nodes || {}).map(([name, tiers]) => <div className="supply-node" key={name}><img src={getNodeIcon(name)} alt="" /><div><strong>{getNodeLabel(name)}</strong><span className="supply-node-tiers">{Object.entries(tiers || {}).filter(([tier, value]) => tier === "t1" || Number(value) > 0).map(([tier, value]) => <span className="supply-node-tier" key={tier}><img src={NODE_TIER_ICONS[name]?.[tier] || getNodeIcon(name)} alt="" title={`${getNodeLabel(name)} ${tier.toUpperCase()}`} /><span className="supply-node-tier-label">{tier.toUpperCase()}</span><b>{displayNumber(value)}</b></span>)}</span></div><b>{displayNumber(totalValues(tiers))}</b></div>)}</div></section>{Object.keys(nodeTotalsByIsland).length > 0 ? <section className="supply-section"><div className="supply-section-title"><img src={imgfloatingIsland} alt="" /><div><h3>Nodes by island</h3><p>Total placed nodes across each farm type</p></div></div><div className="supply-island-totals">{Object.entries(nodeTotalsByIsland).sort(([a], [b]) => a.localeCompare(b)).map(([island, total]) => <div key={island}><span>{island}</span><b>{displayNumber(total)}</b></div>)}</div></section> : null}{Object.keys(nodesPlacedByIsland).length > 0 ? <section className="supply-section"><div className="supply-section-title"><img src={imgfloatingIsland} alt="" /><div><h3>Nodes placed</h3><p>Farms grouped by their number of placed nodes</p></div></div><div className="supply-placement-grid">{Object.entries(nodesPlacedByIsland).sort(([a], [b]) => a.localeCompare(b)).map(([island, distribution]) => <div className="supply-placement-card" key={island}><strong>{island}</strong><table><thead><tr><th>Nodes</th><th>Farms</th></tr></thead><tbody>{Object.entries(distribution || {}).sort(([a], [b]) => Number(a) - Number(b)).map(([count, farms]) => <tr key={count}><td>{count} nodes</td><td>{displayNumber(farms)}</td></tr>)}</tbody></table></div>)}</div></section> : null}</>}
    </div>
  );
}
