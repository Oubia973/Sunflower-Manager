import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CropMachineDailyTooltipDetails, CropMachineGainTooltipDetails, CropMachineQueueTooltipDetails } from "./CropMachineTooltipDetails.jsx";

const icons = { fallback: "fallback.png", oil: "oil.png", flower: <span>S</span>, market: <span>M</span>, gem: <span>G</span> };

test("Crop Machine tooltips render prepared daily, gain and queue contracts", () => {
  const daily = renderToStaticMarkup(<CropMachineDailyTooltipDetails contract={{ packSeeds: 25, seedStock: 10, cycles: 2, harvestPerBatch: 50, harvestPerDay: 100, seedsPerBatch: 25, seedsPerDay: 50, seedCostPerDay: 1, seedCostPerBatch: 0.5, oilPerDay: 24, oilCostPerDay: 0.2, costPerDay: 1.2, marketPerDay: 3, profitPerDay: 1.8, profitMultiplier: 2.5, profitPercent: 150, taxPercent: 10 }} itemName="Sunflower" icons={icons} />);
  const gain = renderToStaticMarkup(<CropMachineGainTooltipDetails contract={{ costPerPack: 1, marketPerPack: 2, profitPerPack: 1, gainPerHour: 0.5 }} itemName="Sunflower" icons={icons} />);
  const queue = renderToStaticMarkup(<CropMachineQueueTooltipDetails contract={{ requestedSeeds: 10, stockSeeds: 20, autoRefill: false, maxRestocks: 1, restockCostEnabled: true, traces: [{ cycle: 1, seedsUsed: 10, requestedSeeds: 10, harvest: 20, cost: 1, profit: 2 }] }} itemName="Sunflower" icons={icons} />);
  expect(daily).toContain("150%");
  expect(gain).toContain("Gain/h");
  expect(queue).toContain("Pass 1");
});
