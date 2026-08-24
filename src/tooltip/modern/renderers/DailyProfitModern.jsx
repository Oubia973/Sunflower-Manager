import React from "react";
import { ColorValue, frmtNb } from "../../../fct.js";
import { imgcoins, imggem, imgna, imgsfl } from "../../../constants/images.js";

function Token({ src, label }) {
  return <img className="modern-tooltip__token" src={src || imgna} alt={label} title={label} />;
}

function Value({ children }) {
  return <span className="modern-tooltip__value">{children}</span>;
}

function Row({ label, children }) {
  if (children === null || children === undefined || children === false) return null;
  return <div className="modern-tooltip__row"><span>{label}</span><Value>{children}</Value></div>;
}

function Section({ title, children }) {
  return <section className="modern-tooltip__section"><h3>{title}</h3>{children}</section>;
}

function Stat({ label, children }) {
  if (children === null || children === undefined || children === "") return null;
  return <div className="modern-tooltip__stat"><span>{label}</span><strong>{children}</strong></div>;
}

function Flower({ value }) {
  return <>{frmtNb(value)} <Token src={imgsfl} label="Flower" /></>;
}

function Coins({ value }) {
  return <>{frmtNb(value)} <Token src={imgcoins} label="Coins" /></>;
}

function Components({ items = [] }) {
  return items.map((component, index) => <React.Fragment key={`${component.name || "component"}-${index}`}>
    {index > 0 ? " · " : ""}{frmtNb(component.quantity)} <Token src={component.image} label={component.name || "Component"} />
  </React.Fragment>);
}

function ProductionRows({ contract }) {
  const production = contract.production || {};
  const animal = contract.animal;

  if (animal) return <>
    <Row label={`${animal.food || "Food"} used`}>{frmtNb(animal.quantity)} <Token src={animal.foodImage} label={animal.food || "Food"} /></Row>
    <Row label="Food cost"><Coins value={animal.costCoins} /> · <Flower value={animal.costFlower} /></Row>
    <Row label="Animal">{animal.name} · level {frmtNb(animal.level)}</Row>
  </>;

  if (production.kind === "crop" || production.kind === "seed") return <>
    <Row label="Seeds">{frmtNb(production.seedQuantity)} · <Coins value={production.seedCostCoins} /></Row>
    {Number(production.oilQuantity) > 0 ? <Row label="Oil">{frmtNb(production.oilQuantity)} <Token src={production.oilImage} label="Oil" /> · <Coins value={production.oilCostCoins} /></Row> : null}
    <Row label="Total production cost"><Flower value={contract.productionCostFlower} /></Row>
  </>;

  if (production.kind === "fruit") return <>
    <Row label="Harvests per tree">{frmtNb(production.harvestCount)}</Row>
    <Row label="Seeds per orchard renewal">{frmtNb(production.seedQuantity)} · <Coins value={production.seedCostCoins} /> · <Flower value={production.seedCostFlower} /></Row>
    {!production.toolFree ? <Row label={`${production.toolName || "Tool"} per renewal`}>{frmtNb(production.toolQuantity)} <Token src={production.toolImage} label={production.toolName || "Tool"} /> · <Coins value={production.toolCostCoins} /> · <Flower value={production.toolCostFlower} /></Row> : null}
    <Row label="Orchard renewals/day">{frmtNb(production.dailyAverageCycles)}</Row>
    <Row label="Allocated daily cost"><Coins value={contract.productionCostCoins} /> · <Flower value={contract.productionCostFlower} /></Row>
  </>;

  if (production.kind === "tool") return <>
    <Row label={production.toolName || "Tools"}>{frmtNb(production.quantity)} <Token src={production.toolImage} label={production.toolName || "Tool"} /> · <Coins value={production.costCoins} /></Row>
    {(production.components || []).length ? <Row label="Components"><Components items={production.components} /></Row> : null}
    <Row label="Total production cost"><Flower value={contract.productionCostFlower} /></Row>
  </>;

  if (production.kind === "components") return <>
    <Row label="Components"><Components items={production.components} /></Row>
    <Row label="Total production cost"><Flower value={contract.productionCostFlower} /></Row>
  </>;

  if (production.kind === "free") return null;
  return <>
    {Number(contract.productionCostCoins) > 0 ? <Row label="Production cost"><Coins value={contract.productionCostCoins} /></Row> : null}
    <Row label="Cost in Flower"><Flower value={contract.productionCostFlower} /></Row>
  </>;
}

export default function DailyProfitModern({ contract }) {
  const profitMultiplier = contract.profitMultiplier === null ? Infinity : Number(contract.profitMultiplier);
  const profitPercent = contract.profitPercent === null ? "∞" : frmtNb(contract.profitPercent);
  const positive = Number(contract.profitFlower) >= 0;
  const resourceBurn = contract.resourceBurn;
  const supplement = contract.harvestSupplement;
  const saleLimit = contract.marketSaleLimit;

  if (contract.isPurchased) return <Section title="Purchase"><Row label="Marketplace cost"><Flower value={contract.purchaseFlower} /></Row></Section>;

  return <>
    <div className={`modern-tooltip__summary ${positive ? "is-positive" : "is-negative"}`}>
      <span>Estimated daily profit</span>
      <strong>{positive ? "+" : ""}<Flower value={contract.profitFlower} /></strong>
      <small style={{ color: ColorValue(profitMultiplier) }}>{profitPercent}% return</small>
    </div>

    <Section title="Production">
      <div className="modern-tooltip__stats">
        <Stat label="Grow time">{contract.growTime}</Stat>
        <Stat label="Harvests/day">{frmtNb(contract.cycles)}</Stat>
        <Stat label="Farm time">{frmtNb(contract.inputFarmHours)} h</Stat>
        <Stat label="Restocks">{frmtNb(contract.restocks)}</Stat>
      </div>
      {contract.stockLabel ? <Row label={contract.stockLabel}>{frmtNb(contract.stock)}</Row> : null}
      {contract.harvestTimeDaily ? <Row label="Daily harvest time">{contract.harvestTimeDaily}</Row> : null}
      <Row label="Average harvest">{frmtNb(contract.harvestAverage)} <Token src={contract.itemImage} label={contract.item || "Harvested item"} />{(contract.nodes || []).map((node, index) => <React.Fragment key={`${node.image || "node"}-${index}`}>{" · "}{frmtNb(node.quantity)} <Token src={node.image} label="Node" /></React.Fragment>)}</Row>
      {resourceBurn ? <div className="modern-tooltip__calculation" aria-label="Harvest after resources burned by tools">
        <span><small>Before tools</small>{frmtNb(resourceBurn.harvestBeforeTools)}</span>
        <b>−</b>
        <span><small>Burned by tools</small>{frmtNb(resourceBurn.burnedByTools)}</span>
        <b>=</b>
        <span className="is-result"><small>After tools</small>{frmtNb(resourceBurn.harvestAfterTools)}</span>
      </div> : <Row label="Daily harvest">{frmtNb(contract.harvestDaily)}</Row>}
      {Number(supplement?.woodQuantity) > 0 ? <Row label="Wood from replaced trees">{frmtNb(supplement.woodQuantity)} <Token src={supplement.woodImage} label="Wood" /></Row> : null}
    </Section>

    <Section title="Production costs">
      <ProductionRows contract={contract} />
      {contract.showRestockCost && Number(contract.restockFlower) > 0 ? <Row label="Restock">{Number(contract.restockGems) > 0 ? <>{frmtNb(contract.restockGems)} <Token src={imggem} label="Gems" /> · </> : null}<Flower value={contract.restockFlower} /></Row> : null}
    </Section>

    <Section title="Marketplace">
      {saleLimit ? <>
        <Row label="Sale limit">{frmtNb(saleLimit.quantityPerWeek)}/week · {frmtNb(saleLimit.averageQuantityPerDay)}/day</Row>
        <Row label="Allocated cost"><Flower value={saleLimit.allocatedCostFlower} /></Row>
      </> : null}
      {supplement ? <>
        <Row label="Fruit sales after tax"><Flower value={supplement.marketFlower} /></Row>
        {Number(supplement.woodFlower) > 0 ? <Row label="Wood sales after tax"><Flower value={supplement.woodFlower} /></Row> : null}
        <Row label="Total daily sales"><Flower value={contract.marketFlower} /></Row>
      </> : <Row label={`Sale after ${frmtNb(contract.tradeTaxPercent)}% tax`}><Flower value={contract.marketFlower} /></Row>}
    </Section>
  </>;
}
