import { selectCurrentProjection } from "../../utils/farmState.js";

const TOOLTIP_PAGE_KEYS = [
  "invData", "cookData", "mapData", "fishData", "bountyData", "deliveryData",
  "petData", "animalData", "craftData", "flowerData", "expandPageData", "tryNftData",
];

const isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);

export function selectTooltipDataBlocks(dataSetFarm) {
  if (!dataSetFarm) return [];
  return TOOLTIP_PAGE_KEYS
    .map((pageKey) => selectCurrentProjection(dataSetFarm, pageKey)?.tooltipData)
    .filter(isObject);
}

export function buildCompositionCatalog(dataSetFarm) {
  if (!dataSetFarm) return {};
  const tableRoots = [
    ...TOOLTIP_PAGE_KEYS.map((pageKey) => selectCurrentProjection(dataSetFarm, pageKey)?.itables),
    dataSetFarm.itables,
  ].filter(isObject);
  const catalog = {};
  tableRoots.forEach((root) => Object.values(root).forEach((table) => {
    if (!isObject(table)) return;
    Object.entries(table).forEach(([name, entry]) => {
      if (!isObject(entry)) return;
      catalog[name] = {
        ...(catalog[name] || {}),
        image: entry.image || entry.img || entry.icon || catalog[name]?.image,
      };
    });
  }));
  return catalog;
}

function mergeSharedMode(entry, forTry) {
  const mode = entry?.[forTry ? "try" : "active"];
  return isObject(mode) ? { ...(isObject(entry.shared) ? entry.shared : {}), ...mode } : null;
}

export function resolveDailyProfitContract(dataSetFarm, itemName, forTry = false) {
  const entries = selectTooltipDataBlocks(dataSetFarm)
    .map((block) => block?.dailyProfit?.[itemName])
    .filter(isObject);
  return mergeSharedMode(entries.at(-1), forTry);
}

export function resolveProductionCostContract(dataSetFarm, itemName, forTry = false, options = {}) {
  const roots = selectTooltipDataBlocks(dataSetFarm)
    .map((block) => block?.productionCosts)
    .filter(isObject);
  const entries = roots.map((root) => root?.items?.[itemName]).filter(isObject);
  const contract = mergeSharedMode(entries.at(-1), forTry);
  const meta = roots.find((root) => isObject(root?._meta))?._meta || {};
  if (!contract) return null;
  if (contract.detail?.kind !== "animal") return { ...contract, taxPercent: meta.taxPercent };

  const allocationMode = Number(options.allocationMode ?? 0);
  const animalName = contract.detail.animalName;
  const selectedRoot = [...roots].reverse().find((root) => isObject(root?.items?.[itemName])) || {};
  const outputs = Object.entries(selectedRoot.items || {})
    .map(([name, entry]) => ({ name, contract: mergeSharedMode(entry, forTry) }))
    .filter(({ contract: candidate }) => candidate?.detail?.kind === "animal" && candidate.detail.animalName === animalName)
    .map(({ name, contract: candidate }) => ({
      name,
      image: candidate.itemImage,
      quantity: Number(candidate.harvestAveragePerNode || 0),
      unitCost: Number(candidate.productionCostFlower || 0),
      allocatedCost: Number(candidate.productionCostFlower || 0) * Number(candidate.harvestAveragePerNode || 0),
    }));
  const selected = outputs.find((output) => output.name === itemName);
  const selectedAllocatedCost = selected?.allocatedCost || 0;
  const foodCycleCost = allocationMode === 2
    ? selectedAllocatedCost
    : outputs.reduce((total, output) => total + output.allocatedCost, 0);
  const allocatedOutputs = outputs.map((output) => ({
    ...output,
    share: foodCycleCost > 0 ? output.allocatedCost / foodCycleCost : 0,
  }));
  const allocationLabel = ["By quantity", "By market value", "Full cost per product"][allocationMode] || "By quantity";

  return {
    ...contract,
    taxPercent: meta.taxPercent,
    detail: {
      ...contract.detail,
      allocation: {
        allocationMode,
        allocationLabel,
        animalName,
        outputs: allocatedOutputs,
        productName: itemName,
        productImage: contract.itemImage,
        foodCycleCost,
        selectedAllocatedCost,
        selectedAllocationShare: foodCycleCost > 0 ? selectedAllocatedCost / foodCycleCost : 0,
        yieldPerCycle: Number(contract.harvestAveragePerNode || 0),
        productionCost: Number(contract.productionCostFlower || 0),
      },
    },
  };
}

export function resolveMarketComparisonContract(dataSetFarm, itemName, forTry = false, options = {}) {
  const roots = selectTooltipDataBlocks(dataSetFarm)
    .map((block) => block?.marketComparisons)
    .filter(isObject);
  const entries = roots.map((root) => root?.items?.[itemName]).filter(isObject);
  const contract = mergeSharedMode(entries.at(-1), forTry);
  const meta = roots.find((root) => isObject(root?._meta))?._meta || {};
  if (!contract) return null;
  return {
    ...contract,
    taxPercent: meta.taxPercent,
    quantity: Number(options.quantity) || 1,
    includeProductionCost: !!options.includeProductionCost,
  };
}

export function resolveAnimalUnitCostContract(dataSetFarm, value, forTry = false) {
  if (!isObject(value)) return null;
  const foodName = value.foodName === "Mix Food" ? "Mix" : value.foodName;
  const mode = forTry ? "try" : "active";
  const feedCost = selectTooltipDataBlocks(dataSetFarm)
    .map((block) => block?.feedCosts?.[mode]?.[foodName])
    .find(isObject);
  return {
    ...value,
    foodCostTree: feedCost?.costTree || null,
  };
}

function mergedRoot(dataSetFarm, rootKey) {
  return Object.assign({}, ...selectTooltipDataBlocks(dataSetFarm)
    .map((block) => block?.[rootKey])
    .filter(isObject));
}

export function resolveCompositionTooltipContract(dataSetFarm, context, item, value, forTry = false) {
  const mode = forTry ? "try" : "active";
  const quantity = Number(isObject(value) ? value.qty : value) || 1;
  const itemNames = (Array.isArray(item) ? item : [item]).filter(Boolean);
  const initialSeason = String(
    selectCurrentProjection(dataSetFarm, "cookData")?.meta?.curSeason
      || selectCurrentProjection(dataSetFarm, "tryNftData")?.meta?.curSeason
      || dataSetFarm?.curSeason
      || "spring"
  ).toLowerCase();

  if (context === "costitem" && isObject(value) && Array.isArray(value.items)) {
    return { ...value, initialSeason: value.initialSeason || initialSeason };
  }

  if (context === "costitem" && isObject(value)) {
    return { items: [{ ...value, itemName: value.itemName || item, quantity: Number(value.quantity) || 1 }], initialSeason };
  }

  if (context === "cookcost" || context === "craftcompo") {
    const root = mergedRoot(dataSetFarm, "costBreakdowns");
    const items = itemNames.map((itemName) => {
      const entry = root?.[itemName];
      const resolved = mergeSharedMode(entry, forTry);
      return resolved ? { itemName, ...resolved, quantity: context === "craftcompo" ? 1 : quantity } : null;
    }).filter(Boolean);
    return items.length ? { items, initialSeason } : null;
  }

  if (context === "shrinecost") {
    const entry = mergedRoot(dataSetFarm, "shrineCosts")?.[item]?.[mode];
    return entry?.costTree ? { items: [{ itemName: item, ...entry, quantity }], initialSeason } : null;
  }

  if (context === "crustaceancost") {
    const crustacean = mergedRoot(dataSetFarm, "crustaceanCosts")?.[item]?.[mode];
    const sharedRod = mergedRoot(dataSetFarm, "fishCosts")?._shared?.[mode];
    const resolved = crustacean || (item === "Rod" && sharedRod?.rodCostTree ? {
      itemImage: sharedRod.rodImage,
      costTree: sharedRod.rodCostTree,
      yield: 1,
    } : null);
    return resolved ? { items: [{ itemName: item, ...resolved, quantity }], initialSeason } : null;
  }

  return null;
}
