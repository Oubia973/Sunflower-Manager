import React from "react";
import { frmtNb } from "../fct.js";

export default function SupplyTooltipDetails({ contract, fallbackImage }) {
  if (!contract) return null;
  return <>
    <div><img src={contract.itemImage || fallbackImage} alt={contract.itemName} style={{ width: 22, height: 22 }} /><b>{contract.itemName}</b> supply</div>
    <div>{frmtNb(contract.inventory)} in farms inventory</div>
    <div>{frmtNb(contract.listed)} listed</div>
    <div> - </div>
    <div>Not counted from farms inventory : </div>
    <div>{frmtNb(contract.inactive)} inactive (30 days)</div>
    <div>{frmtNb(contract.banned)} banned</div>
    <div> - </div>
    <div>{frmtNb(contract.onchain)} on chain total</div>
  </>;
}
