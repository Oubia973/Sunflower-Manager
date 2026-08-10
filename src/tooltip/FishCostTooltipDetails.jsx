import React from "react";
import { frmtNb } from "../fct.js";

export default function FishCostTooltipDetails({
  contract,
  sharedContract,
  itemName,
  quantity,
  includeChum,
  setCompoTable,
  icons,
}) {
  if (!contract || typeof contract !== "object") return null;

  const qty = Number(quantity) || 1;
  const rodCostTree = sharedContract?.rodCostTree || {};
  const chumCostTree = includeChum ? contract.chumCostTree : null;
  const costTree = chumCostTree ? {
    totalCost: Number(rodCostTree.totalCost || 0) + Number(chumCostTree.totalCost || 0),
    totalCostCoins: Number(rodCostTree.totalCostCoins || 0) + Number(chumCostTree.totalCostCoins || 0),
    totalMarket: Number(rodCostTree.totalMarket || 0) + Number(chumCostTree.totalMarket || 0),
    nodes: { ...(rodCostTree.nodes || {}), ...(chumCostTree.nodes || {}) },
  } : rodCostTree;
  const unitCost = Number(includeChum ? contract.unitCostWithChum : contract.unitCost) || 0;
  const unitMarket = Number(includeChum ? contract.unitMarketWithChum : contract.unitMarket) || 0;
  const composition = setCompoTable(itemName, qty, {
    costTree,
    img: contract.itemImage || icons?.fallback,
    label: itemName,
  });
  const fishIcon = <img src={contract.itemImage || icons?.fallback} alt={itemName || "Fish"} style={{ width: "18px", height: "18px" }} />;
  const rodIcon = <img src={contract.rodImage || icons?.fallback} alt="Rod" style={{ width: "18px", height: "18px" }} />;

  return (
    <>
      {composition?.table}
      <div></div>
      <div>{fishIcon}x{frmtNb(contract.averageYield)} average per {rodIcon}</div>
      <div>
        Your production cost {frmtNb(unitCost * qty)}{icons?.flower}
        {' | '}{frmtNb(unitMarket * qty)}{icons?.market}
      </div>
    </>
  );
}
