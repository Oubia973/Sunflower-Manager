import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InventoryFinancialModern from "./InventoryFinancialModern.jsx";

test("renders the prepared market contract without recalculating unit data", () => {
  const html = renderToStaticMarkup(<InventoryFinancialModern context="market" contract={{
    quantity: 2, grossUnit: 0.3, taxUnit: 0.03, productionUnit: 0.1,
    profitUnit: 0.17, profitWithoutCostUnit: 0.27, profitMultiplier: 2.7,
    profitPercent: 170, taxPercent: 10, includeProductionCost: true,
  }} />);
  expect(html).toContain("0.6");
  expect(html).toContain("0.06");
  expect(html).toContain("0.2");
  expect(html).toContain("0.34");
  expect(html).toContain("170% return");
});

test("presents nested production costs as an expandable composition", () => {
  const html = renderToStaticMarkup(<InventoryFinancialModern context="costp" contract={{
    profitFlower: 1, profitMultiplier: 2, profitPercent: 100,
    harvestAveragePerNode: 1, productionCostFlower: 0.2,
    marketAfterTaxFlower: 1.2, taxPercent: 10,
    detail: { kind: "tool", toolName: "Axe", toolImage: "axe.png", costTree: { nodes: { Wood: { qty: 3, compoit: { Stone: { qty: 2 } } } } } },
  }} />);
  expect(html).toContain("Wood");
  expect(html).toContain("Expand all");
  expect(html).toContain("Final resources");
});

test("keeps the animal food composition and its totals", () => {
  const html = renderToStaticMarkup(<InventoryFinancialModern context="costp" compositionCatalog={{ Corn: { image: "corn.png" } }} contract={{
    profitFlower: 1, profitMultiplier: 2, profitPercent: 100,
    harvestAveragePerNode: 1, productionCostFlower: 0.2,
    marketAfterTaxFlower: 1.2, taxPercent: 10,
    detail: {
      kind: "animal", level: 3, foodName: "Mix", foodQuantity: 2,
      foodCostFlower: 0.4, foodMarketFlower: 0.6,
      costTree: { nodes: { Corn: { qty: 3, costUnit: 0.1, marketUnit: 0.2 } } },
    },
  }} />);
  expect(html).toContain("Mix Food");
  expect(html).toContain("mixed_grain_v2.webp");
  expect(html).toContain("Corn");
  expect(html).toContain("0.4");
  expect(html).toContain("0.6");
});

test("keeps animal harvest food items and the authoritative total", () => {
  const html = renderToStaticMarkup(<InventoryFinancialModern context="harvest" growing contract={{
    nodeKind: "sheep", taxPercent: 5,
    harvest: { growing: {
      quantity: 22, spots: { primary: 10 }, productionCostFlower: 0.227,
      marketAfterTaxFlower: 0.783, profitFlower: 0.556, profitMultiplier: 3.45, profitPercent: 245,
      isFree: false, detail: { kind: "animal", level: null, foodItems: [
        { name: "Barley", image: "barley.png", quantity: 28.86 },
        { name: "Kale", image: "kale.png", quantity: 44.89 },
      ] },
    } },
  }} />);
  expect(html).toContain("Barley");
  expect(html).toContain("28.86");
  expect(html).toContain("Kale");
  expect(html).toContain("44.89");
  expect(html).toContain("0.227");
});

test("keeps tool harvest quantity, cost, and components", () => {
  const html = renderToStaticMarkup(<InventoryFinancialModern context="harvest" contract={{
    nodeKind: "wood", taxPercent: 10,
    harvest: { average: {
      quantity: 10, yieldPerNode: 1, spots: { primary: 2, secondary: 1 },
      productionCostFlower: 0.4, marketAfterTaxFlower: 1, profitFlower: 0.6,
      profitMultiplier: 2.5, profitPercent: 150, isFree: false,
      detail: { kind: "tool", toolName: "Axe", toolImage: "axe.png", quantity: 2, costCoins: 100,
        components: [{ name: "Wood", image: "wood.png", quantity: 3 }] },
    } },
  }} />);
  expect(html).toContain("Axe");
  expect(html).toContain("100");
  expect(html).toContain("Wood");
  expect(html).toContain("summer_basic_ancient_tree");
});

test("explains a fruit tree cost as a lifecycle instead of merging harvests and cost", () => {
  const html = renderToStaticMarkup(<InventoryFinancialModern context="costp" contract={{
    nodeKind: "fruit", taxPercent: 10, harvestAveragePerNode: 4,
    productionCostFlower: 0.11, marketAfterTaxFlower: 0.9,
    profitFlower: 0.79, profitMultiplier: 8.18, profitPercent: 718,
    detail: { kind: "fruit", seedCostCoins: 400, harvestCount: 5,
      axeImage: "axe.png", axeCostCoins: 40, axeFree: false, inputCostFlower: 0.4 },
  }} />);
  expect(html).toContain("Tree setup cost");
  expect(html).toContain("Production over tree lifetime");
  expect(html).toContain("Harvests per tree");
  expect(html).toContain("Yield per harvest/node");
  expect(html).toContain("Allocated production cost");
  expect(html).not.toContain("Harvests per seed");
});

test("separates fruit harvest inputs, lifetime, and result", () => {
  const html = renderToStaticMarkup(<InventoryFinancialModern context="harvest" contract={{
    nodeKind: "fruit", taxPercent: 10,
    harvest: { average: {
      quantity: 24, yieldPerNode: 4, spots: { primary: 6 },
      productionCostFlower: 0.66, marketAfterTaxFlower: 2.4,
      profitFlower: 1.74, profitMultiplier: 3.64, profitPercent: 264, isFree: false,
      detail: { kind: "fruit", seedCostCoins: 2400, harvestCount: 5,
        toolImage: "axe.png", toolCostCoins: 240, toolFree: false },
    } },
  }} />);
  expect(html).toContain("Tree setup cost");
  expect(html).toContain("Harvests per tree");
  expect(html).toContain("This harvest");
  expect(html).toContain("Marketplace");
  expect(html).toContain("Estimated profit");
});
