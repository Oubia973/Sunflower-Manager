import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import CrustaceanCostTooltipDetails from "./CrustaceanCostTooltipDetails.jsx";

test("Crustacean cost tooltip scales an authoritative cost tree for display", () => {
  let receivedQuantity = 0;
  const html = renderToStaticMarkup(
    <CrustaceanCostTooltipDetails
      contract={{
        itemImage: "crab.png",
        toolName: "Crab Pot",
        toolImage: "pot.png",
        yield: 1.5,
        costTree: { nodes: { "Crab Pot": { qty: 1 } } },
      }}
      itemName="Crab"
      quantity={4}
      setCompoTable={(_, quantity) => {
        receivedQuantity = quantity;
        return { table: <div>Backend tree</div> };
      }}
      fallbackImage="fallback.png"
    />
  );

  expect(receivedQuantity).toBe(4);
  expect(html).toContain("x6 created");
  expect(html).toContain("Crab Pot");
});
