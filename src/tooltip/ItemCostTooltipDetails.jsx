import React from "react";
import { frmtNb } from "../fct.js";

export default function ItemCostTooltipDetails({ contract, season, renderSeasonButtons, setCompoTable, icons }) {
  if (!contract || typeof contract !== "object") return null;
  const quantityText = Number(contract.quantity) === 1 ? "" : `x${contract.quantity}`;
  const seasonalTree = contract.seasonalCostTree?.[season] || contract.seasonalCostTree?.spring;
  const costTree = seasonalTree || contract.costTree;
  const table = costTree ? setCompoTable(contract.itemName, contract.quantity, {
    costTree,
    img: contract.itemImage || icons?.fallback,
    label: seasonalTree ? `${contract.itemName} - ${season.charAt(0).toUpperCase()}${season.slice(1)}` : contract.itemName,
  })?.table : null;
  return <>
    <div><img src={contract.itemImage || icons?.fallback} alt={contract.itemName} style={{ width: 20, height: 20 }} />{contract.itemName} {quantityText}</div>
    {table ? <div>{seasonalTree ? renderSeasonButtons(season) : null}{table}</div> : <div>cost: {frmtNb(contract.totalCost)}{icons?.flower} | {icons?.market}: {frmtNb(contract.totalMarket)}{icons?.flower}</div>}
  </>;
}
