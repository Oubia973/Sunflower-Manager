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

  test("renders Buy as the backend-selected sourcing mode", () => {
    const html = render({
      isPurchased: true,
      purchaseFlower: 0.25,
    });

    expect(html).toContain("You buy this item for 0.25");
    expect(html).not.toContain("Production cost");
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
