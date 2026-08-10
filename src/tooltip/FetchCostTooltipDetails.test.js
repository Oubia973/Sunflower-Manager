import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FetchCostTooltipDetails from "./FetchCostTooltipDetails.jsx";

test("Fetch cost tooltip only renders its prepared view contract", () => {
  const html = renderToStaticMarkup(
    <FetchCostTooltipDetails
      itemName="Acorn"
      contract={{
        itemImage: "acorn.png",
        energyUnit: 20,
        quantity: 4,
        unitCost: 0.5,
        totalCost: 2,
        unitProdMarket: 0.75,
        totalProdMarket: 3,
        unitMarket: 1,
        totalMarket: 4,
        showAverageLine: false,
        displayProducers: [{
          petName: "Barkley",
          label: "Barkley",
          img: "dog.png",
          yieldBase: 2,
          reqCost: 1,
          reqEnergyTotal: 40,
          reqDetails: [{ name: "Sunflower Crunch", img: "food.png" }],
          costPerUnit: 0.5,
          marketPerUnit: 0.75,
        }],
      }}
      icons={{ fallback: "fallback.png", energy: "energy.png", flower: <span>SFL</span>, market: <span>Market</span> }}
    />
  );

  expect(html).toContain("Barkley");
  expect(html).toContain("acorn.png");
  expect(html).toContain("x1 cost 0.5");
  expect(html).toContain("Prod cost: 0.5");
  expect(html).toContain("= 4");
});
