import React from "react";
import { frmtNb, Timer } from "../fct.js";

const BuildCraftTooltipDetails = ({ contract, fallbackImage }) => {
  const rows = Array.isArray(contract?.rows) ? contract.rows : [];
  if (!contract || rows.length === 0) return <div>Building production details unavailable.</div>;

  return <>
    <div>
      <img src={contract.buildingImage || fallbackImage} alt={contract.buildingName || ""} style={{ width: "22px", height: "22px" }} />
      {" "}{contract.buildingName}
    </div>
    <div>{rows.map((row, index) => <div key={`${row.name}-${index}`}>
      <img src={row.image || fallbackImage} className="resicon" alt={row.name || ""} />
      {(row.alwaysShowAmount || Number(row.amount) > 1) ? `x${frmtNb(row.amount)} ` : ""}
      {row.showName ? row.name : ""}
      {Number(row.readyAt) > 0 ? <> ready in <Timer timestamp={row.readyAt} /></> : null}
    </div>)}</div>
  </>;
};

export default BuildCraftTooltipDetails;
