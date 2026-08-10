import React from "react";
import { frmtNb } from "../fct.js";

export default function ChoreComponentsTooltipDetails({ contract, icons }) {
  const value = contract || {};
  const rows = Array.isArray(value.rows) ? value.rows : [];
  return <table className="tooltip-delivery-table">
    <thead>
      <tr className="tooltip-delivery-head-row">
        <th style={{ textAlign: "left", paddingRight: 8 }}>Item</th>
        <th style={{ textAlign: "center", paddingRight: 8 }}>Qty</th>
        <th style={{ textAlign: "center" }}>Stock</th>
        <th style={{ textAlign: "center" }}>Needed</th>
        <th style={{ textAlign: "center" }}>Cost</th>
        <th style={{ textAlign: "center" }}>{icons?.market}</th>
      </tr>
      <tr className="tooltip-delivery-total-row">
        <th></th><th></th><th></th><th></th>
        <th style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(value.totalCost)}</th>
        <th style={{ textAlign: "center" }}>{frmtNb(value.totalMarket)}</th>
      </tr>
    </thead>
    <tbody>{rows.map((row) => <tr key={row.name}>
      <td style={{ padding: "2px 8px 2px 0" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <img src={row.itemImage || icons?.fallback} alt="" title={row.name} style={{ width: 18, height: 18, ...(row.isAged ? { filter: "grayscale(100%) brightness(1)" } : {}) }} /><span>{row.name}</span>
      </span></td>
      <td style={{ textAlign: "center", paddingRight: 8 }}>{row.displayQuantity}</td>
      <td style={{ textAlign: "center" }}>{Number(row.stock) > 0 ? Math.ceil(row.stock) : ""}</td>
      <td style={{ textAlign: "center" }}>{Number(row.needed) > 0 ? row.needed : ""}</td>
      <td style={{ textAlign: "center" }}>{Number(row.cost) > 0 ? frmtNb(row.cost) : ""}</td>
      <td style={{ textAlign: "center" }}>{Number(row.market) > 0 ? frmtNb(row.market) : ""}</td>
    </tr>)}</tbody>
  </table>;
}
