import React from "react";
import { ColorValue, frmtNb } from "../fct.js";

export default function ProductionCostTooltipDetails({ contract, itemName, icons, setCompoTable }) {
  if (!contract || typeof contract !== "object") return null;
  const detail = contract.detail;
  const itemIcon = <img src={contract.itemImage || icons?.fallback} alt={itemName || "?"} style={{ width: 22, height: 22 }} />;
  const nodeIcon = <img src={icons?.nodes?.[contract.nodeKind] || icons?.fallback} alt="" style={{ width: 20, height: 20 }} />;
  const oilIcon = <img src={icons?.oil || icons?.fallback} alt="Oil" style={{ width: 20, height: 20 }} />;
  const profitColor = ColorValue(contract.profitMultiplier === null ? Infinity : Number(contract.profitMultiplier || 0));
  const profitPercent = contract.profitPercent === null ? "∞" : frmtNb(contract.profitPercent);

  let detailView = null;
  if (detail?.kind === "crop") {
    detailView = <div>Seed cost {frmtNb(detail.seedCostCoins)}{icons?.coins}
      {detail.oilQuantity > 0 ? <> + {frmtNb(detail.oilQuantity)}{oilIcon} {frmtNb(detail.oilCostCoins)}{icons?.coins}</> : null}
      {' ('}{frmtNb(detail.inputCostFlower)}{icons?.flower}{')'}
    </div>;
  }
  if (detail?.kind === "tool" && detail.costTree) {
    detailView = setCompoTable(detail.toolName, 1, {
      costTree: detail.costTree,
      img: detail.toolImage || icons?.fallback,
      label: detail.toolName,
    })?.table;
  }
  if (detail?.kind === "components" && detail.costTree) {
    const current = setCompoTable(itemName, 1, {
      costTree: detail.costTree,
      img: contract.itemImage || icons?.fallback,
      label: itemName,
    })?.table;
    detailView = <>{current}{detail.otherSeasons?.length ? <div>Other seasons:
      {detail.otherSeasons.map((season) => <div key={season.season}>
        {icons?.seasons?.[season.season] || season.season}: {season.components.map((component) => <span key={component.name}>
          <img src={component.image || icons?.fallback} className="resicon" alt={component.name} />x{frmtNb(component.quantity)}
        </span>)} {' ('}{frmtNb(season.totalCostFlower)}{icons?.flower}{')'}
      </div>)}
    </div> : null}</>;
  }
  if (detail?.kind === "animal") {
    const foodIcon = <img src={detail.foodImage || (detail.foodName === "Mix" ? icons?.mix : detail.foodName === "Omnifeed" ? icons?.omni : icons?.fallback)} alt={detail.foodName} style={{ width: 20, height: 20 }} />;
    const foodView = detail.costTree
      ? setCompoTable("Mix Food", 1, { costTree: detail.costTree, img: icons?.mix, label: "Mix Food" })?.table
      : <div>{foodIcon}x{frmtNb(detail.foodQuantity)} cost {frmtNb(detail.foodCostFlower)}{icons?.flower} {icons?.market}{frmtNb(detail.foodMarketFlower)}{icons?.flower}</div>;
    detailView = <><div>for a lvl{frmtNb(detail.level)} {nodeIcon}</div>{foodView}</>;
  }
  if (detail?.kind === "fruit") {
    detailView = <>
      <div>Seed cost {frmtNb(detail.seedCostCoins)}{icons?.coins}
        {detail.oilQuantity > 0 ? <> + {frmtNb(detail.oilQuantity)}{oilIcon} {frmtNb(detail.oilCostCoins)}{icons?.coins}</> : null}
        {' ('}{frmtNb(detail.inputCostFlower)}{icons?.flower}{')'}
      </div>
      {!detail.greenhouse ? <div>{frmtNb(detail.harvestCount)} harvest average by seed</div> : null}
      {!detail.greenhouse && !detail.axeFree ? <div><img src={detail.axeImage || icons?.fallback} alt="Axe" style={{ width: 22, height: 22 }} /> cost {frmtNb(detail.axeCostCoins)}{icons?.coins}</div> : null}
    </>;
  }
  if (detail?.kind === "seed") detailView = <div>Seed cost {frmtNb(detail.seedCostFlower)}{icons?.flower}</div>;

  return <>
    <div>{itemIcon} {itemName} cost</div>
    {!contract.isFree ? detailView : null}
    <div>Average per node: {frmtNb(contract.harvestAveragePerNode)}{itemIcon} / {nodeIcon}</div>
    <div>Your production cost {frmtNb(contract.productionCostFlower)}{icons?.flower}</div>
    {detail?.kind === "animal" ? <div>(Buying crops {icons?.market}{frmtNb(detail.marketPerHarvestFlower)}{icons?.flower})</div> : null}
    <div>Marketplace{icons?.market}-{frmtNb(contract.taxPercent)}% tax {frmtNb(contract.marketAfterTaxFlower)}{icons?.flower}</div>
    <div>Profit {frmtNb(contract.profitFlower)}{icons?.flower} <span style={{ color: profitColor }}>{profitPercent}%</span></div>
  </>;
}
