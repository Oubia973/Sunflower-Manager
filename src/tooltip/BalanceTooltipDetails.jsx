import React from "react";
import { frmtNb } from "../fct.js";

export default function BalanceTooltipDetails({ contract, icons }) {
  if (!contract) return null;
  const balances = contract.balances || {};
  const conversions = contract.conversions || {};
  const withdrawal = contract.withdrawal || {};
  return <>
    <div>{frmtNb(balances.gems)}{icons?.gem} : {frmtNb(conversions.gemsSflValue)}{icons?.flower} ({frmtNb(conversions.gemsRatio)}{icons?.flower}/{icons?.gem})</div>
    <div>{frmtNb(balances.mark)}{icons?.mark}</div>
    <div>{frmtNb(balances.loveCharm)}{icons?.loveCharm} {frmtNb(balances.cheer)}{icons?.cheer}</div>
    <div>{frmtNb(balances.potionTicket)}{icons?.potionTicket}</div>
    <div>{frmtNb(balances.treasureKey)}{icons?.treasureKey} {frmtNb(balances.rareKey)}{icons?.rareKey} {frmtNb(balances.luxuryKey)}{icons?.luxuryKey}</div>
    <div>{frmtNb(balances.sfl)}{icons?.flower} : {frmtNb(conversions.balanceUsd)}{icons?.usd}</div>
    <div>Your withdraw tax : {frmtNb(withdrawal.taxPercent)}%</div>
    <div>You have {frmtNb(withdrawal.taxFreeSfl)}{icons?.flower} tax free</div>
    <div>You can withdraw {frmtNb(withdrawal.withdrawableSfl)}{icons?.flower} : {frmtNb(withdrawal.withdrawableUsd)}{icons?.usd}</div>
  </>;
}
