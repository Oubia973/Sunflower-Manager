import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FishCostTooltipDetails from "./FishCostTooltipDetails.jsx";

test("Fish cost tooltip renders the selected backend alternative", () => {
  let selectedTree = null;
  const html = renderToStaticMarkup(
    <FishCostTooltipDetails
      contract={{
        itemImage: "tuna.png",
        rodImage: "rod.png",
        averageYield: 2,
        unitCost: 0.2,
        unitMarket: 0.3,
        unitCostWithChum: 0.245,
        unitMarketWithChum: 0.36,
        chumCostTree: { totalCost: 0.09, totalMarket: 0.12, nodes: { Barley: { qty: 3 } } },
      }}
      sharedContract={{
        rodCostTree: { totalCost: 0.4, totalMarket: 0.6, nodes: { Rod: { qty: 1 } } },
      }}
      itemName="Tuna"
      quantity={2}
      includeChum={true}
      setCompoTable={(_, __, options) => {
        selectedTree = options.costTree;
        return { table: <div>Backend tree</div> };
      }}
      icons={{ fallback: "fallback.png", flower: <span>SFL</span>, market: <span>Market</span> }}
    />
  );

  expect(selectedTree.nodes.Rod.qty).toBe(1);
  expect(selectedTree.nodes.Barley.qty).toBe(3);
  expect(html).toContain("x2 average per");
  expect(html).toContain("production cost 0.49");
  expect(html).toContain("0.72");
});
