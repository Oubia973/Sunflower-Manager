import React from "react";
import { frmtNb } from "../fct.js";

export default function CrustaceanCostTooltipDetails({
  contract,
  itemName,
  quantity,
  setCompoTable,
  fallbackImage,
}) {
  if (!contract?.costTree) return null;

  const qty = Number(quantity) || 1;
  const averageYield = Number(contract.yield) || 1;
  const itemImage = contract.itemImage || fallbackImage;
  const composition = setCompoTable(itemName, qty, {
    costTree: contract.costTree,
    img: itemImage,
    label: itemName,
  });
  const itemIcon = <img src={itemImage} alt={itemName || "Crustacean"} style={{ width: "18px", height: "18px" }} />;
  const toolIcon = contract.toolName ? (
    <img src={contract.toolImage || fallbackImage} alt={contract.toolName} style={{ width: "18px", height: "18px" }} />
  ) : null;

  return (
    <>
      {composition?.table}
      <div></div>
      <div>{itemIcon}x{frmtNb(qty * averageYield)} created{toolIcon ? <> per {toolIcon}</> : null}</div>
    </>
  );
}
