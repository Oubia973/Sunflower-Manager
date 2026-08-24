import React from "react";
import { frmtNb, Timer } from "../../../fct.js";
import { imgna, imgsfl } from "../../../constants/images.js";

function Icon({ src, label }) {
  return <img className="modern-tooltip__item-icon" src={src || imgna} alt={label || ""} />;
}

function Row({ label, children, accent = false }) {
  return <div className="modern-tooltip__row"><span>{label}</span><span className={`modern-tooltip__value ${accent ? "is-accent" : ""}`}>{children}</span></div>;
}

function Section({ title, children }) {
  return <section className="modern-tooltip__section"><h3>{title}</h3>{children}</section>;
}

const HEADER_HELP = {
  quantity: ["Quantity mode", "Farm shows your inventory · Daily and Restock show production · Custom lets you choose the quantity."],
  cost: ["Production cost", "Per unit shows one item · Per quantity shows the selected total · The checkbox subtracts production costs from totals."],
  withdraw: ["Withdraw", "Estimated quantity currently available to withdraw."],
  coef: ["Profit coefficient", "Selling price divided by production price."],
  diff: ["Market difference", "Percentage difference compared with the marketplace price."],
  time: ["Production time", "Effective production time after boosts. Select an item value to see the boost breakdown."],
  yield: ["Yield", "Amount produced by each node after your boosts."],
  harvest: ["Average harvest", "Average amount across all nodes after your boosts."],
  toharvest: ["Growing", "Total amount currently growing on all nodes of your farm."],
  gainh: ["Hourly gain", "Continuous 24/7 estimate without stock, restock or farm-time limits. Select an item value for details."],
};

function HeaderHelp({ helpKey }) {
  const [title, text] = HEADER_HELP[helpKey] || ["Information", "No additional explanation is available."];
  return <div className="modern-tooltip__notice"><strong>{title}</strong><span>{text}</span></div>;
}

function BoostDetails({ contract }) {
  const kindLabels = {
    timechg: "Production time",
    yieldchg: "Yield change",
    costchg: "Production cost",
    yield: "Yield",
    xp: "Experience",
    petityield: "Yield and perks",
  };
  const rows = Array.isArray(contract.rows) ? contract.rows : [];
  return <>
    {(contract.titleKind === "yield" || contract.titleKind === "petityield") ? <div className="modern-tooltip__stats">
      <div className="modern-tooltip__stat"><span>Total yield</span><strong>{frmtNb(contract.yieldValue)}</strong></div>
      {contract.harvestAverage !== undefined ? <div className="modern-tooltip__stat"><span>Average/node</span><strong>{frmtNb(contract.harvestAverage)}</strong></div> : null}
    </div> : null}
    {contract.titleKind === "xp" ? <Row label="XP">{frmtNb(contract.xpValue)}</Row> : null}
    <Section title={kindLabels[contract.titleKind] || "Active boosts"}>
      {rows.length ? rows.map((row, index) => <div className="modern-tooltip__boost" key={`${row.name}-${index}`}>
        <Icon src={row.image} label={row.name} />
        <span>{row.name}</span>
        <strong>{row.boost}</strong>
      </div>) : <div className="modern-tooltip__empty">No boosts for this item.</div>}
    </Section>
  </>;
}

function GainDetails({ contract }) {
  return <>
    <div className="modern-tooltip__notice is-compact">Continuous 24/7 mode · unlimited restocks</div>
    <div className="modern-tooltip__stats">
      <div className="modern-tooltip__stat"><span>Grow time</span><strong>{contract.growTime}</strong></div>
      <div className="modern-tooltip__stat"><span>Average</span><strong>{frmtNb(contract.harvestAverage)}</strong></div>
      <div className="modern-tooltip__stat"><span>Harvest/hour</span><strong>{frmtNb(contract.harvestPerHour)}</strong></div>
    </div>
    <Row label="Estimated gain/hour" accent>{frmtNb(contract.gainPerHour)} <img className="modern-tooltip__token" src={imgsfl} alt="Flower" /></Row>
  </>;
}

function BuildCraftDetails({ contract }) {
  const rows = Array.isArray(contract.rows) ? contract.rows : [];
  if (!rows.length) return <div className="modern-tooltip__empty">Building production details unavailable.</div>;
  return <Section title="Current production">
    {rows.map((row, index) => <div className="modern-tooltip__boost" key={`${row.name}-${index}`}>
      <Icon src={row.image} label={row.name} />
      <span>{row.showName ? row.name : "Production"}</span>
      <strong>{row.alwaysShowAmount || Number(row.amount) > 1 ? `×${frmtNb(row.amount)}` : ""}{Number(row.readyAt) > 0 ? <> · <Timer timestamp={row.readyAt} /></> : null}</strong>
    </div>)}
  </Section>;
}

function DailyBurnDetails({ contract }) {
  return <>
    <div className="modern-tooltip__stats">
      <div className="modern-tooltip__stat"><span>Cycles/day</span><strong>{frmtNb(contract.dailyCycles)}</strong></div>
      <div className="modern-tooltip__stat"><span>Per harvest</span><strong>{frmtNb(contract.harvest)}</strong></div>
      <div className="modern-tooltip__stat"><span>Total/day</span><strong>{frmtNb(contract.totalHarvested)}</strong></div>
    </div>
    {Number(contract.burn) > 0 ? <Row label="Resources burned">{frmtNb(contract.burn)}</Row> : null}
  </>;
}

export default function InventoryTooltipModern({ context, contract }) {
  if (context === "th") return <HeaderHelp helpKey={contract.key} />;
  if (context === "boostdetails") return <BoostDetails contract={contract} />;
  if (context === "gainh") return <GainDetails contract={contract} />;
  if (context === "buildcraft") return <BuildCraftDetails contract={contract} />;
  if (context === "dailyBurn") return <DailyBurnDetails contract={contract} />;
  return null;
}
