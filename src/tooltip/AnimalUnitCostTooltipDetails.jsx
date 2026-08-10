import React from "react";
import { ColorValue, frmtNb } from "../fct.js";

export default function AnimalUnitCostTooltipDetails({ contract, feedCostContract, icons, setCompoTable }) {
  if (!contract || typeof contract !== "object") return null;
  const productIcon = <img src={contract.productImage || icons?.fallback} alt={contract.productName} style={{ width: 20, height: 20 }} />;
  const animalImage = icons?.animals?.[contract.animalName] || icons?.fallback;
  const animalIcon = <img src={animalImage} alt={contract.animalName} style={{ width: 16, height: 16 }} />;
  const selectedFoodImage = contract.foodName === "Mix" || contract.foodName === "Mix Food"
    ? icons?.mix
    : contract.foodName === "Omnifeed" ? icons?.omni : contract.foodImage;
  const isMix = contract.foodName === "Mix" || contract.foodName === "Mix Food";
  const mixTable = isMix && feedCostContract?.costTree
    ? setCompoTable("Mix Food", contract.foodQuantity, { costTree: feedCostContract.costTree, img: icons?.mix, label: "Mix Food" })?.table
    : null;
  const multiplier = contract.profitMultiplier === null ? Infinity : Number(contract.profitMultiplier || 0);
  const percent = contract.profitPercent === null ? "∞" : frmtNb(contract.profitPercent);

  return <>
    <div>{productIcon} {contract.productName} cost</div>
    {contract.currentLevel !== null ? <div>for a lvl{frmtNb(contract.currentLevel)} {animalIcon}</div> : null}
    {isMix && mixTable ? <div>{mixTable}</div> : <div><img src={selectedFoodImage || icons?.fallback} alt={contract.foodName} style={{ width: 22, height: 22 }} />x{frmtNb(contract.foodQuantity)} cost {frmtNb(contract.foodCycleCost)}{icons?.flower} {icons?.market}{frmtNb(contract.foodCycleMarketCost)}{icons?.flower}</div>}
    <div>{productIcon}x{frmtNb(contract.yieldPerCycle)} per {animalIcon}</div>
    <div>Your production cost {frmtNb(contract.productionCost)}{icons?.flower}</div>
    {contract.buyCropsCost !== null ? <div>(Buying crops {icons?.market}{frmtNb(contract.buyCropsCost)}{icons?.flower})</div> : null}
    <div>Marketplace-{frmtNb(contract.tradeTaxPercent)}% tax {frmtNb(contract.marketAfterTax)}{icons?.flower}</div>
    <div>Profit {frmtNb(contract.profit)}{icons?.flower} <span style={{ color: ColorValue(multiplier) }}>{percent}%</span></div>
  </>;
}
