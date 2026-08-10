import React from "react";
import { frmtNb } from "../fct.js";

export function ActivityMaxTooltipDetails({ contract, fallbackDate, dragHandleProps }) {
  const value = contract || {};
  const rows = [
    ["Daily chest", value.gotChest, value.chest],
    ["Deliveries", value.gotDeliveries, value.deliveries],
    ["Chores", value.gotChores, value.chores],
    ["Bounties", value.gotBounties, value.bounties],
  ];
  return <table className="tooltip-delivery-table">
    <thead {...dragHandleProps} className="tooltip-delivery-drag-handle">
      <tr className="tooltip-delivery-head-row">
        <th style={{ textAlign: "left", paddingRight: 12 }}>{String(value.date || fallbackDate || "Day")}</th>
        <th style={{ textAlign: "center", paddingRight: 10 }}>Got</th>
        <th style={{ textAlign: "center" }}>Max</th>
      </tr>
      <tr className="tooltip-delivery-total-row">
        <th style={{ textAlign: "left", paddingRight: 12 }}>Got / Max</th>
        <td style={{ textAlign: "center", paddingRight: 10 }}>{frmtNb(Number(value.got || 0))}</td>
        <td style={{ textAlign: "center" }}>{frmtNb(Number(value.max || 0))}</td>
      </tr>
    </thead>
    <tbody>{rows.map(([label, got, max]) => <tr key={label}>
      <td style={{ padding: "2px 12px 2px 0" }}>{label}</td>
      <td style={{ textAlign: "center", paddingRight: 10 }}>{frmtNb(Number(got || 0))}</td>
      <td style={{ textAlign: "center" }}>{frmtNb(Number(max || 0))}</td>
    </tr>)}</tbody>
  </table>;
}

export function ActivityXpTooltipDetails({ contract, fallbackDate, fallbackImage, dragHandleProps }) {
  const value = contract || {};
  const rows = Array.isArray(value.rows) ? value.rows : [];
  return <table className="tooltip-delivery-table">
    <thead {...dragHandleProps} className="tooltip-delivery-drag-handle">
      <tr className="tooltip-delivery-head-row">
        <th style={{ textAlign: "left", paddingRight: 8 }}>{String(value.date || fallbackDate || "XP")}</th>
        <th style={{ textAlign: "center", paddingRight: 8 }}>Qty</th>
        <th style={{ textAlign: "center", paddingRight: 8 }}>XP/u</th>
        <th style={{ textAlign: "center" }}>XP</th>
      </tr>
      <tr className="tooltip-delivery-total-row">
        <th style={{ textAlign: "left", paddingRight: 8 }}>Total</th><td></td><td></td>
        <td style={{ textAlign: "center" }}>{frmtNb(Number(value.totalXp || 0))}</td>
      </tr>
    </thead>
    <tbody>{rows.length > 0 ? rows.map((row) => <tr key={`activityxp-${row.dish}`}>
      <td style={{ padding: "2px 8px 2px 0" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <img src={row.img || fallbackImage} alt="" title={row.dish} style={{ width: 18, height: 18 }} /><span>{row.dish}</span>
      </span></td>
      <td style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(row.qty)}</td>
      <td style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(row.xpUnit)}</td>
      <td style={{ textAlign: "center" }}>{frmtNb(row.xpTotal)}</td>
    </tr>) : <tr><td colSpan="4" style={{ textAlign: "center", paddingTop: 6 }}>No cooked dishes</td></tr>}</tbody>
  </table>;
}
