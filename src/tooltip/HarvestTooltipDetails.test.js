import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HarvestTooltipDetails from "./HarvestTooltipDetails.jsx";

test("Harvest tooltip switches between prepared average and growing scenarios", () => {
  const contract = {
    itemImage: "sunflower.png", nodeKind: "crop", taxPercent: 10,
    isPurchased: false,
    harvest: {
      average: { quantity: 20, yieldPerNode: 2, spots: { primary: 10 }, productionCostFlower: 1, marketAfterTaxFlower: 3, profitFlower: 2, profitMultiplier: 3, profitPercent: 200, isFree: false, detail: { kind: "crop", seedCostCoins: 1000, oilQuantity: 0, oilCostCoins: 0 } },
      growing: { quantity: 6, yieldPerNode: 2, spots: { primary: 3 }, productionCostFlower: 0.3, marketAfterTaxFlower: 0.9, profitFlower: 0.6, profitMultiplier: 3, profitPercent: 200, isFree: false, detail: { kind: "crop", seedCostCoins: 300, oilQuantity: 0, oilCostCoins: 0 } },
    },
  };
  const icons = { fallback: "fallback.png", nodes: { crop: "crop.png" }, coins: <span>C</span>, flower: <span>S</span>, market: <span>M</span> };
  const average = renderToStaticMarkup(<HarvestTooltipDetails contract={contract} itemName="Sunflower" growing={false} isPurchased={false} icons={icons} />);
  const growing = renderToStaticMarkup(<HarvestTooltipDetails contract={contract} itemName="Sunflower" growing isPurchased={false} icons={icons} />);
  expect(average).toContain("harvest average");
  expect(average).toContain("x20");
  expect(growing).toContain("growing");
  expect(growing).toContain("x6.00");
  expect(growing).toContain("0.9");
});

test("Harvest tooltip hides production details for a backend-marked free harvest", () => {
  const html = renderToStaticMarkup(<HarvestTooltipDetails
    contract={{ itemImage: "wood.png", nodeKind: "wood", taxPercent: 10, harvest: { average: {
      quantity: 10, yieldPerNode: 1, spots: { primary: 10 }, productionCostFlower: 0,
      marketAfterTaxFlower: 1, profitFlower: 1, profitMultiplier: null, profitPercent: null,
      isFree: true, detail: { kind: "tool", toolName: "Axe", quantity: 1, costCoins: 100 },
    } } }}
    itemName="Wood"
    growing={false}
    isPurchased={false}
    icons={{ fallback: "fallback.png", nodes: { wood: "tree.png" }, flower: <span>S</span>, market: <span>M</span> }}
  />);
  expect(html).not.toContain("Your production cost");
  expect(html).toContain("Profit");
});
