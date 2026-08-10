import React from "react";
import { frmtNb } from "../fct.js";

export default function DeliveryRatioTooltipDetails({ contract, itemName, icons }) {
  if (!contract || typeof contract !== "object") return null;
  const fromName = contract.from || itemName || "";
  const isTotal = contract.type === "total";

  return (
    <>
      <div><b>{isTotal ? "Deliveries Ratio (Total)" : `Delivery Ratio (${fromName})`}</b></div>
      <div>Coins to SFL conversion: {frmtNb(contract.rewardCoins)}{icons?.coins} = {frmtNb(contract.rewardSfl)}{icons?.flower}</div>
      <div>{frmtNb(contract.rewardCoins)}{icons?.coins} / {frmtNb(contract.cost)}{icons?.flower} = <b>{frmtNb(contract.ratio)}</b> {icons?.coins} for 1{icons?.flower}</div>
      <div>{frmtNb(contract.rewardCoins)}{icons?.coins} / {frmtNb(contract.market)}{icons?.market} = <b>{frmtNb(contract.ratioMarket)}</b> {icons?.coins} for 1{icons?.flower}</div>
      {!contract.isCoinsReward ? <div>Note: ratio applies to deliveries with Coins reward.</div> : null}
    </>
  );
}
