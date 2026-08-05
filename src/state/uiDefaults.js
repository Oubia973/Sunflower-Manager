/**
 * UI defaults and normalization logic.
 * Extracted from App.js to centralize UI state initialization.
 */

// Import column templates from constants
import {
  INV_COLUMNS_TEMPLATE,
  COOK_COLUMNS_TEMPLATE,
  FISH_COLUMNS_TEMPLATE,
  CRUSTA_COLUMNS_TEMPLATE,
  CROPMACHINE_COLUMNS_TEMPLATE,
  PET_PETS_COLUMNS_TEMPLATE,
  PET_SHRINES_COLUMNS_TEMPLATE,
  PET_COMPONENTS_COLUMNS_TEMPLATE,
  EXPAND_COLUMNS_TEMPLATE,
  ACTIVITY_COLUMNS_TEMPLATE,
  ACTIVITY_ITEM_COLUMNS_TEMPLATE,
  ACTIVITY_QUEST_COLUMNS_TEMPLATE,
  BUYNODES_COLUMNS_TEMPLATE,
  AUCTIONS_COLUMNS_TEMPLATE,
} from '../constants/tableColumns';

/**
 * Default UI state values.
 */
export const uiDefaults = {
  selectedInv: "home",
  selectedHomeMode: "current",
  selectedHomePriceMode: "prod",
  selectedCurr: "SFL",
  selectedQuant: "unit",
  selectedQuantCook: "quant",
  selectedQuantFish: "base",
  selectedQuantFishXp: "quant",
  selectedQuantCrusta: "unit",
  fishMode: "base",
  selectedCostCook: "trader",
  selectedQuantity: "farm",
  selectedQuantityCook: "farm",
  cookCategories: ["base", "honey", "cheese", "fish", "cake"],
  selectedAnimalLvl: "farm",
  selectedAnimalView: "animals",
  selectedReady: "when",
  selectedDsfl: "trader",
  selectedFromActivity: "today",
  selectedFromActivityDay: "today",
  selectedActivityTradeMetric: "quantity",
  selectedActivityTradeFilters: ["resources", "collectibles", "other"],
  selectedExpandType: "spring",
  selectedExpandAscension: 1,
  fromexpand: 1,
  toexpand: 16,
  selectedSeedsCM: "stock",
  selectedQuantFetch: "stock",
  activityDisplay: "item",
  selectedActivityQuestCategory: "Delivery",
  selectedDigCur: "sfl",
  selectedSeason: "all",
  selectedTrySeason: "all",
  selectedPChange: "3d",
  chapterCurrentTickets: 0,
  chapterDaysRemaining: "",
  chapterNpcSelection: {},
  chapterNpcCostOverride: {},
  chapterBountySelection: {},
  chapterBountyCostOverride: {},
  chapterBountyReplace: {},
  chapterBountyOverride: {},
  chapterBountyRewardType: "actual",
  chapterVipDone: false,
  chapterChoresEnabled: true,
  chapterChoreSelection: {},
  chapterChoresExpanded: false,
  chapterDeliveryExpanded: false,
  chapterPoppyExpanded: false,
  chapterPoppyCategorySelection: {},
  chapterCostMode: "prod",
  chapterCostType: "average",
  invSortBy: "none",
  invSortDir: "asc",
  cookSortBy: "none",
  cookSortDir: "asc",
  invCategories: ["crop", "resources", "animals", "fruit", "buildings"],
  petView: "pets",
  fishView: "fish",
  inputValue: "",
  inputKeep: 3,
  inputFromLvl: 1,
  inputToLvl: 30,
  inputFromAscension: 0,
  inputToAscension: 0,
  fromtolvltime: 0,
  fromtolvlxp: 0,
  TryChecked: false,
  CostChecked: true,
  BurnChecked: true,
  fromtoexpand: [],
  xHrvst: {},
  xHrvsttry: {},
  isOpen: {},
  customSeedCM: {},
  customQuantFetch: {},
  petFetchSelection: {},
  petFetchSelectionInitDone: false,
  petRequestSelection: {},
  petRequestSelectionInitDone: false,
  cstPrices: {},
  buyNodesQty: {},
  buyNodesTimeFromStock: false,
  buyNodesSubMode: "obsidian",
  buyNodesSubObsidian: 0,
  buyNodesBuyPerWeek: 1,
  buyNodesSplitStrategy: "short_time",
  tryProfileShareScope: ["nodes", "buy", "collectibles", "wearables", "craft", "buds", "skills", "shrines"],
  toCM: {},
  selectedHomeBlocks: {},
  selectedHomeItems: {},
  xListeCol: INV_COLUMNS_TEMPLATE,
  xListeColCook: COOK_COLUMNS_TEMPLATE,
  xListeColFish: FISH_COLUMNS_TEMPLATE,
  xListeColCrusta: CRUSTA_COLUMNS_TEMPLATE,
  xListeColCropMachine: CROPMACHINE_COLUMNS_TEMPLATE,
  xListeColPetPets: PET_PETS_COLUMNS_TEMPLATE,
  xListeColPetShrines: PET_SHRINES_COLUMNS_TEMPLATE,
  xListeColPetComponents: PET_COMPONENTS_COLUMNS_TEMPLATE,
  xListeColFlower: [
    ['Seed', 1],
    ['Flower name', 1],
    ['Breeding', 1],
    ['Quantity in bag', 1],
    ['Found', 1],
  ],
  xListeColBounty: [
    ['Item name', 1],
    ['Stock', 1],
    ['Value', 1],
    ['Today', 1],
    ['Value', 1],
    ['ToolCost', 1],
  ],
  xListeColAnimals: [
    ['Item name', 1],
    ['LVL', 1],
    ['Prod 1', 1],
    ['Prod 2', 1],
    ['Food', 1],
    ['Food Cost', 1],
    ['Food Cost P2P', 1],
    ['Prod 1 Cost', 1],
    ['Prod 1 Cost P2P', 1],
    ['Prod 2 Cost', 1],
    ['Prod 2 Cost P2P', 1],
    ['1 love', 1],
    ['2 love', 1],
  ],
  xListeColExpand: EXPAND_COLUMNS_TEMPLATE,
  xListeColActivity: ACTIVITY_COLUMNS_TEMPLATE,
  xListeColActivityItem: ACTIVITY_ITEM_COLUMNS_TEMPLATE,
  xListeColActivityQuest: ACTIVITY_QUEST_COLUMNS_TEMPLATE,
  xListeColBuyNodes: BUYNODES_COLUMNS_TEMPLATE,
  xListeColAuctions: AUCTIONS_COLUMNS_TEMPLATE,
};

/**
 * Normalize stored UI state to match current schema.
 * Handles backward compatibility for column configurations.
 */
export function normalizeUI(raw) {
  const next = { ...(raw || {}) };
  const currency = String(next.selectedCurr || "").trim().toUpperCase();
  next.selectedCurr = (currency === "FLOWER" || currency === "SFL" || currency === "")
    ? "SFL"
    : (currency === "POL" || currency === "MATIC")
      ? "MATIC"
      : currency === "USDC"
        ? "USDC"
        : "SFL";
  
  // Normalize Inventory columns
  const currentInvCols = Array.isArray(next.xListeCol) ? next.xListeCol : [];
  const normalizedInvCols = currentInvCols.length === 23
    ? currentInvCols.slice(1)
    : currentInvCols;
  next.xListeCol = INV_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(normalizedInvCols[i]) ? normalizedInvCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  next.selectedHomePriceMode = next.selectedHomePriceMode === "market" ? "market" : "prod";
  const fishQuantMode = String(next.selectedQuantFish || "").trim().toLowerCase();
  next.selectedQuantFish = (fishQuantMode === "aged" || fishQuantMode === "primeaged" || fishQuantMode === "base")
    ? fishQuantMode
    : "base";
  const fishQuantXpMode = String(next.selectedQuantFishXp || "").trim().toLowerCase();
  next.selectedQuantFishXp = fishQuantXpMode === "unit" ? "unit" : "quant";

  // Normalize Cook columns (legacy had 12 columns, now 13)
  const currentCookColsRaw = Array.isArray(next.xListeColCook) ? next.xListeColCook : [];
  const currentCookCols = currentCookColsRaw.length === 12
    ? [
      ...currentCookColsRaw.slice(0, 9),
      ['Oil', 1],
      currentCookColsRaw[9],
      currentCookColsRaw[10],
      currentCookColsRaw[11],
    ]
    : currentCookColsRaw;
  next.xListeColCook = COOK_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentCookCols[i]) ? currentCookCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Fish columns (legacy had 15 columns, now 14)
  const currentFishColsRaw = Array.isArray(next.xListeColFish) ? next.xListeColFish : [];
  const currentFishCols = currentFishColsRaw.length === 15
    ? [
      ...currentFishColsRaw.slice(0, 2),
      ...currentFishColsRaw.slice(3),
    ]
    : currentFishColsRaw;
  next.xListeColFish = FISH_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentFishCols[i]) ? currentFishCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Crustacean columns
  const currentCrustaColsRaw = Array.isArray(next.xListeColCrusta) ? next.xListeColCrusta : [];
  const currentCrustaCols = currentCrustaColsRaw.length === 10
    ? [
      currentCrustaColsRaw[0],
      ...currentCrustaColsRaw.slice(2),
    ]
    : currentCrustaColsRaw;
  next.xListeColCrusta = CRUSTA_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentCrustaCols[i]) ? currentCrustaCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Expand columns (legacy had 5 columns, now 7)
  const currentExpandColsRaw = Array.isArray(next.xListeColExpand) ? next.xListeColExpand : [];
  const currentExpandCols = currentExpandColsRaw.length === 5
    ? [
      currentExpandColsRaw[0], // Level
      currentExpandColsRaw[1], // Bumpkin
      currentExpandColsRaw[2], // From/To
      currentExpandColsRaw[3], // Nodes
      currentExpandColsRaw[3], // Time (legacy was tied to Nodes)
      currentExpandColsRaw[4], // Resources
      currentExpandColsRaw[4], // Value (legacy was tied to Resources)
    ]
    : currentExpandColsRaw;
  next.xListeColExpand = EXPAND_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentExpandCols[i]) ? currentExpandCols[i] : null;
    const enabled = i === 0 ? 1 : (cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1]);
    return [tpl[0], enabled];
  });

  // Normalize Crop Machine columns
  const currentCropMachineCols = Array.isArray(next.xListeColCropMachine) ? next.xListeColCropMachine : [];
  next.xListeColCropMachine = CROPMACHINE_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentCropMachineCols[i]) ? currentCropMachineCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Pet columns
  const currentPetPetsCols = Array.isArray(next.xListeColPetPets) ? next.xListeColPetPets : [];
  next.xListeColPetPets = PET_PETS_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentPetPetsCols[i]) ? currentPetPetsCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  const currentPetShrinesCols = Array.isArray(next.xListeColPetShrines) ? next.xListeColPetShrines : [];
  next.xListeColPetShrines = PET_SHRINES_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentPetShrinesCols[i]) ? currentPetShrinesCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  const currentPetComponentsCols = Array.isArray(next.xListeColPetComponents) ? next.xListeColPetComponents : [];
  next.xListeColPetComponents = PET_COMPONENTS_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentPetComponentsCols[i]) ? currentPetComponentsCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Activity columns
  const currentActivityCols = Array.isArray(next.xListeColActivity) ? next.xListeColActivity : [];
  next.xListeColActivity = ACTIVITY_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentActivityCols[i]) ? currentActivityCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Activity Item columns (legacy had 9 columns)
  const currentActivityItemCols = Array.isArray(next.xListeColActivityItem) ? next.xListeColActivityItem : [];
  const normalizedLegacyActivityItemCols = currentActivityItemCols.length === 9
    ? [
      currentActivityItemCols[0],
      currentActivityItemCols[1],
      currentActivityItemCols[2],
      currentActivityItemCols[3],
      currentActivityItemCols[4],
      currentActivityItemCols[5],
      ['Niftyswap Price', 0],
      ['OpenSea Price', 0],
      currentActivityItemCols[6],
      [(currentActivityItemCols[7]?.[1] === 1 || currentActivityItemCols[8]?.[1] === 1) ? 'Devliveries Burn' : 'Devliveries Burn', (currentActivityItemCols[7]?.[1] === 1 || currentActivityItemCols[8]?.[1] === 1) ? 1 : 0],
    ]
    : currentActivityItemCols;
  next.xListeColActivityItem = ACTIVITY_ITEM_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(normalizedLegacyActivityItemCols[i]) ? normalizedLegacyActivityItemCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Activity Quest columns
  const currentActivityQuestCols = Array.isArray(next.xListeColActivityQuest) ? next.xListeColActivityQuest : [];
  next.xListeColActivityQuest = ACTIVITY_QUEST_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentActivityQuestCols[i]) ? currentActivityQuestCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Buy Nodes columns
  const currentBuyNodesCols = Array.isArray(next.xListeColBuyNodes) ? next.xListeColBuyNodes : [];
  next.xListeColBuyNodes = BUYNODES_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentBuyNodesCols[i]) ? currentBuyNodesCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize Auctions columns
  const currentAuctionsCols = Array.isArray(next.xListeColAuctions) ? next.xListeColAuctions : [];
  next.xListeColAuctions = AUCTIONS_COLUMNS_TEMPLATE.map((tpl, i) => {
    const cur = Array.isArray(currentAuctionsCols[i]) ? currentAuctionsCols[i] : null;
    const enabled = cur && (cur[1] === 1 || cur[1] === 0) ? cur[1] : tpl[1];
    return [tpl[0], enabled];
  });

  // Normalize buyNodes settings
  next.buyNodesSubMode = next.buyNodesSubMode === "week" ? "week" : "obsidian";
  next.buyNodesSubObsidian = Number.isFinite(Number(next.buyNodesSubObsidian))
    ? Math.max(0, Math.floor(Number(next.buyNodesSubObsidian)))
    : 0;
  next.buyNodesBuyPerWeek = Number.isFinite(Number(next.buyNodesBuyPerWeek))
    ? Math.max(1, Math.min(9, Math.floor(Number(next.buyNodesBuyPerWeek))))
    : 1;
  next.buyNodesSplitStrategy = (
    next.buyNodesSplitStrategy === "sunstone"
    || next.buyNodesSplitStrategy === "short_time"
  ) ? next.buyNodesSplitStrategy : "short_time";
  next.buyNodesTimeFromStock = !!next.buyNodesTimeFromStock;

  // Normalize activity display
  next.activityDisplay = (
    next.activityDisplay === "day"
    || next.activityDisplay === "item"
    || next.activityDisplay === "trades"
    || next.activityDisplay === "quest"
  ) ? next.activityDisplay : "item";

  // Normalize activity date ranges
  const allowedActivityRanges = new Set(["today", "1", "7", "31", "season"]);
  const normalizedSelectedFromActivity = allowedActivityRanges.has(String(next.selectedFromActivity || ""))
    ? String(next.selectedFromActivity)
    : "today";
  const normalizedSelectedFromActivityDay = allowedActivityRanges.has(String(next.selectedFromActivityDay || ""))
    ? String(next.selectedFromActivityDay)
    : normalizedSelectedFromActivity;
  next.selectedFromActivity = normalizedSelectedFromActivity;
  next.selectedFromActivityDay = normalizedSelectedFromActivityDay;

  next.selectedActivityTradeMetric = next.selectedActivityTradeMetric === "price" ? "price" : "quantity";
  
  const allowedActivityTradeFilters = new Set(["resources", "collectibles", "other"]);
  next.selectedActivityTradeFilters = (Array.isArray(next.selectedActivityTradeFilters) ? next.selectedActivityTradeFilters : [])
    .map((v) => String(v || "").toLowerCase())
    .filter((v) => allowedActivityTradeFilters.has(v));
  if (next.selectedActivityTradeFilters.length < 1) {
    next.selectedActivityTradeFilters = ["resources", "collectibles", "other"];
  }

  next.selectedTrySeason = (
    next.selectedTrySeason === "spring"
    || next.selectedTrySeason === "summer"
    || next.selectedTrySeason === "autumn"
    || next.selectedTrySeason === "winter"
    || next.selectedTrySeason === "all"
  ) ? next.selectedTrySeason : "all";

  const allowedTryProfileShareScope = new Set(["nodes", "buy", "collectibles", "wearables", "craft", "buds", "skills", "shrines"]);
  const normalizedTryProfileShareScope = (Array.isArray(next.tryProfileShareScope) ? next.tryProfileShareScope : [])
    .map((v) => {
      const key = String(v || "");
      if (key === "nft") return "collectibles";
      if (key === "wearable") return "wearables";
      return key;
    })
    .filter((v) => allowedTryProfileShareScope.has(v));
  next.tryProfileShareScope = normalizedTryProfileShareScope.length > 0
    ? normalizedTryProfileShareScope
    : ["nodes", "buy", "collectibles", "wearables", "craft", "buds", "skills", "shrines"];

  return next;
}
