import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DeliveryCostTooltipDetails from "./DeliveryCostTooltipDetails.jsx";

test("Delivery tooltip renders prepared rows and totals", () => {
  const html = renderToStaticMarkup(
    <DeliveryCostTooltipDetails
      contract={{
        totalCost: 0.4,
        totalMarket: 0.7,
        rows: [{ name: "Sunflower", displayName: "Sunflower", img: "sunflower.png", quantity: 2, cost: 0.4, market: 0.7 }],
      }}
      icons={{ fallback: "fallback.png", market: <span>Market</span> }}
      dragHandleProps={{}}
    />
  );

  expect(html).toContain("Sunflower");
  expect(html).toContain("0.4");
  expect(html).toContain("0.7");
});
