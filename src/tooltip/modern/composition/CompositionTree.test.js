import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CompositionTree, { flattenLeaves } from "./CompositionTree.jsx";

test("renders top-level composition rows collapsed with cost columns", () => {
  const html = renderToStaticMarkup(<CompositionTree quantity={2} costTree={{
    totalCost: 1.2,
    totalMarket: 1.8,
    nodes: { Rod: { qty: 1, costUnit: 0.5, marketUnit: 0.7, compoit: { Wood: { qty: 3 } } } },
  }} catalog={{ Rod: { image: "rod.png" }, Wood: { image: "wood.png" } }} />);
  expect(html).toContain("Rod");
  expect(html).toContain("rod.png");
  expect(html).toContain("×2");
  expect(html).toContain("Expand all");
  expect(html).toContain("Final resources");
  expect(html).toContain("Self production");
  expect(html).toContain("Marketplace");
  expect(html).not.toContain("wood.png");
});

test("presents the technical sfl component as Coins", () => {
  const html = renderToStaticMarkup(<CompositionTree costTree={{ nodes: { sfl: { qty: 50 } } }} />);
  expect(html).toContain("Coins");
  expect(html).toContain("coins.png");
  expect(html).not.toContain(">sfl<");
  expect(html).not.toContain("Structure");
});

test("scales authoritative node totals only by the requested display quantity", () => {
  const html = renderToStaticMarkup(<CompositionTree quantity={3} costTree={{ nodes: {
    Wood: { qty: 2, costTotal: 0.4, marketTotal: 0.6 },
  } }} />);
  expect(html).toContain("1.200");
  expect(html).toContain("1.800");
});

test("final resources do not multiply absolute child quantities by their parent", () => {
  const resources = flattenLeaves({
    Cheese: {
      qty: 3,
      compoit: {
        Milk: { qty: 9, costTotal: 0.03, marketTotal: 1.08 },
        Oil: { qty: 0.5, costTotal: 0.00336, marketTotal: 0.00336 },
      },
    },
    Honey: { qty: 5 },
    Oil: { qty: 6, costTotal: 0.0403, marketTotal: 0.0403 },
  });

  expect(resources.Milk.qty).toBe(9);
  expect(resources.Oil.qty).toBe(6.5);
  expect(resources.Honey.qty).toBe(5);
});
