import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import RngRealizedTooltipDetails from "./RngRealizedTooltipDetails.jsx";

test("renders realized PRNG counts, counter range and activation warning", () => {
  const html = renderToStaticMarkup(<RngRealizedTooltipDetails contract={{
    sourceName: "Tough Tree",
    sourceImage: "tree.png",
    itemName: "Wood",
    variantName: "Sacred Tree",
    actionLabel: "chops",
    baseChance: 30,
    effectLabel: "+48",
    realized: {
      hits: 72,
      actions: 250,
      rate: 28.8,
      fromCounter: 400,
      toCounter: 649,
      activationHistoryKnown: false,
    },
  }} fallbackImage="na.png" />);

  expect(html).toContain("Tough Tree");
  expect(html).toContain("72 hits / 250 chops");
  expect(html).toContain("#400–#649");
  expect(html).toContain("Past activation is unknown");
});
