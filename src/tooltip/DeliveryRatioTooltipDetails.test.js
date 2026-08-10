import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DeliveryRatioTooltipDetails from "./DeliveryRatioTooltipDetails.jsx";

test("Delivery ratio tooltip renders prepared ratios without recalculating them", () => {
  const html = renderToStaticMarkup(
    <DeliveryRatioTooltipDetails
      contract={{
        type: "row",
        from: "Blacksmith",
        isCoinsReward: true,
        rewardCoins: 100,
        rewardSfl: 0.1,
        cost: 0.05,
        market: 0.08,
        ratio: 2000,
        ratioMarket: 1250,
      }}
      icons={{ coins: <span>C</span>, flower: <span>S</span>, market: <span>M</span> }}
    />
  );

  expect(html).toContain("Delivery Ratio (Blacksmith)");
  expect(html).toContain("2000");
  expect(html).toContain("1250");
});
