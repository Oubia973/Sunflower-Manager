import {
  buildCompositionCatalog,
  resolveDailyProfitContract,
  resolveMarketComparisonContract,
  resolveCompositionTooltipContract,
  resolveProductionCostContract,
} from "./inventoryTooltipResolvers.js";

const farm = {
  invData: {
    tooltipData: {
      dailyProfit: { Sunflower: { shared: { image: "sun.png" }, active: { profit: 1 }, try: { profit: 2 } } },
      productionCosts: {
        _meta: { taxPercent: 10 },
        items: { Sunflower: { shared: { itemImage: "sun.png" }, active: { productionCostFlower: 0.1 }, try: { productionCostFlower: 0.2 } } },
      },
      marketComparisons: {
        _meta: { taxPercent: 10 },
        items: { Sunflower: { shared: { grossUnit: 0.3 }, active: { profitUnit: 0.2 }, try: { profitUnit: 0.1 } } },
      },
    },
  },
};

test("resolves shared Active and Try inventory tooltip contracts", () => {
  expect(resolveDailyProfitContract(farm, "Sunflower", true)).toMatchObject({ image: "sun.png", profit: 2 });
  expect(resolveProductionCostContract(farm, "Sunflower", false)).toMatchObject({ itemImage: "sun.png", productionCostFlower: 0.1, taxPercent: 10 });
  expect(resolveMarketComparisonContract(farm, "Sunflower", true, { quantity: 3, includeProductionCost: true }))
    .toMatchObject({ grossUnit: 0.3, profitUnit: 0.1, taxPercent: 10, quantity: 3, includeProductionCost: true });
});

test("normalizes cooking and direct item compositions to the same contract", () => {
  const cookingFarm = {
    cookData: { tooltipData: { costBreakdowns: {
      Paella: { shared: { itemImage: "paella.png" }, active: { costTree: { nodes: { Rice: { qty: 2 } } } } },
    } } },
  };
  expect(resolveCompositionTooltipContract(cookingFarm, "cookcost", "Paella", { qty: 3 }, false))
    .toMatchObject({ items: [{ itemName: "Paella", itemImage: "paella.png", quantity: 3 }] });
  expect(resolveCompositionTooltipContract({}, "costitem", "Rod", { costTree: { nodes: {} }, quantity: 2 }, false))
    .toMatchObject({ items: [{ itemName: "Rod", quantity: 2 }] });
});

test("builds a shared image catalog for composition renderers", () => {
  const catalog = buildCompositionCatalog({
    invData: { itables: { it: { Wood: { img: "wood.png" } } } },
    itables: { tool: { Axe: { img: "axe.png" } } },
  });
  expect(catalog).toMatchObject({ Wood: { image: "wood.png" }, Axe: { image: "axe.png" } });
});
