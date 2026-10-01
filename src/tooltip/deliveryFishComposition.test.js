import { buildDeliveryFishComposition } from "./deliveryFishComposition.js";

const shared = { rodCostTree: {
  totalCost: 0.1,
  totalMarket: 0.2,
  nodes: { Rod: { qty: 1, costTotal: 0.1, marketTotal: 0.2, compoit: {
    Wood: { qty: 2, costTotal: 0.04, marketTotal: 0.08 },
  } } },
} };
const fish = {
  averageYield: 2,
  unitCost: 0.05,
  unitMarket: 0.1,
  unitCostWithChum: 0.07,
  unitMarketWithChum: 0.13,
  chumCostTree: { totalCost: 0.04, totalMarket: 0.06, nodes: {
    Corn: { qty: 3, costTotal: 0.04, marketTotal: 0.06 },
  } },
};

test("Delivery scales Rod by fish yield and includes chum only when selected", () => {
  const withoutChum = buildDeliveryFishComposition({ fish, shared, quantity: 10, includeChum: false });
  expect(withoutChum.cost).toBeCloseTo(0.5);
  expect(withoutChum.market).toBeCloseTo(1);
  expect(withoutChum.costTree.nodes.Rod.qty * 10).toBeCloseTo(5);
  expect(withoutChum.costTree.nodes.Rod.compoit.Wood.qty * 10).toBeCloseTo(10);
  expect(withoutChum.costTree.nodes.Corn).toBeUndefined();

  const withChum = buildDeliveryFishComposition({ fish, shared, quantity: 10, includeChum: true });
  expect(withChum.cost).toBeCloseTo(0.7);
  expect(withChum.market).toBeCloseTo(1.3);
  expect(withChum.costTree.nodes.Corn.qty * 10).toBeCloseTo(15);
});

test("Aged fish adds Salt to the same component and total contract", () => {
  const aged = buildDeliveryFishComposition({
    fish, shared, quantity: 10, includeChum: false,
    saltQuantity: 3, saltUnitCost: 0.01, saltUnitMarket: 0.02,
  });
  expect(aged.cost).toBeCloseTo(0.8);
  expect(aged.market).toBeCloseTo(1.6);
  expect(aged.costTree.nodes.Salt.qty * 10).toBe(30);
  expect(aged.costTree.totalCost * 10).toBeCloseTo(aged.cost);
  expect(aged.costTree.totalMarket * 10).toBeCloseTo(aged.market);
});
