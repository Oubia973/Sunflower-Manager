import React from "react";
import { frmtNb } from "../fct.js";

export default function DigRatioTooltipDetails({ contract, isPattern, icons }) {
  if (!contract || (!contract.isTotal && !(Number(contract.quantityToday) > 0))) return null;
  const value = isPattern ? contract.patternValue : contract.digValue;
  const toolCost = isPattern ? contract.patternToolCost : contract.toolCost;
  const ratio = isPattern ? contract.patternRatioCoinsPerSfl : contract.ratioCoinsPerSfl;
  const itemImage = contract.itemImage || icons?.fallback;
  const itemPrefix = contract.isTotal ? null : <span>
    <img src={itemImage} alt={contract.itemName || "?"} style={{ width: 22, height: 22 }} />
    x{frmtNb(contract.quantityToday)} 
  </span>;

  return <>
    <div>{contract.isTotal ? "Total ratio" : <><img src={itemImage} alt={contract.itemName || "?"} style={{ width: 22, height: 22 }} />{contract.itemName} ratio</>}</div>
    {isPattern && contract.isTotal ? <>
      <div>This is patterns values</div>
      <div>it&apos;s what you can have without dig any Sand, Crab or Bone</div>
    </> : null}
    <div>Your tools cost with {frmtNb(contract.coinsRatio)} ratio before dig: {frmtNb(toolCost)}</div>
    <div>{itemPrefix}digged value today: {frmtNb(value)}</div>
    <div>{itemPrefix}ratio: {frmtNb(ratio)}{icons?.coins} for 1{icons?.flower}</div>
  </>;
}
