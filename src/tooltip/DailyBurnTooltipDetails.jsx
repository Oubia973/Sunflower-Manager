import React from "react";
import { frmtNb } from "../fct.js";

export default function DailyBurnTooltipDetails({ contract }) {
  const value = contract || {};
  return <>
    <div>Daily cycles: {frmtNb(value.dailyCycles)}</div>
    <div>Harvest: {frmtNb(value.harvest)}</div>
    <div>Total harvested: {frmtNb(value.totalHarvested)}</div>
    <div>{Number(value.burn) > 0 ? `Burn: ${frmtNb(value.burn)}` : ""}</div>
  </>;
}
