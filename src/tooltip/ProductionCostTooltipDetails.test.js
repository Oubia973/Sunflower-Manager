import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProductionCostTooltipDetails from "./ProductionCostTooltipDetails.jsx";

test("Production cost tooltip renders a prepared Active/Try contract", () => {
  const html = renderToStaticMarkup(<ProductionCostTooltipDetails
    contract={{
      itemImage: "sunflower.png", nodeKind: "crop", harvestAveragePerNode: 2,
      productionCostFlower: 0.12, marketAfterTaxFlower: 0.27, taxPercent: 10,
      profitFlower: 0.15, profitMultiplier: 2.25, profitPercent: 125,
      isFree: false, isPurchased: false,
      detail: { kind: "crop", seedCostCoins: 100, oilQuantity: 1, oilCostCoins: 20, inputCostFlower: 0.12 },
    }}
    itemName="Sunflower"
    isPurchased={false}
    icons={{ fallback: "fallback.png", oil: "oil.png", nodes: { crop: "crop.png" }, coins: <span>C</span>, flower: <span>S</span>, market: <span>M</span> }}
    setCompoTable={() => ({})}
  />);
  expect(html).toContain("Sunflower cost");
  expect(html).toContain("Seed cost");
  expect(html).toContain("0.12");
  expect(html).toContain("0.27");
  expect(html).toContain("125%");
});
