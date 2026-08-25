import React from "react";
import { ColorValue, frmtNb } from "../../../fct.js";
import { imggem, imgna, imgsfl } from "../../../constants/images.js";

function Token({ src, label }) {
  return <img className="modern-tooltip__token" src={src || imgna} alt={label} title={label} />;
}

function Flower({ value }) {
  return <>{frmtNb(value)} <Token src={imgsfl} label="Flower" /></>;
}

function Row({ label, children, accent = false }) {
  return <div className="modern-tooltip__row"><span>{label}</span><span className={`modern-tooltip__value ${accent ? "is-accent" : ""}`}>{children}</span></div>;
}

function Stat({ label, children }) {
  return <div className="modern-tooltip__stat"><span>{label}</span><strong>{children}</strong></div>;
}

function Section({ title, children }) {
  return <section className="modern-tooltip__section"><h3>{title}</h3>{children}</section>;
}

function CropMachineGainModern({ contract }) {
  const gain = Number(contract.gainPerHour || 0);
  return <>
    <div className={`modern-tooltip__summary ${gain >= 0 ? "is-positive" : "is-negative"}`}>
      <span>Estimated hourly gain</span>
      <strong>{gain > 0 ? "+" : ""}<Flower value={gain} /></strong>
      <small>For the selected pack</small>
    </div>
    <Section title="Pack details">
      <div className="modern-tooltip__stats">
        <Stat label="Grow time">{contract.growTime || "00:00:00"}</Stat>
        <Stat label="Profit/pack"><Flower value={contract.profitPerPack} /></Stat>
      </div>
      <Row label="Production cost"><Flower value={contract.costPerPack} /></Row>
      <Row label="Marketplace value"><Flower value={contract.marketPerPack} /></Row>
      <Row label="Gain/hour" accent><span style={{ color: ColorValue(gain, 0, 10) }}><Flower value={gain} /></span></Row>
    </Section>
  </>;
}

function CropMachineDailyModern({ contract }) {
  const profit = Number(contract.profitPerDay || 0);
  const percent = contract.profitPercent === null ? "∞" : `${frmtNb(contract.profitPercent)}%`;
  const multiplier = contract.profitMultiplier === null ? Infinity : Number(contract.profitMultiplier || 0);
  return <>
    <div className={`modern-tooltip__summary ${profit >= 0 ? "is-positive" : "is-negative"}`}>
      <span>Estimated daily profit</span>
      <strong>{profit > 0 ? "+" : ""}<Flower value={profit} /></strong>
      <small style={{ color: ColorValue(multiplier) }}>{percent} return</small>
    </div>
    <Section title="24h production">
      <div className="modern-tooltip__stats">
        <Stat label="Pack time">{contract.growTime || "00:00:00"}</Stat>
        <Stat label="Full packs/day">{frmtNb(contract.cycles)}</Stat>
        <Stat label="Seeds/pack">{frmtNb(contract.packSeeds)}</Stat>
        <Stat label="Seed stock">{frmtNb(contract.seedStock)}</Stat>
      </div>
      <Row label="Harvest/pack">{frmtNb(contract.harvestPerBatch)} <Token src={contract.itemImage} label="Crop" /></Row>
      <Row label="Harvest/day">{frmtNb(contract.harvestPerDay)} <Token src={contract.itemImage} label="Crop" /></Row>
      <Row label="Seeds/day">{frmtNb(contract.seedsPerDay)} · <Flower value={contract.seedCostPerDay} /></Row>
      <Row label="Oil/day">{frmtNb(contract.oilPerDay)} <Token src={contract.oilImage} label="Oil" /> · <Flower value={contract.oilCostPerDay} /></Row>
      {Number(contract.dailyRestock) > 0 ? <Row label={contract.restockCostEnabled ? "Restock cost" : "Restocks needed"}>{contract.restockCostEnabled ? <>{frmtNb(contract.dailyRestock)} restock{Number(contract.dailyRestock) === 1 ? "" : "s"} · {frmtNb(contract.dailyRestockGems)} <Token src={imggem} label="Gems" /> · <Flower value={contract.dailyRestockSfl} /></> : frmtNb(contract.dailyRestock)}</Row> : null}
    </Section>
    <Section title="Profitability">
      <Row label="Production cost/day"><Flower value={contract.costPerDay} /></Row>
      <Row label={`Marketplace after ${frmtNb(contract.taxPercent)}% tax`}><Flower value={contract.marketPerDay} /></Row>
    </Section>
  </>;
}

export default function CropMachineModern({ context, contract }) {
  return context === "cmgainh"
    ? <CropMachineGainModern contract={contract} />
    : <CropMachineDailyModern contract={contract} />;
}
