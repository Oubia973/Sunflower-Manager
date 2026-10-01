import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
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

test("Delivery expands the shared composition at the requested quantity", () => {
  const previousActEnvironment = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<DeliveryCostTooltipDetails contract={{
    totalCost: 1.2,
    totalMarket: 1.8,
    rows: [{
      name: "Pizza", quantity: 3, cost: 1.2, market: 1.8,
      composition: { items: [{ itemName: "Pizza", quantity: 3, costTree: {
        nodes: { Cheese: { qty: 2, compoit: { Milk: { qty: 6 } } } },
      } }] },
    }],
  }} icons={{}} />));

  expect(container.textContent).not.toContain("Cheese");
  act(() => container.querySelector('[aria-label="Show Pizza components"]').click());
  expect(container.textContent).toContain("Cheese");
  expect(container.textContent).toContain("×6");
  expect(container.textContent).toContain("Final resources");
  act(() => container.querySelector('[aria-label="Hide Pizza components"]').click());
  expect(container.textContent).not.toContain("Cheese");
  act(() => root.unmount());
  container.remove();
  global.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});
