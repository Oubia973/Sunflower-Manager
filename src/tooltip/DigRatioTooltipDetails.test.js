import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DigRatioTooltipDetails from "./DigRatioTooltipDetails.jsx";
import { buildDigRatioContract } from "./digRatioContract.js";

test("builds and renders a Dig ratio from backend values without recalculating it", () => {
  const contract = buildDigRatioContract({
    itemName: "Vase",
    mode: "try",
    currency: "sfl",
    coinsRatio: 1000,
    row: {
      shared: { itemImage: "vase.png", quantityToday: 2 },
      try: { digValueCoins: 500, toolCostCoins: 250, ratioCoinsPerSfl: 2000 },
    },
  });
  expect(contract.digValue).toBe(0.5);
  expect(contract.toolCost).toBe(0.25);
  expect(contract.ratioCoinsPerSfl).toBe(2000);
  const html = renderToStaticMarkup(<DigRatioTooltipDetails
    contract={contract}
    icons={{ coins: "coins", flower: "flower" }}
  />);
  expect(html).toContain("Vase ratio");
  expect(html).toContain("digged value today: 0.5");
  expect(html).toContain("ratio: 2000");
});

test("renders the total pattern explanation from the precomputed total contract", () => {
  const contract = buildDigRatioContract({
    itemName: "Total",
    mode: "active",
    currency: "coins",
    coinsRatio: 1000,
    isTotal: true,
    row: {
      shared: {},
      active: { patternValueCoins: 300, patternToolCostCoins: 75, patternRatioCoinsPerSfl: 4000 },
    },
  });
  const html = renderToStaticMarkup(<DigRatioTooltipDetails contract={contract} isPattern icons={{}} />);
  expect(html).toContain("Total ratio");
  expect(html).toContain("This is patterns values");
  expect(html).toContain("ratio: 4000");
});
