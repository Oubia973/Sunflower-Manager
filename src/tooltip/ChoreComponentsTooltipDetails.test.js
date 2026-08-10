import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ChoreComponentsTooltipDetails from "./ChoreComponentsTooltipDetails.jsx";
import { selectChoreComponentsContract } from "./choreComponentsContract.js";

test("selects and renders the authoritative Try chore component costs", () => {
  const contract = selectChoreComponentsContract({
    rows: {
      Wood: {
        shared: { itemImage: "wood.png", displayQuantity: 5, stock: 2, needed: 3 },
        active: { cost: 0.3, market: 0.6 },
        try: { cost: 0.15, market: 0.3 },
      },
    },
    totals: {
      active: { totalCost: 0.3, totalMarket: 0.6 },
      try: { totalCost: 0.15, totalMarket: 0.3 },
    },
  }, true);
  expect(contract.totalCost).toBe(0.15);
  expect(contract.rows[0].needed).toBe(3);
  const html = renderToStaticMarkup(<ChoreComponentsTooltipDetails contract={contract} icons={{}} />);
  expect(html).toContain("Wood");
  expect(html).toContain("wood.png");
  expect(html).toContain("0.15");
});

test("renders aged chore fish with a grayscale base fish icon", () => {
  const contract = selectChoreComponentsContract({
    rows: {
      "Aged Tuna": {
        shared: { itemImage: "tuna.png", isAged: true, displayQuantity: 1, stock: 0, needed: 1 },
        active: { cost: 0.14, market: 0.24 },
        try: { cost: 0.14, market: 0.24 },
      },
    },
    totals: { active: { totalCost: 0.14, totalMarket: 0.24 }, try: { totalCost: 0.14, totalMarket: 0.24 } },
  }, false);
  const html = renderToStaticMarkup(<ChoreComponentsTooltipDetails contract={contract} icons={{}} />);
  expect(html).toContain("Aged Tuna");
  expect(html).toContain("tuna.png");
  expect(html).toContain("grayscale(100%)");
});
