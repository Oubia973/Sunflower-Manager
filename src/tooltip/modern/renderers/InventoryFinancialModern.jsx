import React from "react";
import { ColorValue, frmtNb } from "../../../fct.js";
import {
  imgappleTree, imgautumn, imgbeehive, imgchkn, imgcoins, imgcow, imgcrimstoneRock5,
  imgcrop, imgflowerbed, imggoldSmall, imggreenhousePot, imgironSmall, imgl2GoldRock,
  imgl2IronRock, imgl2StoneRock, imgl3GoldRock, imgl3IronRock, imgl3StoneRock,
  imglavaPit, imgmix, imgna, imgoilReserveFull, imgsaltfarm, imgsfl, imgsheep,
  imgspring, imgstone, imgsummer, imgsummerBasicAncientTree, imgsummerBasicSacredTree,
  imgsunstoneRock1, imgwinter, imgwood,
} from "../../../constants/images.js";
import CompositionTree from "../composition/CompositionTree.jsx";

function Icon({ src, label, small = false }) {
  return <img className={small ? "modern-tooltip__token" : "modern-tooltip__item-icon"} src={src || imgna} alt={label || ""} />;
}

function Flower({ value }) {
  return <>{frmtNb(value)} <Icon src={imgsfl} label="Flower" small /></>;
}

function Coins({ value }) {
  return <>{frmtNb(value)} <Icon src={imgcoins} label="Coins" small /></>;
}

function Row({ label, children, tone }) {
  return <div className="modern-tooltip__row"><span>{label}</span><span className={`modern-tooltip__value ${tone ? `is-${tone}` : ""}`}>{children}</span></div>;
}

function Section({ title, children }) {
  return <section className="modern-tooltip__section"><h3>{title}</h3>{children}</section>;
}

function ProfitSummary({ profit, multiplier, percent, showReturn = true }) {
  const positive = Number(profit) >= 0;
  return <div className={`modern-tooltip__summary ${positive ? "is-positive" : "is-negative"}`}>
    <span>Estimated profit</span>
    <strong>{positive ? "+" : ""}<Flower value={profit} /></strong>
    {showReturn ? <small style={{ color: ColorValue(multiplier === null ? Infinity : Number(multiplier || 0)) }}>{multiplier === null ? "∞" : frmtNb(percent)}% return</small> : <small>After tax and selected costs</small>}
  </div>;
}

function Components({ components = [] }) {
  return components.map((component, index) => <React.Fragment key={`${component.name}-${index}`}>
    {index ? <span className="modern-tooltip__component-separator">·</span> : null}
    <span className="modern-tooltip__component-amount">{frmtNb(component.quantity)}<Icon src={component.image} label={component.name} small /></span>
  </React.Fragment>);
}

const SEASON_ICONS = {
  spring: imgspring.props?.src,
  summer: imgsummer.props?.src,
  autumn: imgautumn.props?.src,
  winter: imgwinter.props?.src,
};

function SeasonLabel({ season }) {
  const key = String(season || "").toLowerCase();
  const icon = SEASON_ICONS[key];
  if (!icon) return season;
  return <img className="modern-tooltip__season-icon" src={icon} alt={key} title={key} />;
}

function SeasonCompositionRow({ season }) {
  return <div className="modern-tooltip__season-composition">
    <SeasonLabel season={season.season} />
    <span className="modern-tooltip__season-components"><Components components={season.components} /></span>
    <strong><Flower value={season.totalCostFlower} /></strong>
  </div>;
}

const NODE_ICONS = {
  greenhouse: imggreenhousePot, crop: imgcrop, wood: imgwood, stone: imgstone,
  iron: imgironSmall, gold: imggoldSmall, crimstone: imgcrimstoneRock5,
  sunstone: imgsunstoneRock1, salt: imgsaltfarm, obsidian: imglavaPit,
  oil: imgoilReserveFull, fruit: imgappleTree, honey: imgbeehive,
  flower: imgflowerbed, chicken: imgchkn, cow: imgcow, sheep: imgsheep,
};

const SECONDARY_NODE_ICONS = {
  wood: { secondary: imgsummerBasicAncientTree, tertiary: imgsummerBasicSacredTree },
  stone: { secondary: imgl2StoneRock, tertiary: imgl3StoneRock },
  iron: { secondary: imgl2IronRock, tertiary: imgl3IronRock },
  gold: { secondary: imgl2GoldRock, tertiary: imgl3GoldRock },
};

function NodeSpots({ nodeKind, spots = {} }) {
  const entries = [
    ["primary", spots.primary, NODE_ICONS[nodeKind]],
    ["secondary", spots.secondary, SECONDARY_NODE_ICONS[nodeKind]?.secondary],
    ["tertiary", spots.tertiary, SECONDARY_NODE_ICONS[nodeKind]?.tertiary],
  ].filter(([, quantity]) => Number(quantity) > 0);
  return <span className="modern-tooltip__component-list">{entries.map(([tier, quantity, image], index) => <React.Fragment key={tier}>
    {index ? <span className="modern-tooltip__component-separator">·</span> : null}
    <span className="modern-tooltip__component-amount">{frmtNb(quantity)}<Icon src={image} label={`${tier} node`} small /></span>
  </React.Fragment>)}</span>;
}

function CostInputs({ detail, contract, compositionCatalog }) {
  if (!detail || contract.isFree) return <Row label="Inputs">Free</Row>;
  if (detail.kind === "crop") return <>
    <Row label="Seeds"><Coins value={detail.seedCostCoins} /></Row>
    {Number(detail.oilQuantity) > 0 ? <Row label="Oil">{frmtNb(detail.oilQuantity)} <Icon src={detail.oilImage || contract.oilImage} label="Oil" small /> · <Coins value={detail.oilCostCoins} /></Row> : null}
    <Row label="Input cost"><Flower value={detail.inputCostFlower} /></Row>
  </>;
  if (detail.kind === "animal") return <>
    {(() => {
      const foodName = detail.foodName === "Mix" ? "Mix Food" : (detail.foodName || "Food");
      const foodImage = detail.foodName === "Mix" ? imgmix : detail.foodImage;
      return <>
    <Row label="Animal level">{frmtNb(detail.level)}</Row>
    <Row label={foodName}>{frmtNb(detail.foodQuantity)} <Icon src={foodImage} label={foodName} small /></Row>
    {detail.costTree ? <CompositionTree
      costTree={detail.costTree}
      catalog={compositionCatalog}
      totalCost={detail.foodCostFlower}
      totalMarket={detail.foodMarketFlower}
    /> : <>
      <Row label="Food cost"><Flower value={detail.foodCostFlower} /></Row>
      <Row label="Food market value"><Flower value={detail.foodMarketFlower} /></Row>
    </>}
      </>;
    })()}
  </>;
  if (detail.kind === "tool") return <>
    <Row label={detail.toolName || "Tool"}><Icon src={detail.toolImage} label={detail.toolName} small /></Row>
    <CompositionTree costTree={detail.costTree} catalog={compositionCatalog} />
  </>;
  if (detail.kind === "components") return <>
    <CompositionTree costTree={detail.costTree} catalog={compositionCatalog} />
    {(detail.otherSeasons || []).map((season) => <SeasonCompositionRow key={season.season} season={season} />)}
  </>;
  if (detail.kind === "seed") return <Row label="Seeds"><Flower value={detail.seedCostFlower} /></Row>;
  return null;
}

function HarvestInputs({ detail, contract, compositionCatalog }) {
  if (!detail) return null;
  if (detail.kind === "crop") return <>
    <Row label="Seeds"><Coins value={detail.seedCostCoins} /></Row>
    {Number(detail.oilQuantity) > 0 ? <Row label="Oil">{frmtNb(detail.oilQuantity)} <Icon src={detail.oilImage || contract.oilImage} label="Oil" small /> · <Coins value={detail.oilCostCoins} /></Row> : null}
  </>;
  if (detail.kind === "tool") return <>
    <Row label={detail.toolName || "Tool"}>
      <span className="modern-tooltip__component-amount">{frmtNb(detail.quantity)}<Icon src={detail.toolImage} label={detail.toolName || "Tool"} small /></span> · <Coins value={detail.costCoins} />
    </Row>
    {(detail.components || []).length ? <Row label="Components"><Components components={detail.components} /></Row> : null}
  </>;
  if (detail.kind === "components") return <Row label="Components"><Components components={detail.components} /></Row>;
  if (detail.kind === "animal") return <>
    <Row label="Food"><Components components={(detail.foodItems || []).map((food) => ({
      ...food,
      name: food.name === "Mix" ? "Mix Food" : food.name,
      image: food.name === "Mix" ? imgmix : food.image,
    }))} /></Row>
    {detail.level !== null && detail.level !== undefined ? <Row label="Animal level">{frmtNb(detail.level)}</Row> : null}
  </>;
  if (detail.kind === "seed") return <Row label="Seeds"><Flower value={detail.costFlower} /></Row>;
  if (detail.costTree) return <CompositionTree costTree={detail.costTree} catalog={compositionCatalog} />;
  return null;
}

function FruitSetup({ detail, contract }) {
  const toolIsFree = detail.axeFree || detail.toolFree;
  return <Section title={detail.greenhouse ? "Planting cost" : "Tree setup cost"}>
    <Row label="Seeds"><Coins value={detail.seedCostCoins} /></Row>
    {Number(detail.oilQuantity) > 0 ? <Row label="Oil">{frmtNb(detail.oilQuantity)} <Icon src={detail.oilImage || contract.oilImage} label="Oil" small /> · <Coins value={detail.oilCostCoins} /></Row> : null}
    {!detail.greenhouse && !toolIsFree ? <Row label={detail.toolName || "Axe"}><Icon src={detail.axeImage || detail.toolImage} label={detail.toolName || "Axe"} small /> · <Coins value={detail.axeCostCoins ?? detail.toolCostCoins} /></Row> : null}
    {Number.isFinite(Number(detail.inputCostFlower)) ? <Row label="Seeds + oil"><Flower value={detail.inputCostFlower} /></Row> : null}
  </Section>;
}

function FruitLifecycle({ detail, yieldPerNode, productionCostFlower, harvestQuantity, itemImage, itemName }) {
  return <Section title={detail.greenhouse ? "Production" : "Production over tree lifetime"}>
    {!detail.greenhouse ? <Row label="Harvests per tree">{frmtNb(detail.harvestCount)}</Row> : null}
    {yieldPerNode !== undefined ? <Row label="Yield per harvest/node">{frmtNb(yieldPerNode)} <Icon src={itemImage} label={itemName || "Item"} small /></Row> : null}
    {harvestQuantity !== undefined ? <Row label="This harvest">{frmtNb(harvestQuantity)}</Row> : null}
    <Row label="Allocated production cost"><Flower value={productionCostFlower} /></Row>
  </Section>;
}

function ProductionCost({ contract, compositionCatalog }) {
  if (contract.detail?.kind === "fruit") return <>
    <FruitSetup detail={contract.detail} contract={contract} />
    <FruitLifecycle detail={contract.detail} yieldPerNode={contract.harvestAveragePerNode} productionCostFlower={contract.productionCostFlower} itemImage={contract.itemImage} itemName={contract.item} />
    <Section title="Marketplace"><Row label={`Sale after ${frmtNb(contract.taxPercent)}% tax`}><Flower value={contract.marketAfterTaxFlower} /></Row></Section>
    <ProfitSummary profit={contract.profitFlower} multiplier={contract.profitMultiplier} percent={contract.profitPercent} />
  </>;
  return <>
    <ProfitSummary profit={contract.profitFlower} multiplier={contract.profitMultiplier} percent={contract.profitPercent} />
    <Section title="Production">
      <CostInputs detail={contract.detail} contract={contract} compositionCatalog={compositionCatalog} />
      <Row label="Average per node">{frmtNb(contract.harvestAveragePerNode)} <Icon src={contract.itemImage} label={contract.item || "Item"} small /> / <Icon src={NODE_ICONS[contract.nodeKind]} label={contract.nodeKind || "Node"} small /></Row>
      <Row label="Total production cost"><Flower value={contract.productionCostFlower} /></Row>
      {contract.detail?.kind === "animal" ? <Row label="If crops are bought"><Flower value={contract.detail.marketPerHarvestFlower} /></Row> : null}
    </Section>
    <Section title="Marketplace"><Row label={`Sale after ${frmtNb(contract.taxPercent)}% tax`}><Flower value={contract.marketAfterTaxFlower} /></Row></Section>
  </>;
}

function Harvest({ contract, growing, compositionCatalog }) {
  const scenario = contract.harvest?.[growing ? "growing" : "average"];
  if (!scenario) return <div className="modern-tooltip__empty">Harvest details unavailable.</div>;
  const spots = scenario.spots || {};
  if (scenario.detail?.kind === "fruit") return <>
    <div className="modern-tooltip__stats">
      <div className="modern-tooltip__stat"><span>{growing ? "Growing" : "Harvest"}</span><strong>{frmtNb(scenario.quantity)}</strong></div>
      <div className="modern-tooltip__stat"><span>Fruit trees</span><strong><NodeSpots nodeKind={contract.nodeKind} spots={spots} /></strong></div>
    </div>
    <FruitSetup detail={scenario.detail} contract={contract} />
    <FruitLifecycle detail={scenario.detail} yieldPerNode={scenario.yieldPerNode} harvestQuantity={scenario.quantity} productionCostFlower={scenario.productionCostFlower} itemImage={contract.itemImage} itemName={contract.item} />
    <Section title="Marketplace"><Row label={`Sale after ${frmtNb(contract.taxPercent)}% tax`}><Flower value={scenario.marketAfterTaxFlower} /></Row></Section>
    <ProfitSummary profit={scenario.profitFlower} multiplier={scenario.profitMultiplier} percent={scenario.profitPercent} />
  </>;
  return <>
    <ProfitSummary profit={scenario.profitFlower} multiplier={scenario.profitMultiplier} percent={scenario.profitPercent} />
    <div className="modern-tooltip__stats">
      {!growing ? <div className="modern-tooltip__stat"><span>Yield/node</span><strong>{frmtNb(scenario.yieldPerNode)}</strong></div> : null}
      <div className="modern-tooltip__stat"><span>{growing ? "Growing" : "Harvest"}</span><strong>{frmtNb(scenario.quantity)}</strong></div>
      <div className="modern-tooltip__stat"><span>Nodes</span><strong><NodeSpots nodeKind={contract.nodeKind} spots={spots} /></strong></div>
    </div>
    {!scenario.isFree ? <Section title="Production"><HarvestInputs detail={scenario.detail} contract={contract} compositionCatalog={compositionCatalog} /><Row label="Total production cost"><Flower value={scenario.productionCostFlower} /></Row></Section> : null}
    <Section title="Marketplace"><Row label={`Sale after ${frmtNb(contract.taxPercent)}% tax`}><Flower value={scenario.marketAfterTaxFlower} /></Row></Section>
  </>;
}

function Market({ contract }) {
  const quantity = Number(contract.quantity) || 1;
  const gross = Number(contract.grossUnit || 0) * quantity;
  const tax = Number(contract.taxUnit || 0) * quantity;
  const production = Number(contract.productionUnit || 0) * quantity;
  const profit = Number(contract.includeProductionCost ? contract.profitUnit : contract.profitWithoutCostUnit) * quantity;
  return <>
    <ProfitSummary profit={profit} multiplier={contract.profitMultiplier} percent={contract.profitPercent} showReturn={contract.includeProductionCost} />
    <Section title={`Marketplace · ×${frmtNb(quantity)}`}>
      <Row label="Gross sale"><Flower value={gross} /></Row>
      <Row label={`Trade tax (${frmtNb(contract.taxPercent)}%)`}><Flower value={tax} /></Row>
      {contract.includeProductionCost && production > 0 ? <Row label="Production cost"><Flower value={production} /></Row> : null}
      <Row label="Net profit"><Flower value={profit} /></Row>
    </Section>
  </>;
}

export default function InventoryFinancialModern({ context, contract, growing, compositionCatalog }) {
  if (context === "costp") return <ProductionCost contract={contract} compositionCatalog={compositionCatalog} />;
  if (context === "harvest") return <Harvest contract={contract} growing={growing} compositionCatalog={compositionCatalog} />;
  if (context === "market") return <Market contract={contract} />;
  return null;
}
