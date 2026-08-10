import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import createAnimalUnitCostContract from "./animalUnitCostContract.js";
import AnimalUnitCostTooltipDetails from "./AnimalUnitCostTooltipDetails.jsx";

test("Animal unit tooltip renders a final page contract and shared Mix tree", () => {
  const contract = createAnimalUnitCostContract({ animal: "Cow", product: "Milk", productImage: "milk.png", displayedCost: 0.2, yieldPerCycle: 2, foodQty: 1, foodName: "Mix", foodImage: "mix-contract.png", foodCycleCost: 0.4, foodCycleMarketCost: 0.6, currentLvl: 3, buyCropsCostU: 0.3, marketCostU: 0.5, tradeTax: 10 });
  const html = renderToStaticMarkup(<AnimalUnitCostTooltipDetails
    contract={contract}
    feedCostContract={{ costTree: { totalCost: 0.4, nodes: { Corn: { qty: 1 } } } }}
    icons={{ fallback: "fallback.png", mix: "mix.png", animals: { Cow: "cow.png" }, flower: <span>S</span>, market: <span>M</span> }}
    setCompoTable={() => ({ table: <div>Mix breakdown</div> })}
  />);
  expect(contract.profit).toBeCloseTo(0.3);
  expect(html).toContain("Mix breakdown");
  expect(html).toContain("milk.png");
  expect(html).toContain("150%");
});
