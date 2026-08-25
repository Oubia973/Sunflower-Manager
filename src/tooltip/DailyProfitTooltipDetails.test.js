import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import DailyProfitTooltipDetails from "./DailyProfitTooltipDetails.jsx";

const icons = {
  fallback: "fallback.png",
  node: <span>node</span>,
  coins: <span>coins</span>,
  flower: <span>SFL</span>,
  market: <span>market</span>,
  gem: <span>gems</span>,
};

function render(contract) {
  return renderToStaticMarkup(
    <DailyProfitTooltipDetails
      contract={contract}
      itemName="Milk"
      icons={icons}
    />
  );
}

describe("DailyProfitTooltipDetails", () => {
  test("renders the backend animal food quantity without recalculating it", () => {
    const html = render({
      growTime: "08:00:00",
      stockLabel: "stock",
      stock: 12,
      cycles: 3,
      inputFarmHours: 24,
      restocks: 1,
      harvestAverage: 2,
      harvestDaily: 12,
      productionCostFlower: 0.6,
      marketFlower: 2.4,
      profitFlower: 1.8,
      profitMultiplier: 4,
      profitPercent: 300,
      tradeTaxPercent: 10,
      itemImage: "milk.png",
      nodes: [{ quantity: 2, image: "cow.png" }],
      animal: {
        name: "Cow",
        level: 3,
        food: "Barley",
        foodImage: "barley.png",
        quantity: 36,
        costCoins: 600,
        costFlower: 0.6,
      },
    });

    expect(html).toContain("x36 cost 600");
    expect(html).toContain("Cow lvl3");
    expect(html).toContain("Profit 1.8");
    expect(html).toContain("barley.png");
    expect(html).toContain("cow.png");
  });

  test("keeps the normal details when Buy is the backend-selected sourcing mode", () => {
    const html = render({
      isPurchased: true,
      purchaseFlower: 0.25,
      growTime: "08:00:00",
      cycles: 3,
      inputFarmHours: 24,
      restocks: 1,
      harvestAverage: 2,
      harvestDaily: 6,
      productionCostFlower: 0.6,
      marketFlower: 2.4,
      profitFlower: 1.8,
      profitMultiplier: 4,
      profitPercent: 300,
      tradeTaxPercent: 10,
    });

    expect(html).toContain("Milk daily");
    expect(html).toContain("Grow time: 08:00:00");
    expect(html).toContain("Production cost");
    expect(html).not.toContain("You buy this item");
  });

  test("shows harvests before and after resources burned by tools", () => {
    const html = render({
      cycles: 3,
      inputFarmHours: 24,
      harvestAverage: 10,
      harvestDaily: 24,
      productionCostFlower: 0,
      marketFlower: 0,
      profitFlower: 0,
      profitMultiplier: null,
      profitPercent: null,
      tradeTaxPercent: 10,
      resourceBurn: {
        harvestBeforeTools: 30,
        burnedByTools: 6,
        harvestAfterTools: 24,
      },
    });

    expect(html).toContain("Harvest before tools");
    expect(html).toContain("Resources burned by tools");
    expect(html).toContain("Harvest after tools");
    expect(html).toContain("x30");
    expect(html).toContain("x6");
    expect(html).toContain("x24");
    expect(html).not.toContain("Harvest total by day");
  });

  test("explains the Obsidian weekly market limit", () => {
    const html = render({
      cycles: 1,
      inputFarmHours: 24,
      harvestAverage: 1,
      harvestDaily: 2,
      productionCostFlower: 0.7,
      marketFlower: 0.2,
      profitFlower: 0.15,
      profitMultiplier: 4,
      profitPercent: 300,
      tradeTaxPercent: 10,
      marketSaleLimit: {
        quantityPerWeek: 1,
        averageQuantityPerDay: 1 / 7,
        allocatedCostFlower: 0.05,
      },
    });

    expect(html).toContain("Market sale limit: 1 per week");
    expect(html).toContain("cost 0.05");
  });
});
