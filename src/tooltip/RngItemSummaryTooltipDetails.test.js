import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RngItemSummaryTooltipDetails from "./RngItemSummaryTooltipDetails.jsx";

test("renders a compact item PRNG summary", () => {
  const html = renderToStaticMarkup(<RngItemSummaryTooltipDetails contract={{
    name: "Rough Tree",
    image: "/tree.webp",
    actionLabel: "harvests",
    variants: [{
      name: "Rough Tree",
      tier: 1,
      counter: 229810,
      rules: [{
        name: "Money Tree",
        chance: 1,
        effectLabel: "200 Coins",
        img: "/money.webp",
        realized: { actions: 250, rate: 1.2 },
        procs: [{ counter: 1, distance: 16 }, { counter: 2, distance: 334 }],
      }],
    }],
  }} />);

  expect(html).toContain("Rough Tree");
  expect(html).toContain("T1 · Rough Tree");
  expect(html).toContain("Money Tree");
  expect(html).toContain("is-positive");
  expect(html).not.toContain("#229");
  expect(html).toContain("Real</small>");
  expect(html).toContain("Next in 16, 334 harvests");
  expect(html).not.toContain("generated from your farm PRNG");
});

test("does not repeat the item name for a single untiered variant", () => {
  const html = renderToStaticMarkup(<RngItemSummaryTooltipDetails contract={{
    name: "Kale Stew",
    variants: [{ name: "Kale Stew", tier: 0, rules: [] }],
  }} fallbackImage="na.webp" />);

  expect((html.match(/Kale Stew/g) || []).length).toBe(1);
});
