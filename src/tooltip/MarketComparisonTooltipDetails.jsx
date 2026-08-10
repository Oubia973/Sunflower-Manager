import React from "react";
import { ColorValue, frmtNb } from "../fct.js";

export default function MarketComparisonTooltipDetails({
  contract,
  taxPercent,
  itemName,
  quantity,
  includeProductionCost,
  icons,
}) {
  if (!contract || typeof contract !== "object") return null;

  const qty = Number(quantity) || 1;
  const gross = Number(contract.grossUnit || 0) * qty;
  const tax = Number(contract.taxUnit || 0) * qty;
  const production = Number(contract.productionUnit || 0) * qty;
  const profit = Number(includeProductionCost ? contract.profitUnit : contract.profitWithoutCostUnit) * qty;
  const multiplier = contract.profitMultiplier === null ? Infinity : Number(contract.profitMultiplier || 0);
  const percent = contract.profitPercent === null ? "∞" : frmtNb(contract.profitPercent);
  const itemIcon = <img src={contract.itemImage || icons?.fallback} alt={itemName || "?"} style={{ width: "22px", height: "22px" }} />;

  return (
    <>
      <div>{itemIcon}{qty > 1 ? `x${qty.toFixed(2)}` : ""} {itemName}</div>
      <div>Marketplace{icons?.market} {frmtNb(gross)}{icons?.flower}</div>
      <div>Trade tax {frmtNb(taxPercent)}% {frmtNb(tax)}{icons?.flower}</div>
      {includeProductionCost && production > 0 ? <div>Your production cost {frmtNb(production)}{icons?.flower}</div> : null}
      <div>
        Profit {frmtNb(profit)}{icons?.flower}
        {includeProductionCost ? <> <span style={{ color: ColorValue(multiplier) }}>{percent}%</span></> : null}
      </div>
    </>
  );
}
