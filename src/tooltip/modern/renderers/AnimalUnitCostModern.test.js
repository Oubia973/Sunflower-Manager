import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import createAnimalUnitCostContract from "../../animalUnitCostContract.js";
import AnimalUnitCostModern from "./AnimalUnitCostModern.jsx";

test("places the animal allocation after the composition total and before market", () => {
  const contract = createAnimalUnitCostContract({
    animal: "Cow", product: "Milk", productImage: "milk.png",
    displayedCost: 0.2, yieldPerCycle: 2.4,
    foodQty: 36, foodName: "Mix", foodCycleCost: 0.6, foodCycleMarketCost: 0.9,
    currentLvl: 3, buyCropsCostU: 0.3, marketCostU: 0.5, tradeTax: 10,
    allocationMode: 0,
    outputs: [
      { name: "Milk", quantity: 2.4, unitCost: 0.2 },
      { name: "Leather", quantity: 0.6, unitCost: 0.2 },
    ],
  });
  const html = renderToStaticMarkup(<AnimalUnitCostModern
    contract={{ ...contract, foodCostTree: { nodes: { Corn: { qty: 1, costUnit: 1 / 180, marketUnit: 1 / 120 } } } }}
    compositionCatalog={{ Corn: { image: "corn.png" } }}
  />);

  expect(contract.selectedAllocatedCost).toBeCloseTo(0.48);
  expect(contract.selectedAllocationShare).toBeCloseTo(0.8);
  expect(html).toContain("Allocation · By quantity");
  expect(html).toContain("Milk <strong>80%");
  expect(html).toContain("Leather <strong>20%");
  expect(html.indexOf("composition-tree__total")).toBeLessThan(html.indexOf("Allocation · By quantity"));
  expect(html.indexOf("Allocation · By quantity")).toBeLessThan(html.indexOf("Market</h3>"));
  expect(html).toContain("If food is bought");
  expect(html).toContain('alt="Milk"');
  expect(html).toContain('alt="Cow"');
  expect(html).toContain("×36");
});

test("explains the intentional full-cost allocation", () => {
  const contract = createAnimalUnitCostContract({
    animal: "Chicken", product: "Egg", displayedCost: 0.4, yieldPerCycle: 1,
    foodCycleCost: 0.4, marketCostU: 0.5, allocationMode: 2,
    outputs: [
      { name: "Egg", quantity: 1, unitCost: 0.4 },
      { name: "Feather", quantity: 0.2, unitCost: 2 },
    ],
  });
  const html = renderToStaticMarkup(<AnimalUnitCostModern contract={contract} />);
  expect(html).toContain("Full cost per product");
  expect(html).toContain("Egg <strong>100%");
  expect(html).toContain("Feather <strong>100%");
  expect(html).toContain("Full cycle cost is assigned to each product");
});
