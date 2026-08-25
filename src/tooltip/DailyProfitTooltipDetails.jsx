import React from "react";
import { ColorValue, frmtNb } from "../fct.js";

export default function DailyProfitTooltipDetails({
  contract,
  itemName,
  icons,
}) {
  if (!contract || typeof contract !== "object") return null;

  const itemIcon = (
    <img
      src={contract.itemImage || icons?.fallback}
      alt={itemName ?? "?"}
      style={{ width: "22px", height: "22px" }}
    />
  );
  const animal = contract?.animal && typeof contract.animal === "object" ? contract.animal : null;
  const foodIcon = animal ? (
    <img
      src={animal.foodImage || icons?.fallback}
      alt={animal.food || "Food"}
      style={{ width: "20px", height: "20px" }}
    />
  ) : null;
  const profitMultiplier = contract.profitMultiplier === null
    ? Infinity
    : Number(contract.profitMultiplier);
  const profitPercent = contract.profitPercent === null
    ? "∞"
    : frmtNb(contract.profitPercent);
  const production = contract?.production && typeof contract.production === "object"
    ? contract.production
    : null;
  const harvestSupplement = contract?.harvestSupplement && typeof contract.harvestSupplement === "object"
    ? contract.harvestSupplement
    : null;
  const resourceBurn = contract?.resourceBurn && typeof contract.resourceBurn === "object"
    ? contract.resourceBurn
    : null;
  const harvestSupplementDisplay = <>
    {Number(harvestSupplement?.marketFlower) > 0 ? <> {'('}{frmtNb(harvestSupplement.marketFlower)}{icons?.flower}{')'}</> : null}
    {Number(harvestSupplement?.woodQuantity) > 0 ? <>
      {' '}<img src={harvestSupplement.woodImage || icons?.fallback} alt="Wood" style={{ width: "20px", height: "20px" }} />x{frmtNb(harvestSupplement.woodQuantity)}
    </> : null}
    {Number(harvestSupplement?.woodFlower) > 0 ? <> {'('}{frmtNb(harvestSupplement.woodFlower)}{icons?.flower}{')'}</> : null}
  </>;
  const marketSaleLimit = contract?.marketSaleLimit && typeof contract.marketSaleLimit === "object"
    ? contract.marketSaleLimit
    : null;
  const oilIcon = production?.oilQuantity > 0 ? (
    <img
      src={production.oilImage || icons?.fallback}
      alt="Oil"
      style={{ width: "20px", height: "20px" }}
    />
  ) : null;
  const toolIcon = production?.toolName ? (
    <img src={production.toolImage || icons?.fallback} alt={production.toolName} style={{ width: "22px", height: "22px" }} />
  ) : null;
  const nodeDisplay = Array.isArray(contract.nodes) && contract.nodes.length > 0
    ? <>with {contract.nodes.map((node, index) => <React.Fragment key={`${node.image}-${index}`}>
      {frmtNb(node.quantity)}<img src={node.image || icons?.fallback} alt="" style={{ width: "20px", height: "20px" }} />{" "}
    </React.Fragment>)}</>
    : icons?.node;

  return (
    <>
      <div>{itemIcon} {itemName} daily</div>
      <div>Grow time: {contract.growTime} {contract.stockLabel ? <span>{contract.stockLabel}: {frmtNb(contract.stock)}</span> : null}</div>
      <div>{frmtNb(contract.cycles)} harvest/day with {frmtNb(contract.inputFarmHours)}h and {frmtNb(contract.restocks)} restock</div>
      {contract.harvestTimeDaily ? <div>Time to harvest by day: {contract.harvestTimeDaily}</div> : null}
      <div>Harvest average {itemIcon}x{frmtNb(contract.harvestAverage)} {nodeDisplay}</div>
      {resourceBurn ? (
        <>
          <div>Harvest before tools {itemIcon}x{frmtNb(resourceBurn.harvestBeforeTools)}</div>
          <div>Resources burned by tools {itemIcon}x{frmtNb(resourceBurn.burnedByTools)}</div>
          <div>Harvest after tools {itemIcon}x{frmtNb(resourceBurn.harvestAfterTools)}{harvestSupplementDisplay}</div>
        </>
      ) : (
        <div>Harvest total by day {itemIcon}x{frmtNb(contract.harvestDaily)}{harvestSupplementDisplay}</div>
      )}
      {animal ? (
        <div>
          {foodIcon}x{frmtNb(animal.quantity)} cost {frmtNb(animal.costCoins)}{icons?.coins}
          {' ('}{frmtNb(animal.costFlower)}{icons?.flower}{')'}
          <div>{icons?.node} {animal.name} lvl{frmtNb(animal.level)}</div>
        </div>
      ) : production?.kind === "crop" ? (
        <div>
          Seeds x{frmtNb(production.seedQuantity)}: {frmtNb(production.seedCostCoins)}{icons?.coins}
          {production.oilQuantity > 0 ? <> + {oilIcon}x{frmtNb(production.oilQuantity)}: {frmtNb(production.oilCostCoins)}{icons?.coins}</> : null}
          {' ('}{frmtNb(contract.productionCostFlower)}{icons?.flower}{')'}
        </div>
      ) : production?.kind === "seed" ? (
        <div>
          Seeds x{frmtNb(production.seedQuantity)}: {frmtNb(production.seedCostCoins)}{icons?.coins}
          {' ('}{frmtNb(contract.productionCostFlower)}{icons?.flower}{')'}
        </div>
      ) : production?.kind === "fruit" ? (
        <div>
          <div>Your production cost for {frmtNb(production.harvestCount)} harvests:</div>
          <div>- Seeds x{frmtNb(production.seedQuantity)}: {frmtNb(production.seedCostCoins)}{icons?.coins} {'('}{frmtNb(production.seedCostFlower)}{icons?.flower}{')'}</div>
          {!production.toolFree ? <div>- <img src={production.toolImage || icons?.fallback} alt={production.toolName} style={{ width: "22px", height: "22px" }} />x{frmtNb(production.toolQuantity)} cost {frmtNb(production.toolCostCoins)}{icons?.coins} {'('}{frmtNb(production.toolCostFlower)}{icons?.flower}{')'}</div> : null}
          <div>Daily average: {frmtNb(contract.productionCostCoins)}{icons?.coins} {'('}{frmtNb(contract.productionCostFlower)}{icons?.flower}{') ('}{frmtNb(production.dailyAverageCycles)}x {frmtNb(production.harvestCount)} harvests{')'}</div>
        </div>
      ) : production?.kind === "tool" ? (
        <div>
          {toolIcon}x{frmtNb(production.quantity)} cost {frmtNb(production.costCoins)}{icons?.coins}
          {(production.components || []).map((component) => (
            <React.Fragment key={component.name}>
              {frmtNb(component.quantity)}
              <img src={component.image || icons?.fallback} className="resicon" alt={component.name} />
            </React.Fragment>
          ))}
          {' ('}{frmtNb(contract.productionCostFlower)}{icons?.flower}{')'}
        </div>
      ) : production?.kind === "components" ? (
        <div>
          {(production.components || []).map((component) => (
            <React.Fragment key={component.name}>
              <img src={component.image || icons?.fallback} className="resicon" alt={component.name} />
              x{frmtNb(component.quantity)}
            </React.Fragment>
          ))}
          {' ('}{frmtNb(contract.productionCostFlower)}{icons?.flower}{')'}
        </div>
      ) : production?.kind === "free" ? null : (
        <div>Production cost: {frmtNb(contract.productionCostCoins)}{icons?.coins} {' ('}{frmtNb(contract.productionCostFlower)}{icons?.flower}{')'}</div>
      )}
      {contract.showRestockCost && Number(contract.restockFlower) > 0 ? (
        <div>
          Restock: {Number(contract.restockGems) > 0 ? <>{frmtNb(contract.restockGems)}{icons?.gem} </> : null}
          {'('}{frmtNb(contract.restockFlower)}{icons?.flower}{')'}
        </div>
      ) : null}
      {marketSaleLimit ? (
        <div>
          Market sale limit: {frmtNb(marketSaleLimit.quantityPerWeek)} per week
          {' ('}{frmtNb(marketSaleLimit.averageQuantityPerDay)}/day average, cost {frmtNb(marketSaleLimit.allocatedCostFlower)}{icons?.flower}{')'}
        </div>
      ) : null}
      <div>Marketplace{icons?.market}-{frmtNb(contract.tradeTaxPercent)}% tax {frmtNb(contract.marketFlower)}{icons?.flower}</div>
      <div>Profit {frmtNb(contract.profitFlower)}{icons?.flower} <span style={{ color: ColorValue(profitMultiplier) }}>{profitPercent}%</span></div>
    </>
  );
}
