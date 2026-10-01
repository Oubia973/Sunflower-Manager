const finite = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function scaleNodes(nodes, quantityFactor, costFactor, marketFactor) {
  return Object.fromEntries(Object.entries(nodes || {}).map(([name, raw]) => {
    const node = { ...raw, qty: finite(raw?.qty) * quantityFactor };
    if (raw?.costTotal !== undefined) node.costTotal = finite(raw.costTotal) * quantityFactor * costFactor;
    if (raw?.marketTotal !== undefined) node.marketTotal = finite(raw.marketTotal) * quantityFactor * marketFactor;
    if (raw?.costUnit !== undefined) node.costUnit = finite(raw.costUnit) * costFactor;
    if (raw?.marketUnit !== undefined) node.marketUnit = finite(raw.marketUnit) * marketFactor;
    if (raw?.compoit) node.compoit = scaleNodes(raw.compoit, quantityFactor, costFactor, marketFactor);
    return [name, node];
  }));
}

function scalePerFish(tree, averageYield, targetCost, targetMarket) {
  if (!tree?.nodes) return {};
  const quantityFactor = 1 / averageYield;
  const baseCost = finite(tree.totalCost) * quantityFactor;
  const baseMarket = finite(tree.totalMarket) * quantityFactor;
  return scaleNodes(tree.nodes, quantityFactor,
    baseCost > 0 ? targetCost / baseCost : 1,
    baseMarket > 0 ? targetMarket / baseMarket : 1);
}

export function buildDeliveryFishComposition({ fish, shared, quantity, includeChum, saltQuantity = 0, saltUnitCost = 0, saltUnitMarket = 0 }) {
  if (!fish || !shared?.rodCostTree) return null;
  const averageYield = finite(fish.averageYield) || 1;
  const baseCost = finite(fish.unitCost);
  const baseMarket = finite(fish.unitMarket);
  const chumCost = includeChum ? finite(fish.unitCostWithChum) - baseCost : 0;
  const chumMarket = includeChum ? finite(fish.unitMarketWithChum) - baseMarket : 0;
  const saltCost = finite(saltQuantity) * finite(saltUnitCost);
  const saltMarket = finite(saltQuantity) * finite(saltUnitMarket);
  const unitCost = baseCost + chumCost + saltCost;
  const unitMarket = baseMarket + chumMarket + saltMarket;
  const nodes = {
    ...scalePerFish(shared.rodCostTree, averageYield, baseCost, baseMarket),
    ...(includeChum ? scalePerFish(fish.chumCostTree, averageYield, chumCost, chumMarket) : {}),
  };
  if (saltQuantity > 0) {
    nodes.Salt = {
      qty: finite(saltQuantity),
      costUnit: finite(saltUnitCost),
      marketUnit: finite(saltUnitMarket),
      costTotal: saltCost,
      marketTotal: saltMarket,
    };
  }
  return {
    cost: unitCost * quantity,
    market: (unitMarket > 0 ? unitMarket : unitCost) * quantity,
    costTree: { nodes, totalCost: unitCost, totalMarket: unitMarket },
    averageYield,
  };
}
