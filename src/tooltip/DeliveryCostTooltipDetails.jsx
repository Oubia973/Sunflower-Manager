import React, { useState } from "react";
import { frmtNb } from "../fct.js";
import CompositionTooltipModern from "./modern/composition/CompositionTooltipModern.jsx";

export default function DeliveryCostTooltipDetails({ contract, icons, dragHandleProps, compositionCatalog }) {
  const [expanded, setExpanded] = useState(() => new Set());
  if (!contract || typeof contract !== "object") return null;
  const rows = Array.isArray(contract.rows) ? contract.rows : [];
  const toggle = (name) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    return next;
  });

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
          <React.Fragment key={row.name}>
          <tr>
            <td style={{ padding: "2px 8px 2px 0" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {row.composition?.items?.length ? <button type="button" className="tooltip-delivery-expand" aria-label={`${expanded.has(row.name) ? "Hide" : "Show"} ${row.name} components`} aria-expanded={expanded.has(row.name)} onClick={() => toggle(row.name)}>{expanded.has(row.name) ? "▾" : "▸"}</button> : null}
                <img src={row.img || icons?.fallback} alt="" title={row.name} style={{ width: 18, height: 18, ...(row.isAged ? { filter: "grayscale(100%) brightness(1)" } : {}) }} />
                <span>{row.displayName || row.name}</span>
              </span>
            </td>
            <td style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(row.quantity)}</td>
            <td style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(row.cost)}</td>
            <td style={{ textAlign: "center" }}>{frmtNb(row.market)}</td>
          </tr>
          {expanded.has(row.name) && row.composition?.items?.length ? <tr className="tooltip-delivery-composition-row"><td colSpan={4}><CompositionTooltipModern contract={row.composition} catalog={compositionCatalog} hideSingleItemTitle /></td></tr> : null}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
