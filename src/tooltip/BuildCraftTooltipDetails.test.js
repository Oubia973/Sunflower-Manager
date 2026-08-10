import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import BuildCraftTooltipDetails from "./BuildCraftTooltipDetails.jsx";

test("renders backend-normalized building production rows", () => {
  const html = renderToStaticMarkup(<BuildCraftTooltipDetails contract={{
    buildingName: "Compost Bin",
    buildingImage: "bin.png",
    rows: [
      { name: "Sprout Mix", amount: 1, image: "mix.png", readyAt: Date.now() + 10000 },
      { name: "Earthworm", amount: 3, image: "worm.png", readyAt: 0, showName: true, alwaysShowAmount: true },
    ],
  }} fallbackImage="na.png" />);

  expect(html).toContain("Compost Bin");
  expect(html).toContain("mix.png");
  expect(html).toContain("ready in");
  expect(html).toContain("x3 Earthworm");
});

test("shows an explicit unavailable state without consulting tables", () => {
  const html = renderToStaticMarkup(<BuildCraftTooltipDetails contract={null} fallbackImage="na.png" />);
  expect(html).toContain("details unavailable");
});
