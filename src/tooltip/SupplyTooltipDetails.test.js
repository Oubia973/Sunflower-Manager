import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SupplyTooltipDetails from "./SupplyTooltipDetails.jsx";
import { buildSupplyTooltipContract } from "./supplyTooltipContract.js";

test("builds the supply tooltip from the exact TryNFT row", () => {
  const contract = buildSupplyTooltipContract("Bear", {
    img: "bear.png", supply: 100, inv: 80, listed: 5, inactive: 4, banned: 1, onchain: 110,
  });
  expect(contract.inventory).toBe(80);
  const html = renderToStaticMarkup(<SupplyTooltipDetails contract={contract} />);
  expect(html).toContain("Bear");
  expect(html).toContain("80 in farms inventory");
  expect(html).toContain("110 on chain total");
});

test("falls back to supply only when the inventory counter is absent", () => {
  expect(buildSupplyTooltipContract("Shirt", { supply: 50 }).inventory).toBe(50);
  expect(buildSupplyTooltipContract("Shirt", { supply: 50, inv: 0 }).inventory).toBe(0);
});
