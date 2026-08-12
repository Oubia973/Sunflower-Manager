import React from "react";
import { ColorValue, frmtNb } from "../fct.js";

const ResourceIcon = ({ src, fallback, name, size = 20 }) => <img src={src || fallback} alt={name || ""} title={name || ""} style={{ width: size, height: size }} />;

export default function HarvestTooltipDetails({ contract, itemName, growing, isPurchased, icons }) {
  if (!contract || typeof contract !== "object") return null;
  const itemIcon = <ResourceIcon src={contract.itemImage} fallback={icons?.fallback} name={itemName} size={22} />;
  if (isPurchased) return <><div>{itemIcon} {itemName}</div><div>You buy this item for {frmtNb(contract.purchaseFlower)}{icons?.flower}</div></>;
  const scenario = contract.harvest?.[growing ? "growing" : "average"];
  if (!scenario) return null;
  const detail = scenario.detail;
  const primaryNode = icons?.nodes?.[contract.nodeKind] || icons?.fallback;
  const secondaryNode = icons?.secondaryNodes?.[contract.nodeKind]?.secondary;
  const tertiaryNode = icons?.secondaryNodes?.[contract.nodeKind]?.tertiary;
  const nodeList = <>
    {scenario.spots?.primary > 0 ? <>{frmtNb(scenario.spots.primary)}<ResourceIcon src={primaryNode} fallback={icons?.fallback} /></> : null}
    {scenario.spots?.secondary > 0 ? <> {frmtNb(scenario.spots.secondary)}<ResourceIcon src={secondaryNode} fallback={icons?.fallback} /></> : null}
    {scenario.spots?.tertiary > 0 ? <> {frmtNb(scenario.spots.tertiary)}<ResourceIcon src={tertiaryNode} fallback={icons?.fallback} /></> : null}
  </>;
  const oilIcon = <ResourceIcon src={icons?.oil} fallback={icons?.fallback} name="Oil" />;

  let detailView = null;
  if (detail?.kind === "crop") {
    detailView = <div>Seeds: {frmtNb(detail.seedCostCoins)}{icons?.coins}
      {detail.oilQuantity > 0 ? <> + {frmtNb(detail.oilQuantity)}{oilIcon} {frmtNb(detail.oilCostCoins)}{icons?.coins}</> : null}
    </div>;
  }
  if (detail?.kind === "tool") {
    detailView = <div>
      <ResourceIcon src={detail.toolImage} fallback={icons?.fallback} name={detail.toolName} size={22} />x{frmtNb(detail.quantity)} cost {frmtNb(detail.costCoins)}{icons?.coins}
      {detail.components?.map((component) => <React.Fragment key={component.name}> {frmtNb(component.quantity)}<ResourceIcon src={component.image} fallback={icons?.fallback} name={component.name} size={16} /></React.Fragment>)}
    </div>;
  }
  if (detail?.kind === "components") {
    detailView = <div>{detail.components?.map((component) => <React.Fragment key={component.name}>
      <ResourceIcon src={component.image} fallback={icons?.fallback} name={component.name} size={16} />x{frmtNb(component.quantity)} </React.Fragment>)}
    </div>;
  }
  if (detail?.kind === "animal") {
    detailView = <div>Food: {detail.foodItems?.map((food) => <React.Fragment key={food.name}>
      <ResourceIcon src={food.image || (food.name === "Mix" ? icons?.mix : food.name === "Omnifeed" ? icons?.omni : null)} fallback={icons?.fallback} name={food.name} />x{frmtNb(food.quantity)} </React.Fragment>)}
      {detail.level !== null ? <div>for lvl{frmtNb(detail.level)} animals</div> : null}
    </div>;
  }
  if (detail?.kind === "fruit") {
    detailView = <div>
      {!detail.greenhouse ? <div>For first harvest:</div> : null}
      <div>Seeds: {frmtNb(detail.seedCostCoins)}{icons?.coins}
        {detail.oilQuantity > 0 ? <> + {frmtNb(detail.oilQuantity)}{oilIcon} {frmtNb(detail.oilCostCoins)}{icons?.coins}</> : null}
      </div>
      {!detail.greenhouse && !detail.toolFree ? <div><ResourceIcon src={detail.toolImage} fallback={icons?.fallback} name="Axe" size={22} /> cost {frmtNb(detail.toolCostCoins)}{icons?.coins}</div> : null}
      {!detail.greenhouse ? <div>For {frmtNb(detail.harvestCount)} harvests = {frmtNb(scenario.productionCostFlower)}{icons?.flower}</div> : null}
    </div>;
  }
  if (detail?.kind === "seed") detailView = <div>Seeds: {frmtNb(detail.costFlower)}{icons?.flower}</div>;

  const multiplier = scenario.profitMultiplier === null ? Infinity : Number(scenario.profitMultiplier || 0);
  const percent = scenario.profitPercent === null ? "∞" : frmtNb(scenario.profitPercent);
  return <>
    <div>{itemIcon} {itemName} {growing ? "growing" : "harvest average"}</div>
    {growing
      ? <div>Harvest {itemIcon}x{Number(scenario.quantity).toFixed(2)} with {nodeList}</div>
      : <><div>Yield by node {frmtNb(scenario.yieldPerNode)}</div><div>Harvest average {itemIcon}x{frmtNb(scenario.quantity)} with {nodeList}</div></>}
    {!scenario.isFree ? <div>Your production cost: {detailView}<div>Total: {frmtNb(scenario.productionCostFlower)}{icons?.flower}</div></div> : null}
    <div>Marketplace{icons?.market}-{frmtNb(contract.taxPercent)}% tax {frmtNb(scenario.marketAfterTaxFlower)}{icons?.flower}</div>
    <div>Profit {frmtNb(scenario.profitFlower)}{icons?.flower} <span style={{ color: ColorValue(multiplier) }}>{percent}%</span></div>
  </>;
}
