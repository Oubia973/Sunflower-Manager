import React from "react";
import { frmtNb } from "../fct.js";

export default function BoostTooltipDetails({ contract, fallbackImage }) {
  if (!contract || typeof contract !== "object") return <div>Boost details unavailable. Refresh this page.</div>;
  const itemIcon = <img src={contract.itemImage || fallbackImage} alt={contract.itemName || ""} style={{ width: "22px", height: "22px" }} />;
  let heading = <div>Boosts for {itemIcon}{contract.itemName}:</div>;
  if (contract.titleKind === "timechg") heading = <div>Boosts for {itemIcon}{contract.itemName} time:</div>;
  if (contract.titleKind === "yieldchg") heading = <div>Boosts for {itemIcon}{contract.itemName} yield:</div>;
  if (contract.titleKind === "costchg") heading = <div>Boosts for {itemIcon}{contract.itemName} cost:</div>;
  if (contract.titleKind === "yield") heading = <>
    <div>{itemIcon}{contract.itemName} yield : {frmtNb(contract.yieldValue)}</div>
    <div>{frmtNb(contract.harvestAverage)} average by node</div>
    <div>Boosts :</div>
  </>;
  if (contract.titleKind === "xp") heading = <>
    <div>{itemIcon}{contract.itemName} xp : {frmtNb(contract.xpValue)}</div>
    <div>Boosts :</div>
  </>;
  if (contract.titleKind === "petityield") heading = <>
    <div>{itemIcon}{contract.itemName} yield : {frmtNb(contract.yieldValue)}</div>
    <div>Boosts &amp; perks counted:</div>
  </>;
  const rows = Array.isArray(contract.rows) ? contract.rows : [];
  return <div>
    {heading}
    {rows.length > 0 ? rows.map((row, index) => <div key={`${row.name}-${index}`}>
      <img src={row.image || fallbackImage} alt={row.name || ""} style={{ width: "22px", height: "22px" }} />
      {row.name} : {row.boost}
    </div>) : <div>No boosts for this item.</div>}
  </div>;
}
