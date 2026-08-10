import React from "react";
import { frmtNb } from "../fct.js";
import { imgna, imgconfirm } from "../constants/images.js";

const TradesTooltip = ({ contract }) => {
  const headerRows = Array.isArray(contract?.headerRows) ? contract.headerRows : [];
  const rows = Array.isArray(contract?.rows) ? contract.rows : [];
  const totals = Array.isArray(contract?.totals) ? contract.totals : [];
  if (rows.length === 0 && headerRows.length === 0) return <div>No trades available.</div>;

  if (rows.length === 0) {
    return <table className="tooltip-trades-table">
      <thead><tr><th className="tdcenterbrd">Item</th><th className="tdcenterbrd">Sold</th></tr></thead>
      <tbody>{headerRows.map((row, index) => <tr key={`${row.name}-${index}`}>
        <td className="tdcenterbrd"><img src={row.image || imgna} className="resicon" alt="" />{row.name}</td>
        <td className="tdcenterbrd">{row.sold ? <img src={imgconfirm} className="resicon" alt="" /> : ""}</td>
      </tr>)}</tbody>
    </table>;
  }

  return <table className="tooltip-trades-table">
    <thead><tr>
      <th className="tdcenterbrd">Item</th><th className="tdcenterbrd">Quantity</th>
      <th className="tdcenterbrd">Sold</th><th className="tdcenterbrd">Price</th>
      <th className="tdcenterbrd">Floor</th><th className="tdcenterbrd">Diff</th>
      <th className="tdcenterbrd">Date</th>
    </tr></thead>
    <tbody>{rows.map((row, index) => {
      const diff = row.marketDiffPercent === null ? "N/A" : `${Number(row.marketDiffPercent).toFixed(2)}%`;
      const diffStyle = Number(row.marketDiffPercent) > 20 ? { color: "red" } : {};
      return <tr key={`${row.itemName}-${index}`}>
        <td className="tdcenterbrd"><img src={row.itemImage || imgna} className="resicon" alt="" />{row.itemName}</td>
        <td className="tdcenterbrd">{row.quantity}</td>
        <td className="tdcenterbrd">{row.sold ? <img src={imgconfirm} className="resicon" alt="" /> : null}</td>
        <td className="tdcenterbrd">{frmtNb(row.price)}</td>
        <td className="tdcenterbrd">{frmtNb(row.marketPrice)}</td>
        <td className="tdcenterbrd" style={diffStyle}>{diff}</td>
        <td className="tdcenterbrd">{row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}</td>
      </tr>;
    })}</tbody>
    <tfoot>{totals.map((row, index, allRows) => {
      const bottom = `${(allRows.length - 1 - index) * 22}px`;
      return <tr key={row.type} className="tooltip-trades-total-row">
        <td className="tdcenterbrd" style={{ bottom }}>{row.label}</td>
        <td className="tdcenterbrd" style={{ bottom }}></td>
        <td className="tdcenterbrd" style={{ bottom }}>{frmtNb(row.soldPriceNet)}</td>
        <td className="tdcenterbrd" style={{ bottom }}>{frmtNb(row.priceNet)}</td>
        <td className="tdcenterbrd" style={{ bottom }}>{frmtNb(row.marketPriceNet)}</td>
        <td className="tdcenterbrd" style={{ bottom }}></td><td className="tdcenterbrd" style={{ bottom }}></td>
      </tr>;
    })}</tfoot>
  </table>;
};

export default TradesTooltip;
