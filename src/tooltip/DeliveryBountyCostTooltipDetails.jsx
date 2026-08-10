import React from "react";
import { frmtNb } from "../fct.js";

export default function DeliveryBountyCostTooltipDetails({ contract, ticketName, icons, dragHandleProps }) {
  if (!contract || typeof contract !== "object") return null;
  const rows = Array.isArray(contract.rows) ? contract.rows : [];
  const stickyRowTop = 24;
  const stickyCostTop = 72;

  return (
    <table className="tooltip-delivery-table">
      <thead {...dragHandleProps} className="tooltip-delivery-drag-handle">
        <tr className="tooltip-delivery-head-row">
          <th style={{ textAlign: "left", paddingRight: 8 }}>Item</th>
          <th style={{ textAlign: "center", paddingRight: 8 }}>Cost</th>
          <th style={{ textAlign: "center" }}>{icons?.market}</th>
        </tr>
        <tr className="tooltip-delivery-total-row">
          <th></th>
          <th style={{ textAlign: "center", paddingRight: 8, top: stickyRowTop }}>{frmtNb(contract.costDone)}/{frmtNb(contract.costTotal)}</th>
          <th style={{ textAlign: "center", top: stickyRowTop }}>{frmtNb(contract.marketDone)}/{frmtNb(contract.marketTotal)}</th>
        </tr>
        {Number(contract.rewardTotal) > 0 ? (
          <>
            <tr className="tooltip-delivery-total-row">
              <th style={{ textAlign: "left", paddingRight: 8, top: 48 }}>{ticketName}</th>
              <th style={{ textAlign: "center", paddingRight: 8, top: 48 }} colSpan={2}>
                {frmtNb(contract.rewardDone)}/{frmtNb(contract.rewardTotal)}
                {Number(contract.bonusReward) > 0 ? ` (+${frmtNb(contract.bonusReward)})` : ""}
              </th>
            </tr>
            <tr className="tooltip-delivery-total-row">
              <th style={{ textAlign: "left", paddingRight: 8, top: stickyCostTop }}>{`Cost/${ticketName}`}</th>
              <th style={{ textAlign: "center", paddingRight: 8, top: stickyCostTop }}>{frmtNb(contract.costPerTicket)}</th>
              <th style={{ textAlign: "center", top: stickyCostTop }}>{frmtNb(contract.marketPerTicket)}</th>
            </tr>
          </>
        ) : null}
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.name}-${index}`}>
            <td style={{ padding: "2px 8px 2px 0" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <img src={row.img || icons?.fallback} alt="" title={row.name} style={{ width: 18, height: 18 }} />
                <span>{row.name}</span>
              </span>
            </td>
            <td style={{ textAlign: "center", paddingRight: 8 }}>{frmtNb(row.cost)}</td>
            <td style={{ textAlign: "center" }}>{frmtNb(row.market)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
