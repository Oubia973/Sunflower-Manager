import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ItemCostTooltipDetails from "./ItemCostTooltipDetails.jsx";

test("Item cost tooltip renders prepared totals without table lookups", () => {
  const html = renderToStaticMarkup(<ItemCostTooltipDetails
    contract={{ itemName: "Grub", itemImage: "grub.png", quantity: 2, totalCost: 0.4, totalMarket: 0.6 }}
    season="spring"
    renderSeasonButtons={() => null}
    setCompoTable={() => ({})}
    icons={{ fallback: "fallback.png", flower: <span>S</span>, market: <span>M</span> }}
  />);
  expect(html).toContain("Grub");
  expect(html).toContain("x2");
  expect(html).toContain("0.4");
  expect(html).toContain("0.6");
});
