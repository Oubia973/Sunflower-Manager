import React from "react";
import { frmtNb } from "../fct.js";

export default function DeliveryCostTooltipDetails({ contract, icons, dragHandleProps }) {
  if (!contract || typeof contract !== "object") return null;
  const rows = Array.isArray(contract.rows) ? contract.rows : [];

  return (
    <table className="tooltip-delivery-table">
      <thead {...dragHandleProps} className="tooltip-delivery-drag-handle">
        <tr className="tooltip-delivery-head-row">
          <th style={{ textAlign: "left", paddingRight: 8 }}>Item</th>
          <th style={{ textAlign: "center", paddingRight: 8 }}>Qty</th>
          <th style={{ textAlign: "center", paddingRight: 8 }}>Cost</th>
          <th style={{ textAlign: "center" }}>{icons?.market}</th>
        </tr>
        <tr className="tooltip-delivery-total-row">
          <th></th><th></th>
          <td style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(contract.totalCost)}</td>
          <td style={{ textAlign: "center" }}>{frmtNb(contract.totalMarket)}</td>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td style={{ padding: "2px 8px 2px 0" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <img src={row.img || icons?.fallback} alt="" title={row.name} style={{ width: 18, height: 18 }} />
                <span>{row.displayName || row.name}</span>
              </span>
            </td>
            <td style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(row.quantity)}</td>
            <td style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(row.cost)}</td>
            <td style={{ textAlign: "center" }}>{frmtNb(row.market)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
