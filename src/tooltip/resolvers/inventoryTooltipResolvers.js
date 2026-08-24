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

export function resolveProductionCostContract(dataSetFarm, itemName, forTry = false) {
  const roots = selectTooltipDataBlocks(dataSetFarm)
    .map((block) => block?.productionCosts)
    .filter(isObject);
  const entries = roots.map((root) => root?.items?.[itemName]).filter(isObject);
  const contract = mergeSharedMode(entries.at(-1), forTry);
  const meta = roots.find((root) => isObject(root?._meta))?._meta || {};
  return contract ? { ...contract, taxPercent: meta.taxPercent } : null;
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
