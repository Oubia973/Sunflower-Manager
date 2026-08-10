import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MarketComparisonTooltipDetails from "./MarketComparisonTooltipDetails.jsx";

test("Marketplace tooltip scales backend unit values without recalculating tax", () => {
  const html = renderToStaticMarkup(
    <MarketComparisonTooltipDetails
      contract={{
        itemImage: "sunflower.png",
        grossUnit: 0.3,
        taxUnit: 0.03,
        productionUnit: 0.1,
        profitUnit: 0.17,
        profitWithoutCostUnit: 0.27,
        profitMultiplier: 2.7,
        profitPercent: 170,
      }}
      taxPercent={10}
      itemName="Sunflower"
      quantity={2}
      includeProductionCost={true}
      icons={{ fallback: "fallback.png", market: <span>Market</span>, flower: <span>SFL</span> }}
    />
  );

  expect(html).toContain("Marketplace");
  expect(html).toContain("sunflower.png");
  expect(html).toContain("0.6");
  expect(html).toContain("Trade tax 10% 0.06");
  expect(html).toContain("production cost 0.2");
  expect(html).toContain("Profit 0.34");
  expect(html).toContain("170%");
});
