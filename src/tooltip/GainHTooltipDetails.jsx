import React from "react";
import { frmtNb } from "../fct.js";

export default function GainHTooltipDetails({ contract, icons }) {
  if (!contract) return null;
  const image = contract.itemImage || icons?.fallback;
  return <>
    <div><img src={image} alt={contract.itemName || "?"} style={{ width: 22, height: 22 }} /> {contract.itemName} gain/h</div>
    <div>Mode: 24/24 illimited restock</div>
    <div>Grow time: {contract.growTime}</div>
    <div>Harvest average: <img src={image} alt="" style={{ width: 22, height: 22 }} />x{frmtNb(contract.harvestAverage)}</div>
    <div>Harvest/h: <img src={image} alt="" style={{ width: 22, height: 22 }} />x{frmtNb(contract.harvestPerHour)}</div>
    <div>Gain/h: <span style={{ color: contract.color }}>{frmtNb(contract.gainPerHour)}{icons?.flower}</span></div>
  </>;
}
