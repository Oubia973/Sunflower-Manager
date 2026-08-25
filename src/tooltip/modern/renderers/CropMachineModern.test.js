import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CropMachineModern from "./CropMachineModern.jsx";

test("renders the modern Crop Machine hourly gain contract", () => {
  const html = renderToStaticMarkup(<CropMachineModern context="cmgainh" contract={{
    growTime: "01:30:00",
    costPerPack: 1,
    marketPerPack: 3,
    profitPerPack: 2,
    gainPerHour: 1.33,
  }} />);
  expect(html).toContain("Estimated hourly gain");
  expect(html).toContain("Production cost");
});

test("renders the modern Crop Machine daily contract", () => {
  const html = renderToStaticMarkup(<CropMachineModern context="cmdailysfl" contract={{
    cycles: 2,
    packSeeds: 20,
    seedStock: 10,
    harvestPerBatch: 40,
    harvestPerDay: 80,
    seedsPerDay: 40,
    seedCostPerDay: 1,
    oilPerDay: 24,
    oilCostPerDay: 0.2,
    dailyRestock: 1,
    dailyRestockGems: 15,
    dailyRestockSfl: 0.1,
    restockCostEnabled: true,
    costPerDay: 1.3,
    marketPerDay: 4,
    profitPerDay: 2.7,
    profitMultiplier: 3,
    profitPercent: 200,
    taxPercent: 10,
  }} />);
  expect(html).toContain("Estimated daily profit");
  expect(html).toContain("Restock cost");
  expect(html).toContain("1 restock");
  expect(html).toContain("Marketplace after 10% tax");
});
