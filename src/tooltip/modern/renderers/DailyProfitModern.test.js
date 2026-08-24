import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DailyProfitModern from "./DailyProfitModern.jsx";

test("keeps production, burn, fruit by-product, animal, and market limit details", () => {
  const html = renderToStaticMarkup(<DailyProfitModern contract={{
    growTime: "08:00:00", stockLabel: "stock", stock: 12, cycles: 3,
    inputFarmHours: 24, restocks: 1, harvestAverage: 10, harvestDaily: 24,
    profitFlower: 1.8, profitMultiplier: 4, profitPercent: 300,
    productionCostFlower: 0.6, marketFlower: 2.4, tradeTaxPercent: 10,
    resourceBurn: { harvestBeforeTools: 30, burnedByTools: 6, harvestAfterTools: 24 },
    harvestSupplement: { woodQuantity: 2, woodImage: "wood.png", woodFlower: 0.1 },
    animal: { name: "Cow", level: 3, food: "Barley", foodImage: "barley.png", quantity: 36, costCoins: 600, costFlower: 0.6 },
    marketSaleLimit: { quantityPerWeek: 1, averageQuantityPerDay: 1 / 7, allocatedCostFlower: 0.05 },
  }} />);

  expect(html).toContain("Barley used");
  expect(html).toContain("Burned by tools");
  expect(html).toContain("Wood from replaced trees");
  expect(html).toContain("Sale limit");
  expect(html).toContain("/week");
  expect(html).toContain("Allocated cost");
});

test("explains fruit orchard renewal and separates fruit and wood revenue", () => {
  const html = renderToStaticMarkup(<DailyProfitModern contract={{
    item: "Apple", itemImage: "apple.png",
    growTime: "12:00:00", cycles: 2, inputFarmHours: 24, restocks: 0,
    harvestAverage: 12, harvestDaily: 24, nodes: [],
    profitFlower: 1.6, profitMultiplier: 4, profitPercent: 300,
    productionCostCoins: 100, productionCostFlower: 0.1,
    marketFlower: 1.7, tradeTaxPercent: 10,
    production: { kind: "fruit", harvestCount: 5, seedQuantity: 6,
      seedCostCoins: 600, seedCostFlower: 0.6, toolName: "Axe",
      toolImage: "axe.png", toolQuantity: 6, toolCostCoins: 60,
      toolCostFlower: 0.06, toolFree: false, dailyAverageCycles: 0.4 },
    harvestSupplement: { marketFlower: 1.5, woodQuantity: 0.8,
      woodImage: "wood.png", woodFlower: 0.2 },
  }} />);
  expect(html).toContain("Harvests per tree");
  expect(html).toContain("apple.png");
  expect(html).toContain("Seeds per orchard renewal");
  expect(html).toContain("Axe per renewal");
  expect(html).toContain("Orchard renewals/day");
  expect(html).toContain("Allocated daily cost");
  expect(html).toContain("Fruit sales after tax");
  expect(html).toContain("Wood sales after tax");
  expect(html).toContain("Total daily sales");
  expect(html).not.toContain("Supplement");
});
