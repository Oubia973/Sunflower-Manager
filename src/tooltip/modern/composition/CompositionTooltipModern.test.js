import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import CompositionTooltipModern from "./CompositionTooltipModern.jsx";
import ModernTooltip from "../ModernTooltip.jsx";

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

test("explains the average fish yield beside Rod composition", () => {
  const html = renderToStaticMarkup(<CompositionTooltipModern contract={{ items: [{
    itemName: "Aged Red Snapper", quantity: 10,
    averageYieldPerRod: 1.3, rodImage: "rod.png",
    costTree: { nodes: { Rod: { qty: 1 / 1.3 }, Salt: { qty: 3 } } },
  }] }} />);
  expect(html).toContain("average per");
  expect(html).toContain("rod.png");
  expect(html).toContain("Salt");
});

test("Delivery uses the shared modern shell and composition presentation", () => {
  const previousActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<ModernTooltip
    context="deliverycost"
    item="Blacksmith"
    contract={{ totalCost: 1.2, totalMarket: 1.8, rows: [{
      name: "Pizza", quantity: 3, cost: 1.2, market: 1.8, img: "pizza.png",
      composition: { items: [{ itemName: "Pizza", costTree: { nodes: { Cheese: { qty: 2 } } } }] },
    }] }}
  />));
  const html = container.innerHTML;
  expect(html).toContain("modern-tooltip--composition");
  expect(html).toContain("Delivery composition");
  expect(html).toContain("Pizza");
  expect(html).toContain("Cheese");
  expect(html).toContain("×6");
  expect(html).toContain("Total production");
  expect(html).toContain("Total market");
  expect(container.querySelector('[aria-label="Delivery totals"]')?.children).toHaveLength(2);
  expect(container.querySelectorAll('img[alt="Flower"]')).toHaveLength(2);
  expect(container.textContent).not.toContain("/icon/res/flowertoken.webp");
  act(() => root.unmount());
  container.remove();
  global.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
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

test("shows market fallbacks for every chum without composition data", () => {
  const html = renderToStaticMarkup(<CompositionTooltipModern contract={{ items: [
    { itemName: "Grape", itemImage: "grape.png", quantity: 5, totalCost: 0.2, totalMarket: 0.5 },
    { itemName: "Red Wiggler", itemImage: "worm.png", quantity: 3, totalCost: 0.3, totalMarket: 0.9 },
  ] }} />);
  expect(html).toContain("Grape");
  expect(html).toContain("Red Wiggler");
  expect(html).toContain("Prod.");
  expect(html).toContain("Market");
  expect(html).toContain("0.5");
  expect(html).toContain("0.9");
  expect(html).not.toContain("Composition unavailable");
});
