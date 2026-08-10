import React from "react";
import { ColorValue, convTime, frmtNb } from "../fct.js";

export function CropMachineDailyTooltipDetails({ contract, itemName, icons }) {
  if (!contract || typeof contract !== "object") return null;
  const itemIcon = <img src={contract.itemImage || icons?.fallback} alt={itemName} style={{ width: 22, height: 22 }} />;
  const oilIcon = <img src={icons?.oil || icons?.fallback} alt="Oil" style={{ width: 20, height: 20 }} />;
  const multiplier = contract.profitMultiplier === null ? Infinity : Number(contract.profitMultiplier || 0);
  const percent = contract.profitPercent === null ? "∞" : `${frmtNb(contract.profitPercent)}%`;
  return <>
    <div>{itemIcon} {itemName} daily</div>
    <div>Grow time: {contract.growTime || "00:00:00"} (1 pack of {frmtNb(contract.packSeeds)} seeds)</div>
    <div>Seed stock: {frmtNb(contract.seedStock)}</div>
    <div>Harvest/day: {frmtNb(contract.cycles)} full packs</div>
    <div>Harvest average {itemIcon}x{frmtNb(contract.harvestPerBatch)} (1 pack)</div>
    <div>Harvest total by day {itemIcon}x{frmtNb(contract.harvestPerDay)} (24h machine)</div>
    <div>Seeds x{frmtNb(contract.seedsPerBatch)} x {frmtNb(contract.cycles)} = {frmtNb(contract.seedsPerDay)} ({frmtNb(contract.seedCostPerDay)}{icons?.flower}, 1 pack: {frmtNb(contract.seedCostPerBatch)}{icons?.flower})</div>
    <div>Oil/day: {oilIcon}x{frmtNb(contract.oilPerDay)} ({frmtNb(contract.oilCostPerDay)}{icons?.flower})</div>
    {contract.dailyRestock > 0
      ? contract.restockCostEnabled
        ? <div>Restock: {icons?.gem}x15 x{frmtNb(contract.dailyRestock)} = {frmtNb(contract.dailyRestockGems)}{icons?.gem} ({frmtNb(contract.dailyRestockSfl)}{icons?.flower})</div>
        : <div>Restock needed: {frmtNb(contract.dailyRestock)}</div>
      : null}
    <div>Production cost/day: {frmtNb(contract.costPerDay)}{icons?.flower}</div>
    <div>Marketplace{icons?.market}-{frmtNb(contract.taxPercent)}% tax {frmtNb(contract.marketPerDay)}{icons?.flower}</div>
    <div>Profit {frmtNb(contract.profitPerDay)}{icons?.flower} <span style={{ color: ColorValue(multiplier) }}>{percent}</span></div>
  </>;
}

export function CropMachineGainTooltipDetails({ contract, itemName, icons }) {
  if (!contract || typeof contract !== "object") return null;
  const itemIcon = <img src={contract.itemImage || icons?.fallback} alt={itemName} style={{ width: 22, height: 22 }} />;
  return <>
    <div>{itemIcon} {itemName} gain/h</div>
    <div>Grow time: {contract.growTime || "00:00:00"}</div>
    <div>Cost/pack: {frmtNb(contract.costPerPack)}{icons?.flower}</div>
    <div>Marketplace/pack {icons?.market}: {frmtNb(contract.marketPerPack)}{icons?.flower}</div>
    <div>Profit/pack: {frmtNb(contract.profitPerPack)}{icons?.flower}</div>
    <div>Gain/h: <span style={{ color: ColorValue(Number(contract.gainPerHour || 0), 0, 10) }}>{frmtNb(contract.gainPerHour)}{icons?.flower}</span></div>
  </>;
}

export function CropMachineQueueTooltipDetails({ contract, itemName, icons }) {
  if (!contract || typeof contract !== "object") return null;
  const traces = Array.isArray(contract.traces) ? contract.traces : [];
  const itemIcon = <img src={contract.itemImage || icons?.fallback} alt={itemName} style={{ width: 22, height: 22 }} />;
  return <>
    <div>{itemIcon} {itemName} daily queue simulation</div>
    <div>24h fixed window, queue chained in order, then repeated from start if time remains.</div>
    <div>Target seeds/pack: {frmtNb(contract.requestedSeeds)} | Seed stock: {frmtNb(contract.stockSeeds)}</div>
    <div>Restock mode: {contract.autoRefill ? "Auto refill by time" : `Max ${frmtNb(contract.maxRestocks)} restock(s)`}{contract.restockCostEnabled ? "" : " | restock cost not counted"}</div>
    {traces.length < 1 ? <div>No run simulated for this pack in the 24h window.</div> : null}
    {traces.map((trace, index) => <div key={`cm-queue-${index}`} style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
      <div>Pass {frmtNb(trace.cycle || (index + 1))}: {convTime(Number(trace.startAt || 0))} - {convTime(Number(trace.endAt || 0))}</div>
      <div>Seeds: {frmtNb(trace.seedsUsed)} / {frmtNb(trace.requestedSeeds)}{trace.truncated ? " (truncated at 24h)" : trace.stockLimited ? " (reduced by stock/restock)" : ""}</div>
      <div>Harvest: {frmtNb(trace.harvest)} | Cost: {frmtNb(trace.cost)}{icons?.flower} | Profit: {frmtNb(trace.profit)}{icons?.flower}</div>
      <div>Stock before: {frmtNb(trace.availableBeforeRestock)} | Restocks added: {frmtNb(trace.restocksAdded)}{Number(trace.restockCost) > 0 ? ` | Restock cost: ${frmtNb(trace.restockCost)} SFL` : ""}</div>
    </div>)}
  </>;
}
