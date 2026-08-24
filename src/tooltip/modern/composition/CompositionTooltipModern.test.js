import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CompositionTooltipModern from "./CompositionTooltipModern.jsx";

test("uses the same composition presentation for multiple recipe items", () => {
  const html = renderToStaticMarkup(<CompositionTooltipModern contract={{
    initialSeason: "spring",
    items: [
      { itemName: "Paella", quantity: 2, costTree: { nodes: { Rice: { qty: 3 } } } },
      { itemName: "Crab", quantity: 1, yield: 2, costTree: { nodes: { Rod: { qty: 1 } } } },
    ],
  }} catalog={{ Rice: { image: "rice.png" }, Rod: { image: "rod.png" } }} />);
  expect(html).toContain("Paella");
  expect(html).toContain("Crab");
  expect(html).toContain("rice.png");
  expect(html).toContain("rod.png");
  expect(html).not.toContain("Final resources");
});

test("uses season icons instead of season labels", () => {
  const html = renderToStaticMarkup(<CompositionTooltipModern contract={{
    initialSeason: "spring",
    items: [{ itemName: "Cake", seasonalCostTree: {
      spring: { nodes: { Wheat: { qty: 1 } } },
      summer: { nodes: { Wheat: { qty: 2 } } },
    } }],
  }} />);
  expect(html).toContain("spring.webp");
  expect(html).toContain("summer.webp");
  expect(html).not.toContain(">spring<");
});

test("shows crustacean yield and tool information", () => {
  const html = renderToStaticMarkup(<CompositionTooltipModern contract={{ items: [{
    itemName: "Crab", quantity: 4, yield: 1.5, toolName: "Crab Pot", toolImage: "pot.png",
    costTree: { nodes: { Wood: { qty: 1 } } },
  }] }} />);
  expect(html).toContain("Creates ×6");
  expect(html).toContain("pot.png");
});
