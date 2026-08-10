import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GainHTooltipDetails from "./GainHTooltipDetails.jsx";
import BalanceTooltipDetails from "./BalanceTooltipDetails.jsx";

test("renders the authoritative hourly contract without deriving harvest per hour", () => {
  const html = renderToStaticMarkup(<GainHTooltipDetails contract={{
    itemName: "Sunflower", itemImage: "sunflower.png", growTime: "02:00:00",
    harvestAverage: 20, harvestPerHour: 10, gainPerHour: 1.5,
  }} icons={{}} />);
  expect(html).toContain("Harvest/h:");
  expect(html).toContain("x10");
  expect(html).toContain("Gain/h:");
});

test("renders backend withdrawal values without recomputing tax", () => {
  const html = renderToStaticMarkup(<BalanceTooltipDetails contract={{
    balances: { sfl: 200, gems: 5 },
    conversions: { gemsRatio: 0.1, gemsSflValue: 0.5, balanceUsd: 50 },
    withdrawal: { taxPercent: 17.5, taxFreeSfl: 50, withdrawableSfl: 173.75, withdrawableUsd: 43.4375 },
  }} icons={{}} />);
  expect(html).toContain("withdraw tax : 17.50%");
  expect(html).toContain("withdraw 173.75");
});
