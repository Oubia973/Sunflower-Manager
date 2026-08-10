import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityMaxTooltipDetails, ActivityXpTooltipDetails } from "./ActivityTooltipDetails.jsx";
import DailyBurnTooltipDetails from "./DailyBurnTooltipDetails.jsx";
import { buildActivityXpTooltipContract } from "./activityTooltipContract.js";

test("prepares sorted XP rows before the visual tooltip", () => {
  const contract = buildActivityXpTooltipContract("TODAY", 30, {
    Soup: { qty: 2, xpUnit: 5, xpTotal: 10 },
    Cake: { qty: 1, xpUnit: 20, xpTotal: 20 },
  }, (name) => `${name}.png`);
  expect(contract.rows.map((row) => row.dish)).toEqual(["Cake", "Soup"]);
  const html = renderToStaticMarkup(<ActivityXpTooltipDetails contract={contract} />);
  expect(html.indexOf("Cake")).toBeLessThan(html.indexOf("Soup"));
  expect(html).toContain("Cake.png");
});

test("renders the prepared activity maximum breakdown", () => {
  const html = renderToStaticMarkup(<ActivityMaxTooltipDetails contract={{ date: "TOTAL", got: 5, max: 10, gotChest: 1, chest: 2 }} />);
  expect(html).toContain("TOTAL");
  expect(html).toContain("Daily chest");
  expect(html).toContain("Got / Max");
});

test("renders a Daily Burn contract without deriving its total", () => {
  const html = renderToStaticMarkup(<DailyBurnTooltipDetails contract={{ burn: 2, dailyCycles: 3, harvest: 4, totalHarvested: 12 }} />);
  expect(html).toContain("Total harvested: 12");
  expect(html).toContain("Burn: 2");
});
