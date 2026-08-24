import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import InventoryTooltipModern from "./InventoryTooltipModern.jsx";

test("renders inventory boost rows from the supplied contract", () => {
  const html = renderToStaticMarkup(<InventoryTooltipModern context="boostdetails" contract={{
    titleKind: "yield",
    yieldValue: 3,
    harvestAverage: 2,
    rows: [{ name: "Scarecrow", image: "scarecrow.png", boost: "+1 yield" }],
  }} />);
  expect(html).toContain("Scarecrow");
  expect(html).toContain("+1 yield");
  expect(html).toContain("Average/node");
});

test("renders concise column help", () => {
  const html = renderToStaticMarkup(<InventoryTooltipModern context="th" contract={{ key: "gainh" }} />);
  expect(html).toContain("Hourly gain");
  expect(html).toContain("Continuous 24/7 estimate");
});
