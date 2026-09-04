import React, { useEffect, useRef, useState } from 'react';
import { useAppCtx } from "./context/AppCtx";
import { Switch, FormControlLabel, CircularProgress } from '@mui/material';
import CounterInput from "./counterinput.js";
import DList from "./dlist.jsx";
import { frmtNb, ColorValue, mergeFarmStateDeep, getOrCreateDeviceId, unpackFarmPayloadTables } from './fct.js';
import Help from './fhelp.js';
import TryProfileShareBar from "./components/TryProfileShareBar.jsx";
import TryProfileSummaryModal from "./components/TryProfileSummaryModal.jsx";
import Tooltip from "./tooltip.js";
import { getScopeTablesFromPayload } from "./tryProfileShare.js";
import { fetchJson } from "./services/apiClient.js";
import { buildSupplyTooltipContract } from "./tooltip/supplyTooltipContract.js";
import { buildBoostTooltipContract } from "./tooltip/boostTooltipContract.js";
import { readTryitSnapshot, writeTryitSnapshot, buildCanonicalTryitSnapshot, applyTryitSnapshotToFarmState, syncTryitStateAcrossFarmState, hasTryitPayloadContent, isValidTryitConfig } from "./tryitStorage.js";
import { collectChangedSkillLevels, mergeExplicitSkillLevels } from "./utils/quickTrySnapshot.js";
import {
  computeProfileSummaryPayload,
  buildBoostDisplayMaps,
} from "./tryProfileSummary.js";
import {
  BOOST_TYPE_ALIASES,
  normalizeToken,
  inferTypeTokens,
  inferCategoryTokens,
  buildItemCategoryIndex,
  resolveItemCategoryTokens as resolveTaxonomyItemCategoryTokens,
} from "./tryNftTaxonomy.js";
import {
  imgsfl,
  imgSFL,
  imgusdc,
  imgExchng,
  imgconfirm,
  imgcancel,
  imgrefresh,
  imgsearch,
  imgopensea,
  imglightning,
  imgcopy,
  imgsave,
  imgnoboosttry,
  imghorizontal,
  imgvertical,
  imgcrops,
  imgcropslightning,
  imgna,
  imgwinter,
  imgspring,
  imgsummer,
  imgautumn,
  imgcollectibleBear,
  imgredFarmerShirt,
  imghammer,
  imgbudSeedling,
  imgwarrior,
  imgshrine,
  imgcompost,
  imghelpTryNft,
  imgoptions,
} from "./constants/images.js";

let helpImage = imghelpTryNft;
const BOOST_TAB_KEYS = ["collectibles", "wearables", "craft", "buds", "skills", "shrines", "compost"];
const BOOST_CATEGORY_LABELS = {
  collectibles: "Collectibles",
  wearables: "Wearables",
  craft: "Craft",
  buds: "Buds",
  skills: "Skills",
  shrines: "Shrines",
  compost: "Fertilizer/Spice",
};
const BOOST_TAB_OPTIONS = BOOST_TAB_KEYS.map((value) => ({
  value,
  label: BOOST_CATEGORY_LABELS[value] || value,
  iconSrc: {
    collectibles: imgcollectibleBear,
    wearables: imgredFarmerShirt,
    craft: imghammer,
    buds: imgbudSeedling,
    skills: imgwarrior,
    shrines: imgshrine,
    compost: imgcompost,
  }[value] || null,
}));
const NFT_PRICE_COLUMN_OPTIONS = [
  { value: "opensea", label: "OpenSea", iconSrc: imgopensea },
  { value: "market", label: "Market", iconSrc: imgExchng?.props?.src },
  { value: "profiles", label: "Profiles", iconSrc: imgsave },
  { value: "share", label: "Share link", iconSrc: imgcopy },
  { value: "summary", label: "Summary", iconSrc: imgsearch },
];
const NFT_PRICE_UNIT_OPTIONS = [
  { value: "flower", label: "Flower", iconSrc: imgsfl },
  { value: "usdc", label: "USDC", iconSrc: imgusdc },
];
const NFT_TOTAL_COST_OPTIONS = [
  { value: "opensea", label: "OpenSea", iconSrc: imgopensea },
  { value: "market", label: "Market", iconSrc: imgExchng?.props?.src },
];
const TRYSET_SEASON_OPTIONS = [
  { value: "all", label: "Current" },
  { value: "spring", label: React.cloneElement(imgspring, { style: { width: "18px", height: "18px" } }) },
  { value: "summer", label: React.cloneElement(imgsummer, { style: { width: "18px", height: "18px" } }) },
  { value: "autumn", label: React.cloneElement(imgautumn, { style: { width: "18px", height: "18px" } }) },
  { value: "winter", label: React.cloneElement(imgwinter, { style: { width: "18px", height: "18px" } }) },
];
const TRY_REFRESH_BOOST_TABLES = ["nft", "nftw", "buildng", "skill", "skilllgc", "bud", "shrine"];
const TRY_REFRESH_ITEM_TABLES = ["it", "compost"];
const COMPOST_EXCLUSIVE_GROUPS = {
  crop: new Set(["Sprout Mix", "Rapid Root", "Sproutroot Surprise"]),
  fruit: new Set(["Fruitful Blend", "Turbofruit Mix"]),
  greenhouse: new Set(["Greenhouse Goodie", "Greenhouse Glow"]),
  animal: new Set(["Salt Lick", "Honey Treat"]),
};

function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function formatRankValues(values, formatter = (value) => formatCompactNumber(value)) {
  return values.map(formatter).join(" · ");
}

function formatSkillRankEffects(effect) {
  if (!effect || typeof effect !== "object") return "";
  const ranks = Array.isArray(effect.ranks) ? effect.ranks : [];
  const percent = (value) => `${formatCompactNumber(Number(value) * 100)}%`;
  const plus = (value) => `+${formatCompactNumber(value)}`;

  switch (effect.kind) {
    case "growthMultiplier":
    case "costMultiplier":
      return formatRankValues(ranks, (value) => `−${percent(1 - Number(value))}`);
    case "timeReduction":
      return formatRankValues(ranks, (value) => `−${percent(value)}`);
    case "additiveYield":
      return formatRankValues(ranks, plus);
    case "coinBonus":
    case "xpBonus":
      return formatRankValues(ranks, (value) => `+${percent(value)}`);
    case "chance":
    case "dropChance":
      return formatRankValues(ranks, (value) => `+${formatCompactNumber(value)}%`);
    case "cooldown":
      return formatRankValues(ranks, (value) => `${formatCompactNumber(Number(value) / 86400000)}d`);
    case "dailyLimit":
      return formatRankValues(ranks, plus);
    case "multiplier":
      return formatRankValues(ranks, (value) => `×${formatCompactNumber(value)}`);
    case "flatDebuff":
      return formatRankValues(ranks, (value) => `−${formatCompactNumber(value)}`);
    case "aoe":
      return formatRankValues(ranks, (value) => {
        const width = Number(value?.xLeft || 0) + Number(value?.xRight || 0) + 1;
        return `${width}×${formatCompactNumber(value?.depth)}`;
      });
    case "yieldWithDebuff":
      return `+${formatRankValues(effect.buff || [])} / −${formatRankValues(effect.debuff || [])}`;
    case "growthWithDebuff":
      return `−${formatRankValues(effect.buff || [], (value) => percent(1 - Number(value)))} / +${formatRankValues(effect.debuff || [], (value) => percent(Number(value) - 1))}`;
    case "costWithDebuff":
      return `cost −${formatRankValues(effect.buff || [], (value) => percent(1 - Number(value)))} / other animals +${formatRankValues(effect.debuff || [], (value) => percent(Number(value) - 1))}`;
    case "xpWithFeedDebuff":
      return `XP ×${formatRankValues(effect.xp || [])} / feed ×${formatRankValues(effect.feed || [])}`;
    case "sicknessWithSpread":
      return `sickness −${formatRankValues(effect.sickness || [], percent)} / spread ${formatRankValues(effect.spread || [])}`;
    case "yieldWithOilDebuff":
      return `yield +${formatRankValues(effect.yield || [])} / oil ×${formatRankValues(effect.oilMultiplier || [])}`;
    case "growthWithOilDebuff":
      return `growth −${formatRankValues(effect.growth || [], (value) => percent(1 - Number(value)))} / oil +${formatRankValues(effect.oilPenalty || [], percent)}`;
    case "rateWithGrowthDebuff":
      return `rate +${formatRankValues(effect.rate || [])} / growth +${formatRankValues(effect.growth || [], (value) => percent(Number(value) - 1))}`;
    case "oilReduction":
      return `oil −${formatRankValues(ranks, percent)}`;
    case "flatReduction":
      return `−${formatRankValues(ranks)}`;
    case "flatTimeBonus":
      return `+${formatRankValues(ranks, (value) => `${formatCompactNumber(Number(value) / 3600000)}h`)}`;
    case "productionRate":
      return `+${formatRankValues(ranks)}`;
    case "flatBonus":
      return formatRankValues(ranks, plus);
    case "stockBonus":
      return Object.entries(effect.ranks || {})
        .map(([item, values]) => `${item}: ${formatRankValues(values, plus)}`)
        .join("; ");
    case "frenziedFish":
      return `+${formatRankValues(effect.flat || [])} / crit ${formatRankValues(effect.crit || [], (value) => `${formatCompactNumber(value)}%`)}`;
    case "doubleNom":
      return `food +${formatRankValues(effect.food || [])} / ingredients ${formatRankValues(effect.ingredients || [])}`;
    default:
      // Show raw rank values for newly introduced effect kinds until a
      // dedicated, player-facing formatter is added.
      return ranks.length ? formatRankValues(ranks) : "";
  }
}

function getSkillLevelColor(level) {
  const safeLevel = Math.max(0, Math.floor(Number(level) || 0));
  if (safeLevel === 0) return "#8d8d8d";
  if (safeLevel === 1) return "#7ee787";
  if (safeLevel === 2) return "#79c0ff";
  return "#e3c55b";
}

function getInitialTryNftTableFlexDirection() {
  if (typeof window === "undefined") return "row";
  return window.innerWidth < 800 ? "column" : "row";
}
function getCompostExclusiveGroup(item, value = {}) {
  const name = String(item || "");
  const groupByName = Object.entries(COMPOST_EXCLUSIVE_GROUPS).find(([, items]) => items.has(name));
  if (groupByName) return groupByName[0];

  const boost = String(value?.boost || "").toLowerCase();
  if (boost.includes("animal")) return "animal";
  if (boost.includes("greenhouse")) return "greenhouse";
  if (boost.includes("fruit")) return "fruit";
  if (boost.includes("crop")) return "crop";
  return "";
}
function buildTryRefreshSignature(state, selectedSeason = "") {
  const boostables = state?.boostables || {};
  const parts = [];
  parts.push(`season:${String(selectedSeason || "all").toLowerCase()}`);
  TRY_REFRESH_BOOST_TABLES.forEach((tableName) => {
    const table = boostables?.[tableName] || {};
    Object.keys(table)
      .sort((a, b) => a.localeCompare(b))
      .forEach((itemName) => {
        const value = table[itemName] || {};
        const tryValue = tableName === "skill"
          ? Number(value?.leveltry ?? value?.level ?? 0)
          : Number(value?.tryit || 0);
        parts.push(`t:${tableName}:${itemName}:${tryValue}`);
      });
  });
  TRY_REFRESH_ITEM_TABLES.forEach((tableName) => {
    const table = state?.itables?.[tableName] || {};
    Object.keys(table)
      .sort((a, b) => a.localeCompare(b))
      .forEach((itemName) => {
        const item = table[itemName] || {};
        if (tableName === "it") {
          parts.push(`b:${itemName}:${Number(item?.buyit === 1)}`);
          parts.push(
            `s:${itemName}:${Number(item?.spottry ?? item?.spot ?? 0)}:${Number(item?.spot2try ?? item?.spot2 ?? 0)}:${Number(item?.spot3try ?? item?.spot3 ?? 0)}`
          );
          return;
        }
        parts.push(`i:${tableName}:${itemName}:${Number(item?.tryit === 1)}`);
      });
  });
  return parts.join("|");
}

function buildSkillBudgetRequestState(state = {}) {
  const activeLevels = {};
  const selectedLevels = {};
  const signatureParts = [];
  Object.entries(state?.boostables?.skill || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([name, skill]) => {
      const activeLevel = Math.max(0, Math.floor(Number(skill?.level || 0)));
      const selectedLevel = Math.max(0, Math.floor(Number(skill?.leveltry ?? skill?.level ?? 0)));
      if (activeLevel > 0) activeLevels[name] = activeLevel;
      if (activeLevel > 0 || selectedLevel > 0) selectedLevels[name] = selectedLevel;
      signatureParts.push(`${name}:${activeLevel}:${selectedLevel}`);
    });
  const availablePoints = Number(state?.skillUpgrade?.availablePoints || 0);
  const availableShards = Number(state?.skillUpgrade?.shards || 0);
  signatureParts.push(`budget:${availablePoints}:${availableShards}`);
  return {
    activeLevels,
    selectedLevels,
    availablePoints,
    availableShards,
    signature: signatureParts.join("|"),
  };
}

function ModalTNFT({ onClose }) {
  const {
    data: { dataSet, dataSetFarm, priceData },
    ui: {
      TryChecked,
      interfaceMode,
      selectedTrySeason,
      tryProfileShareScope,
    },
    actions: {
      handleUIChange,
      handleRefreshfTNFT,
    },
    config: { API_URL, tryitConfig },
  } = useAppCtx();
  const frmid = String(dataSet?.options?.farmId || dataSetFarm?.frmid || "");
  const deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}));
  const hasTryitConfig = isValidTryitConfig(tryitConfig);
  const withTryNftTables = (farmState = {}) => {
    const tryNftData = farmState?.tryNftData;
    if (!tryNftData || typeof tryNftData !== "object") return farmState || {};
    return {
      ...(farmState || {}),
      skillUpgrade: (
        tryNftData?.skillUpgrade && typeof tryNftData.skillUpgrade === "object"
          ? tryNftData.skillUpgrade
          : farmState?.skillUpgrade
      ) || {},
      trySummary: (
        tryNftData?.trySummary && typeof tryNftData.trySummary === "object"
          ? tryNftData.trySummary
          : farmState?.trySummary
      ) || {},
      itables: {
        ...(farmState?.itables || {}),
        ...(tryNftData?.itables || {}),
      },
      boostables: {
        ...(tryNftData?.boostables || {}),
        ...(farmState?.boostables || {}),
      },
    };
  };
  const preserveTryFlags = (nextState, sourceState) => {
    const target = deepClone(nextState || {});
    const source = sourceState || {};
    (tryitConfig?.boostTables || []).forEach((tableName) => {
      const targetTable = target?.boostables?.[tableName];
      const sourceTable = source?.boostables?.[tableName];
      if (!targetTable || !sourceTable) return;
      Object.keys(targetTable).forEach((itemName) => {
        if (!Object.prototype.hasOwnProperty.call(sourceTable, itemName)) return;
        targetTable[itemName] = {
          ...(targetTable[itemName] || {}),
          ...(tableName === "skill"
            ? {
              leveltry: Number(sourceTable[itemName]?.leveltry ?? sourceTable[itemName]?.level ?? 0),
              tryit: Number(sourceTable[itemName]?.leveltry ?? sourceTable[itemName]?.level ?? 0),
            }
            : { tryit: Number(sourceTable[itemName]?.tryit || 0) }),
        };
      });
    });
    Object.entries(tryitConfig?.itemTables || {}).forEach(([payloadKey, tableCfg]) => {
      const field = tableCfg?.field;
      const sources = Array.isArray(tableCfg?.sources) ? tableCfg.sources : [];
      if (!field || sources.length < 1) return;
      sources.forEach((sourcePath) => {
        const targetTable = String(sourcePath || "").split(".").reduce((acc, key) => (acc ? acc[key] : undefined), target);
        const sourceTable = String(sourcePath || "").split(".").reduce((acc, key) => (acc ? acc[key] : undefined), source);
        if (!targetTable || !sourceTable) return;
        Object.keys(targetTable).forEach((itemName) => {
          if (!Object.prototype.hasOwnProperty.call(sourceTable, itemName)) return;
          targetTable[itemName] = {
            ...(targetTable[itemName] || {}),
            [field]: Number(sourceTable[itemName]?.[field] || 0),
          };
        });
      });
    });
    return target;
  };
  const buildHydratedTryState = (farmState = dataSetFarm) => {
    const baseState = deepClone(withTryNftTables(farmState));
    if (!hasTryitConfig) return baseState;
    const snapshot = readTryitSnapshot(frmid);
    if (!snapshot || Object.keys(snapshot).length < 1) return baseState;
    return applyTryitSnapshotToFarmState(baseState, snapshot, tryitConfig);
  };
  const buildActiveTryState = (farmState = dataSetFarm) => deepClone(withTryNftTables(farmState));
  const persistTryState = (nextState, previousState = {}) => {
    if (!hasTryitConfig) return;
    const snapshot = mergeExplicitSkillLevels(
      buildCanonicalTryitSnapshot(nextState, tryitConfig) || {},
      collectChangedSkillLevels(previousState, nextState)
    );
    if (!hasTryitPayloadContent(snapshot)) {
      console.error("TRYIT snapshot write skipped: no explicit tryit fields found in TryNFT state.");
      return;
    }
    writeTryitSnapshot(snapshot, frmid);
  };
  const [dataSetLocal, setdataSetLocal] = useState(() => buildHydratedTryState());
  const boostTooltipIndex = dataSetLocal?.tryNftData?.tooltipData?.boostIndex || dataSetLocal?.tooltipData?.boostIndex || {};
  const dataSetLocalRef = useRef(dataSetLocal);
  dataSetLocalRef.current = dataSetLocal;
  const commitTryState = (nextState, refreshOptions, { preserveResetPending = false } = {}) => {
    if (!preserveResetPending) {
      resetToActivePendingRef.current = false;
    }
    isUserEditingRef.current = true;
    const syncedState = hasTryitConfig
      ? syncTryitStateAcrossFarmState(nextState, tryitConfig)
      : nextState;
    const previousState = dataSetLocalRef.current || {};
    dataSetLocalRef.current = syncedState;
    persistTryState(syncedState, previousState);
    setdataSetLocal(syncedState);
    handleRefreshfTNFT(dataSet, syncedState, refreshOptions);
  };
  const activeBaselineRef = useRef(buildActiveTryState());
  const resetToActivePendingRef = useRef(false);
  const isUserEditingRef = useRef(false);
  const hasTryNftTables = !!dataSetLocal?.boostables && !!dataSetLocal?.itables?.it;
  const [TotalCostDisplay, setTotalCostDisplay] = useState("market");
  const [tooltipData, setTooltipData] = useState(null);
  const handleTooltip = (item, context, value, event) => {
    const { clientX = 0, clientY = 0 } = event || {};
    setTooltipData({
      x: clientX,
      y: clientY,
      item,
      context,
      value,
      bdrag: true,
    });
  };
  const [tableFlexDirection, setTableFlexDirection] = useState(() => getInitialTryNftTableFlexDirection());
  const [tableView, setTableView] = useState('both');
  const [showHelp, setShowHelp] = useState(false);
  const [isApplyingTryset, setIsApplyingTryset] = useState(false);
  const [isClosingTryset, setIsClosingTryset] = useState(false);
  const applyingTrysetRef = useRef(false);
  const closingTrysetRef = useRef(false);
  const selectedTrySeasonRef = useRef(selectedTrySeason);
  selectedTrySeasonRef.current = selectedTrySeason;
  const [showTryRefreshHalo, setShowTryRefreshHalo] = useState(false);
  const [refreshBaselineSig, setRefreshBaselineSig] = useState("");
  const refreshBaselineSigRef = useRef(refreshBaselineSig);
  refreshBaselineSigRef.current = refreshBaselineSig;
  const [iTotBuyCheck, setTotBuyCheck] = useState(false);
  const [selectedBoostTab, setSelectedBoostTab] = useState("collectibles");
  const [boostTypeFilters, setBoostTypeFilters] = useState([]);
  const [boostCategoryFilters, setBoostCategoryFilters] = useState([]);
  const [nftPriceCols, setNftPriceCols] = useState(["market", "profiles", "share", "summary"]);
  const [nftPriceUnit, setNftPriceUnit] = useState("flower");
  const [summaryProfile, setSummaryProfile] = useState(null);
  const skillBudgetRequest = buildSkillBudgetRequestState(dataSetLocal);
  const [skillBudgetPreview, setSkillBudgetPreview] = useState(() => ({
    summary: dataSetLocal?.trySummary?.skills || null,
    signature: skillBudgetRequest.signature,
  }));
  const [isSkillBudgetLoading, setIsSkillBudgetLoading] = useState(false);
  const skillBudgetRequestSeqRef = useRef(0);
  const skillBudgetAbortRef = useRef(null);
  const currentRefreshSig = buildTryRefreshSignature(dataSetLocal, selectedTrySeason);
  const deviceId = getOrCreateDeviceId();
  function key(name) {
    if (name === "active") { return TryChecked ? "tryit" : "isactive"; }
    return TryChecked ? name + "try" : name;
  }
  const closeModal = async () => {
    if (applyingTrysetRef.current || closingTrysetRef.current) return;
    closingTrysetRef.current = true;
    setIsClosingTryset(true);
    await onClose(dataSet, dataSetLocalRef.current);
  };
  useEffect(() => {
    if (!dataSetFarm || Object.keys(dataSetFarm).length < 1) return;
    if (isUserEditingRef.current) return;
    const activeState = buildActiveTryState(dataSetFarm);
    const nextState = buildHydratedTryState(dataSetFarm);
    dataSetLocalRef.current = nextState;
    setdataSetLocal(nextState);
    activeBaselineRef.current = activeState;
    setRefreshBaselineSig(buildTryRefreshSignature(nextState, selectedTrySeason));
    setShowTryRefreshHalo(false);
  }, [dataSetFarm, frmid, tryitConfig]);
  useEffect(() => {
    if (!refreshBaselineSig && currentRefreshSig) {
      setRefreshBaselineSig(currentRefreshSig);
    }
  }, [refreshBaselineSig, currentRefreshSig]);
  useEffect(() => {
    if (!refreshBaselineSig || !currentRefreshSig) {
      setShowTryRefreshHalo(false);
      return;
    }
    setShowTryRefreshHalo(currentRefreshSig !== refreshBaselineSig);
  }, [refreshBaselineSig, currentRefreshSig]);
  useEffect(() => {
    const backendSummary = dataSetLocal?.trySummary?.skills;
    if (!backendSummary || currentRefreshSig !== refreshBaselineSig) return;
    setSkillBudgetPreview({
      summary: backendSummary,
      signature: skillBudgetRequest.signature,
    });
  }, [dataSetLocal?.trySummary?.skills, currentRefreshSig, refreshBaselineSig, skillBudgetRequest.signature]);
  useEffect(() => {
    if (selectedBoostTab !== "skills") {
      setIsSkillBudgetLoading(false);
      return undefined;
    }
    if (skillBudgetPreview.signature === skillBudgetRequest.signature && skillBudgetPreview.summary) {
      setIsSkillBudgetLoading(false);
      return undefined;
    }
    const requestId = ++skillBudgetRequestSeqRef.current;
    skillBudgetAbortRef.current?.abort?.();
    skillBudgetAbortRef.current = null;
    setIsSkillBudgetLoading(true);
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      skillBudgetAbortRef.current = controller;
      try {
        const summary = await fetchJson(API_URL, "/getskillbudgetcalc", {
          method: "POST",
          signal: controller.signal,
          timeoutMs: 10_000,
          body: {
            activeLevels: skillBudgetRequest.activeLevels,
            selectedLevels: skillBudgetRequest.selectedLevels,
            availablePoints: skillBudgetRequest.availablePoints,
            availableShards: skillBudgetRequest.availableShards,
          },
        });
        if (requestId !== skillBudgetRequestSeqRef.current) return;
        setSkillBudgetPreview({ summary, signature: skillBudgetRequest.signature });
      } catch (error) {
        if (requestId !== skillBudgetRequestSeqRef.current || error?.code === "REQUEST_CANCELLED") return;
        console.log(`Skill budget calculation error: ${error?.message || error}`);
      } finally {
        if (requestId === skillBudgetRequestSeqRef.current) setIsSkillBudgetLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      if (requestId === skillBudgetRequestSeqRef.current) {
        skillBudgetAbortRef.current?.abort?.();
        skillBudgetAbortRef.current = null;
      }
    };
  }, [
    API_URL,
    selectedBoostTab,
    skillBudgetPreview.signature,
    skillBudgetPreview.summary,
    skillBudgetRequest.signature,
  ]);
  const handleChangeTotalCostDisplay = (event) => {
    const selectedValue = event.target.value;
    setTotalCostDisplay(selectedValue);
  }
  const handleButtonHelpClick = () => {
    setShowHelp(true);
  };
  const handleCloseHelp = () => {
    setShowHelp(false);
  };
  const applyTryProfilePayload = (profilePayload) => {
    try {
      const fullProfile = (profilePayload?.fullProfile && typeof profilePayload.fullProfile === "object")
        ? profilePayload.fullProfile
        : null;
      if (fullProfile) {
        const nextDataSet = deepClone(dataSetLocal || {});
        const boostVals = (fullProfile?.boostables && typeof fullProfile.boostables === "object")
          ? fullProfile.boostables
          : {};
        Object.entries(nextDataSet?.boostables || {}).forEach(([tableName, table]) => {
          const srcVals = boostVals?.[tableName] || {};
          nextDataSet.boostables[tableName] = Object.fromEntries(
            Object.entries(table || {}).map(([itemName, value]) => [
              itemName,
              tableName === "skill"
                ? {
                  ...(value || {}),
                  leveltry: Number(srcVals?.[itemName] || 0),
                  tryit: Number(srcVals?.[itemName] || 0),
                }
                : { ...(value || {}), tryit: Number(srcVals?.[itemName] || 0) },
            ])
          );
        });
        const itemVals = (fullProfile?.items && typeof fullProfile.items === "object") ? fullProfile.items : {};
        const getByPath = (obj, path) => String(path || "").split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
        Object.entries(tryitConfig?.itemTables || {}).forEach(([payloadKey, cfg]) => {
          const field = cfg?.field;
          const sources = Array.isArray(cfg?.sources) ? cfg.sources : [];
          const vals = itemVals?.[payloadKey] || {};
          if (!field || sources.length < 1) return;
          sources.forEach((sourcePath) => {
            const table = getByPath(nextDataSet, sourcePath);
            if (!table || typeof table !== "object") return;
            Object.keys(table).forEach((itemName) => {
              if (!Object.prototype.hasOwnProperty.call(vals, itemName)) return;
              table[itemName] = {
                ...(table[itemName] || {}),
                [field]: Number(vals[itemName] || 0),
              };
            });
          });
        });
        commitTryState(nextDataSet);
        return;
      }
      const scopeTables = getScopeTablesFromPayload(profilePayload);
      if (scopeTables.length < 1) return;
      const payloadTables = (profilePayload?.tables && typeof profilePayload.tables === "object")
        ? profilePayload.tables
        : {};
      const sourceBoostables = dataSetLocal?.boostables || {};
      const nextBoostables = { ...sourceBoostables };
      scopeTables.forEach((tableName) => {
        const currentTable = sourceBoostables?.[tableName] || {};
        const rows = Array.isArray(payloadTables?.[tableName]) ? payloadTables[tableName] : [];
        const enabledNames = new Set(
          rows
            .filter((entry) => Array.isArray(entry))
            .map((entry) => String(entry[0] || ""))
            .filter(Boolean)
        );
        nextBoostables[tableName] = Object.fromEntries(
          Object.entries(currentTable).map(([itemName, value]) => {
            if (tableName === "skill") {
              const row = rows.find((entry) => Array.isArray(entry) && String(entry[0] || "") === itemName);
              const leveltry = row ? Number(row[5] || 1) : 0;
              return [itemName, { ...(value || {}), leveltry, tryit: leveltry }];
            }
            return [itemName, { ...(value || {}), tryit: enabledNames.has(itemName) ? 1 : 0 }];
          })
        );
      });
      const nextDataSet = {
        ...dataSetLocal,
        boostables: nextBoostables,
      };
      commitTryState(nextDataSet);
    } catch (error) {
      console.log("apply try profile error", error);
    }
  };
  const buildFullProfilePayload = () => {
    const state = dataSetLocal || {};
    const out = {
      v: 2,
      mode: "all",
      parts: ["all"],
      tables: {},
      fullProfile: {
        boostables: {},
        items: {},
      },
    };
    Object.entries(state?.boostables || {}).forEach(([tableName, table]) => {
      const boostRowVals = {};
      const shareRows = [];
      Object.entries(table || {}).forEach(([itemName, value]) => {
        const v = tableName === "skill"
          ? Number(value?.leveltry ?? value?.level ?? 0)
          : Number(value?.tryit || 0);
        if (tableName !== "skill" || v > 0) {
          boostRowVals[itemName] = v;
        }
        if (v > 0) {
          shareRows.push([
            itemName,
            String(value?.boost || ""),
            0,
            String(value?.img || ""),
            String(value?.cat || value?.category || ""),
            tableName === "skill" ? v : 1,
          ]);
        }
      });
      out.fullProfile.boostables[tableName] = boostRowVals;
      if (shareRows.length > 0) out.tables[tableName] = shareRows;
    });
    const getByPath = (obj, path) => String(path || "").split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
    Object.entries(tryitConfig?.itemTables || {}).forEach(([payloadKey, cfg]) => {
      const field = cfg?.field;
      const sources = Array.isArray(cfg?.sources) ? cfg.sources : [];
      if (!field || sources.length < 1) return;
      const vals = {};
      sources.forEach((sourcePath) => {
        const table = getByPath(state, sourcePath) || {};
        Object.entries(table).forEach(([itemName, value]) => {
          vals[itemName] = Number(value?.[field] || 0);
        });
      });
      out.fullProfile.items[payloadKey] = vals;
    });
    return out;
  };
  const buildProfileRequestContext = () => {
    const currentState = deepClone(dataSetLocal || {});
    const activeBaseSource = deepClone(activeBaselineRef.current || currentState || {});
    const commonReq = {
      API_URL,
      frmid,
      deviceId,
      options: {
        ...dataSet.options,
        username: dataSet?.options?.username || dataSet?.username || dataSetLocal?.username || "",
      },
      username: dataSet?.options?.username || dataSet?.username || dataSetLocal?.username || "",
      tryitConfig,
      simulatedSeason: selectedTrySeason,
    };
    return { currentState, activeBaseSource, commonReq };
  };
  const handleShowSummary = async (profilePayload, compareMode = "active") => {
    try {
      const { currentState, activeBaseSource, commonReq } = buildProfileRequestContext();
      const { restoredCurrent, summaryPayload } = await computeProfileSummaryPayload({
        ...commonReq,
        currentState,
        activeBaseState: activeBaseSource,
        profilePayload,
        compareMode,
        getScopeTablesFromPayload,
      });
      commitTryState(restoredCurrent);
      const { boostIconMap, boostCategoryMap } = buildBoostDisplayMaps(
        restoredCurrent?.boostables || {},
        restoredCurrent?.itables?.it || {}
      );
      const itemIconMap = {};
      Object.entries(restoredCurrent?.itables?.it || {}).forEach(([name, v]) => {
        itemIconMap[name] = String(v?.img || "");
      });
      setSummaryProfile({
        ...(summaryPayload || {}),
        boostIconMap,
        boostCategoryMap,
        itemIconMap,
      });
    } catch (error) {
      console.log("summary error", error);
    }
  };
  const buildComputedSharePayload = async (profilePayload, compareMode = "active") => {
    const { currentState, activeBaseSource, commonReq } = buildProfileRequestContext();
    const { restoredCurrent, summaryPayload } = await computeProfileSummaryPayload({
      ...commonReq,
      currentState,
      activeBaseState: activeBaseSource,
      profilePayload,
      compareMode,
      getScopeTablesFromPayload,
    });
    commitTryState(restoredCurrent);
    return {
      ...(summaryPayload || {}),
      summaryComputed: 1,
    };
  };
  const Refresh = async () => {
    if (applyingTrysetRef.current || closingTrysetRef.current) return false;
    const cur = dataSetLocalRef.current || {};
    const requestedRefreshSig = buildTryRefreshSignature(cur, selectedTrySeasonRef.current);
    const forceActiveTryRefresh = resetToActivePendingRef.current === true;
    if (
      !forceActiveTryRefresh
      && requestedRefreshSig
      && requestedRefreshSig === refreshBaselineSigRef.current
    ) {
      setShowTryRefreshHalo(false);
      return true;
    }
    applyingTrysetRef.current = true;
    setIsApplyingTryset(true);
    try {
      if (!tryitConfig || !Array.isArray(tryitConfig?.boostTables) || !tryitConfig?.itemTables) {
        console.log("Tryit config missing");
        return false;
      }
      const tryitSnapshot = forceActiveTryRefresh ? {} : (buildCanonicalTryitSnapshot(cur, tryitConfig) || {});
      if (!forceActiveTryRefresh && !hasTryitPayloadContent(tryitSnapshot)) {
        console.error("TRYIT refresh blocked: no explicit tryit fields found in TryNFT state.");
        return false;
      }
      const headers = {
        frmid: frmid,
        deviceId,
        options: {
          ...dataSet.options,
          username: dataSet?.options?.username || dataSet?.username || dataSetLocal?.username || "",
        },
        username: dataSet?.options?.username || dataSet?.username || dataSetLocal?.username || "",
        simulatedSeason: selectedTrySeason,
        tryitarrays: tryitSnapshot,
        tryitMode: forceActiveTryRefresh ? "active" : "snapshot",
        include: ["inventory", "boosts", "trynftpage", "cook"],
        page: "trynft",
        knownHashes: (dataSetLocal?.sectionHashes && typeof dataSetLocal.sectionHashes === "object")
          ? dataSetLocal.sectionHashes
          : {},
        knownTableHashes: (dataSetLocal?.tableHashes && typeof dataSetLocal.tableHashes === "object")
          ? dataSetLocal.tableHashes
          : {},
      };
      //const bodyStr = JSON.stringify(headers);
      //const tables = headers?.tryitarrays || {};
      //const tableKeys = Object.keys(tables);
      //const entries = tableKeys.reduce((n, k) => n + (Array.isArray(tables[k]) ? tables[k].length : 0), 0);
      //console.log("settry req ko:", (bodyStr.length / 1024).toFixed(2), "tables:", tableKeys.length, "entries:", entries);
      const payload = await fetchJson(API_URL, "/settry", {
        method: 'POST',
        body: headers,
        timeoutMs: 30_000,
      });
        const responseData = withTryNftTables(unpackFarmPayloadTables(payload));
        const latestRefreshSig = buildTryRefreshSignature(
          dataSetLocalRef.current,
          selectedTrySeasonRef.current
        );
        if (latestRefreshSig !== requestedRefreshSig) {
          console.log("Tryset changed while Apply was running; stale Apply response ignored.");
          return false;
        }
        const mergedRaw = preserveTryFlags(mergeFarmStateDeep(cur, responseData, tryitConfig), cur);
        const mergedData = syncTryitStateAcrossFarmState(mergedRaw, tryitConfig);
        dataSetLocalRef.current = mergedData;
        setdataSetLocal(mergedData);
        resetToActivePendingRef.current = false;
        handleRefreshfTNFT(dataSet, mergedData, { persistTrySnapshot: false });
        setRefreshBaselineSig(buildTryRefreshSignature(mergedData, selectedTrySeason));
        setShowTryRefreshHalo(false);
        return true;
    } catch (error) {
      if (error?.status === 429) {
        console.log('Too many requests, wait a few seconds');
      } else {
        console.log(`Error : ${error?.message || error}`);
      }
      return false;
    } finally {
      applyingTrysetRef.current = false;
      setIsApplyingTryset(false);
    }
  };
  const Reset = () => {
    try {
      const baseline = activeBaselineRef.current || {};
      const resetItemTablesToActive = () => {
        const nextItables = { ...(dataSetLocal.itables || {}) };
        Object.entries(tryitConfig?.itemTables || {}).forEach(([, tableCfg]) => {
          const field = tableCfg?.field;
          const baseField = tableCfg?.baseField || field;
          const sources = Array.isArray(tableCfg?.sources) ? tableCfg.sources : [];
          if (!field || !baseField || sources.length < 1) return;
          sources.forEach((sourcePath) => {
            const [, tableName] = String(sourcePath || "").split(".");
            if (!tableName || !nextItables?.[tableName]) return;
            const currentTable = nextItables[tableName] || {};
            const baselineTable = baseline?.itables?.[tableName] || {};
            nextItables[tableName] = Object.fromEntries(
              Object.entries(currentTable).map(([itemName, value]) => {
                const baselineValue = baselineTable?.[itemName]?.[baseField];
                const fallbackValue = value?.[baseField] ?? value?.[field] ?? 0;
                return [
                  itemName,
                  {
                    ...(value || {}),
                    [field]: baselineValue ?? fallbackValue,
                  },
                ];
              })
            );
          });
        });
        return nextItables;
      };
      const newDataSet = {
        ...dataSetLocal,
        boostables: {
          ...dataSetLocal.boostables,
          nft: Object.fromEntries(Object.entries(dataSetLocal.boostables.nft).map(([key, value]) => [key, { ...value, tryit: value.isactive }])),
          nftw: Object.fromEntries(Object.entries(dataSetLocal.boostables.nftw).map(([key, value]) => [key, { ...value, tryit: value.isactive }])),
          buildng: Object.fromEntries(Object.entries(dataSetLocal.boostables.buildng).map(([key, value]) => [key, { ...value, tryit: value.isactive }])),
          skill: Object.fromEntries(Object.entries(dataSetLocal.boostables.skill).map(([key, value]) => [
            key,
            { ...value, leveltry: Number(value?.level || 0), tryit: Number(value?.level || 0) },
          ])),
          skilllgc: Object.fromEntries(Object.entries(dataSetLocal.boostables.skilllgc).map(([key, value]) => [key, { ...value, tryit: value.isactive }])),
          bud: Object.fromEntries(Object.entries(dataSetLocal.boostables.bud).map(([key, value]) => [key, { ...value, tryit: value.isactive }])),
          shrine: Object.fromEntries(Object.entries(dataSetLocal.boostables.shrine).map(([key, value]) => [key, { ...value, tryit: value.isactive }])),
        },
        itables: resetItemTablesToActive(),
      };
      resetToActivePendingRef.current = true;
      commitTryState(newDataSet, undefined, { preserveResetPending: true });
    } catch (error) {
      console.log(`Error : ${error}`);
    }
  };
  const SetZero = () => {
    try {
      const newDataSet = {
        ...dataSetLocal,
        boostables: {
          ...dataSetLocal.boostables,
          nft: Object.fromEntries(
            Object.entries(dataSetLocal.boostables.nft).map(([key, value]) => [key, { ...value, tryit: 0 }])
          ),
          nftw: Object.fromEntries(
            Object.entries(dataSetLocal.boostables.nftw).map(([key, value]) => [key, { ...value, tryit: 0 }])
          ),
          buildng: Object.fromEntries(
            Object.entries(dataSetLocal.boostables.buildng).map(([key, value]) => [key, { ...value, tryit: 0 }])
          ),
          skill: Object.fromEntries(
            Object.entries(dataSetLocal.boostables.skill).map(([key, value]) => [key, { ...value, leveltry: 0, tryit: 0 }])
          ),
          skilllgc: Object.fromEntries(
            Object.entries(dataSetLocal.boostables.skilllgc).map(([key, value]) => [key, { ...value, tryit: 0 }])
          ),
          bud: Object.fromEntries(
            Object.entries(dataSetLocal.boostables.bud).map(([key, value]) => [key, { ...value, tryit: 0 }])
          ),
          shrine: Object.fromEntries(
            Object.entries(dataSetLocal.boostables.shrine).map(([key, value]) => [key, { ...value, tryit: 0 }])
          ),
        },
        itables: {
          ...dataSetLocal.itables,
          compost: Object.fromEntries(
            Object.entries(dataSetLocal.itables?.compost || {}).map(([key, value]) => [key, { ...value, tryit: 0 }])
          ),
        },
      };
      commitTryState(newDataSet);
      //setNFT(dataSetLocal);
    } catch (error) {
      console.log(`Error : ${error}`);
    }
  };
  const getTabEntries = (xboostables, tabKey) => {
    if (!xboostables) { return []; }
    if (tabKey === "collectibles") { return Object.entries(xboostables.nft || {}); }
    if (tabKey === "wearables") { return Object.entries(xboostables.nftw || {}); }
    if (tabKey === "craft") { return Object.entries(xboostables.buildng || {}); }
    if (tabKey === "buds") { return Object.entries(xboostables.bud || {}); }
    if (tabKey === "skills") {
      return [...Object.entries(xboostables.skill || {}), ...Object.entries(xboostables.skilllgc || {})];
    }
    if (tabKey === "shrines") { return Object.entries(xboostables.shrine || {}); }
    if (tabKey === "compost") { return Object.entries(xboostables.compost || {}); }
    return [];
  };
  const getBoostTokenList = (value) => {
    if (value === null || value === undefined) { return []; }
    const arr = Array.isArray(value) ? value : [value];
    return arr
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  };
  const formatTokenLabel = (token) => {
    if (!token) { return ""; }
    if (token.toLowerCase() === "xp") { return "XP"; }
    return token
      .split(" ")
      .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
      .join(" ");
  };
  const resolveItemCategoryTokensLocal = (boostItemTokens) => {
    const itemCategoryIndex = buildItemCategoryIndex(dataSetLocal?.itables?.it || {});
    return resolveTaxonomyItemCategoryTokens(boostItemTokens, itemCategoryIndex);
  };
  const getBoostMeta = (value) => {
    const typeRaw = [
      ...getBoostTokenList(value?.boosttype),
      ...inferTypeTokens(value?.boost),
    ];
    const explicitCategoryRaw = [
      ...getBoostTokenList(value?.boostit),
      ...getBoostTokenList(value?.cat),
      ...getBoostTokenList(value?.scat),
    ];
    const inferredCategoryRaw = explicitCategoryRaw.length > 0 ? [] : inferCategoryTokens(value?.boost);
    const categoryRaw = [
      ...explicitCategoryRaw,
      ...inferredCategoryRaw,
    ];
    const typeTokens = Array.from(new Set(typeRaw
      .map((token) => normalizeToken(token, BOOST_TYPE_ALIASES))
      .filter(Boolean)));
    const categoryTokens = resolveItemCategoryTokensLocal(categoryRaw);
    return { typeTokens, categoryTokens };
  };
  const matchesTokenFilter = (selectedSet, tokens) => {
    if (selectedSet.size === 0) { return { wanted: false, match: true }; }
    if (!tokens.length) { return { wanted: true, match: null }; }
    return { wanted: true, match: tokens.some((token) => selectedSet.has(token)) };
  };
  const currentTabEntries = selectedBoostTab === "compost"
    ? Object.entries(dataSetLocal?.itables?.compost || {})
    : getTabEntries(dataSetLocal?.boostables, selectedBoostTab);
  const boostTypeTokens = Array.from(new Set(
    currentTabEntries.flatMap(([, value]) => getBoostMeta(value).typeTokens)
  )).sort((a, b) => a.localeCompare(b));
  const boostCategoryTokens = Array.from(new Set(
    currentTabEntries.flatMap(([, value]) => getBoostMeta(value).categoryTokens)
  )).sort((a, b) => a.localeCompare(b));
  const boostTypeOptions = boostTypeTokens.map((value) => ({ value, label: formatTokenLabel(value) }));
  const boostCategoryOptions = boostCategoryTokens.map((value) => ({ value, label: formatTokenLabel(value) }));
  const handleTabChange = (tabKey) => {
    setSelectedBoostTab(tabKey);
    setBoostTypeFilters([]);
    setBoostCategoryFilters([]);
  };
  const applyBoostFilters = (itemName, value) => {
    const { typeTokens, categoryTokens } = getBoostMeta(value);
    const selectedTypeSet = new Set((boostTypeFilters || []).map((v) => String(v).toLowerCase()));
    const selectedCategorySet = new Set((boostCategoryFilters || []).map((v) => String(v).toLowerCase()));
    const typeEval = matchesTokenFilter(selectedTypeSet, typeTokens);
    const categoryEval = matchesTokenFilter(selectedCategorySet, categoryTokens);
    if (typeEval.wanted && typeEval.match !== true) { return false; }
    if (categoryEval.wanted && categoryEval.match !== true) { return false; }
    return true;
  };
  const actionBarStyle = {
    overflowX: 'visible',
    overflowY: 'visible',
  };
  const headerRowStyle = {
    overflowX: 'visible',
    overflowY: 'visible',
  };
  const switchWrapStyle = {
    marginLeft: 14,
    paddingLeft: 10,
    borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
    display: 'inline-flex',
    alignItems: 'center',
  };
  const dlistMinWidth = 140;
  const handleBoostTypeChange = (selectedValues) => {
    const values = (selectedValues || []).map((v) => String(v).toLowerCase());
    setBoostTypeFilters(Array.from(new Set(values)));
  };
  const handleBoostCategoryChange = (selectedValues) => {
    const values = (selectedValues || []).map((v) => String(v).toLowerCase());
    setBoostCategoryFilters(Array.from(new Set(values)));
  };
  const handleNftPriceColsChange = (selectedValues) => {
    const values = (selectedValues || [])
      .map((v) => String(v).toLowerCase())
      .filter((v) => v === "opensea" || v === "market" || v === "profiles" || v === "share" || v === "summary");
    setNftPriceCols(Array.from(new Set(values)));
  };
  const handleNftPriceUnitChange = (event) => {
    const selectedValue = String(event?.target?.value || "usdc").toLowerCase();
    setNftPriceUnit(selectedValue === "usdc" ? "usdc" : "flower");
  };
  const handleTryitChange = (item, base, baseName, rootName = "boostables") => {
    const rootTables = dataSetLocal?.[rootName] ?? {};
    const currentBase = rootTables?.[baseName] ?? base ?? {};
    if (Object.prototype.hasOwnProperty.call(currentBase, item)) {
      const nextTry = Number(currentBase[item]?.tryit || 0) === 1 ? 0 : 1;
      const targetGroup = rootName === "itables" && baseName === "compost"
        ? getCompostExclusiveGroup(item, currentBase[item])
        : "";
      const newBase = {
        ...currentBase,
        [item]: {
          ...currentBase[item],
          tryit: nextTry,
        },
      };
      if (targetGroup && nextTry === 1) {
        Object.entries(newBase).forEach(([entryName, entryValue]) => {
          if (entryName === item) return;
          if (getCompostExclusiveGroup(entryName, entryValue) !== targetGroup) return;
          newBase[entryName] = {
            ...(entryValue || {}),
            tryit: 0,
          };
        });
      }
      const newDataSetLocal = {
        ...dataSetLocal,
        [rootName]: {
          ...rootTables,
          [baseName]: newBase,
        },
      };
      commitTryState(newDataSetLocal);
      setTotBuyCheck(true);
    }

    /* if (base.hasOwnProperty(item)) {
      const newbase = { ...base, [item]: { ...base[item], tryit: base[item].tryit === 1 ? 0 : 1 } };
      const newDataSetLocal = { ...dataSetLocal, [baseName]: newbase };
      setdataSetLocal(newDataSetLocal);
      onReset(dataSet, newDataSetLocal);
      setTotBuyCheck(true);
    } */
  };
  const handleBuyitChange = (item) => {
    const itables = dataSetLocal?.itables ?? {};
    const it = itables?.it ?? {};
    if (!Object.prototype.hasOwnProperty.call(it, item)) return;
    const currentBuyit = Number(it[item]?.buyit || 0);
    const newIt = { ...it, [item]: { ...it[item], buyit: currentBuyit === 1 ? 0 : 1, }, };
    const newDataSetLocal = { ...dataSetLocal, itables: { ...itables, it: newIt, }, };
    commitTryState(newDataSetLocal);

    /* const it = { ...dataSetLocal.itables.it };
    const newbase = { ...it, [item]: { ...it[item], buyit: it[item].buyit === 1 ? 0 : 1 } };
    const newDataSetLocal = { ...dataSetLocal, ["it"]: newbase };
    setdataSetLocal(newDataSetLocal);
    onReset(dataSet, newDataSetLocal); */
  };
  const handleBuyitTotalChange = () => {
    const itables = dataSetLocal?.itables ?? {};
    const it = itables?.it ?? {};
    const newIt = Object.fromEntries(
      Object.entries(it).map(([itemName, value]) => [
        itemName,
        {
          ...(value || {}),
          buyit: iTotBuyCheck ? (Number(value?.buyit || 0) === 0 ? 1 : 0) : 1,
        },
      ])
    );
    const newDataSetLocal = { ...dataSetLocal, itables: { ...itables, it: newIt } };
    commitTryState(newDataSetLocal);
  };
  const handleSkillLevelChange = (item, rawLevel) => {
    const skillTable = dataSetLocal?.boostables?.skill || {};
    const current = skillTable?.[item];
    if (!current) return;
    const maxLevel = Math.max(1, Number(current?.maxLevel || 1));
    const leveltry = Math.max(0, Math.min(maxLevel, Math.floor(Number(rawLevel) || 0)));
    const newDataSetLocal = {
      ...dataSetLocal,
      boostables: {
        ...(dataSetLocal?.boostables || {}),
        skill: {
          ...skillTable,
          [item]: { ...current, leveltry, tryit: leveltry },
        },
      },
    };
    commitTryState(newDataSetLocal);
    setTotBuyCheck(true);
  };
  const getSpotBreakdown = (itemObj, useTryFields = false) => {
    const totalField = useTryFields ? "spottry" : "spot";
    const tier2Field = useTryFields ? "spot2try" : "spot2";
    const tier3Field = useTryFields ? "spot3try" : "spot3";
    const spot2 = Number(itemObj?.[tier2Field] ?? 0);
    const spot3 = Number(itemObj?.[tier3Field] ?? 0);
    const total = Number(itemObj?.[totalField] ?? 0);
    const spot1 = Math.max(0, total - spot2 - spot3);
    return { spot1, spot2, spot3, total };
  };
  const handleSpottryChange = (item, value, tier) => {
    const { it } = dataSetLocal.itables;
    const nextValue = Math.max(0, Number(value || 0));
    const getNextSpotState = (itemObj) => {
      const { spot1, spot2, spot3 } = getSpotBreakdown(itemObj, true);
      if (tier === "") {
        return { spottry: nextValue + spot2 + spot3, spot2try: spot2, spot3try: spot3 };
      }
      if (tier === "2") {
        return { spottry: spot1 + nextValue + spot3, spot2try: nextValue, spot3try: spot3 };
      }
      if (tier === "3") {
        return { spottry: spot1 + spot2 + nextValue, spot2try: spot2, spot3try: nextValue };
      }
      return null;
    };
    const isCrop = it[item]?.cat === "crop" && !it[item]?.greenhouse;
    let newIt = { ...it };
    if (isCrop) {
      Object.keys(newIt).forEach((itemKey) => {
        if (newIt[itemKey]?.cat === "crop" && !newIt[itemKey]?.greenhouse) {
          const nextSpotState = getNextSpotState(newIt[itemKey]);
          if (!nextSpotState) return;
          newIt[itemKey] = { ...newIt[itemKey], ...nextSpotState };
        }
      });
    } else {
      const nextSpotState = getNextSpotState(it[item]);
      if (!nextSpotState) return;
      newIt = { ...it, [item]: { ...it[item], ...nextSpotState }, };
    }
    const newDataSetLocal = { ...dataSetLocal, itables: { ...dataSetLocal.itables, it: newIt, }, };
    //const newbase = { ...it, [item]: { ...it[item], [keySpot]: xvalue } };
    //const newDataSetLocal = { ...dataSetLocal, ["it"]: newbase };
    commitTryState(newDataSetLocal);
  };
  function buildContent(xit) {
    if (xit) {
      const itEntries = Object.entries(xit);
      const inventoryItems = itEntries.map(([item], index) => {
        const cobj = xit[item];
        const ico = cobj ? cobj.img : '';
        const ido = cobj ? cobj.id : 0;
        const costp = cobj ? (cobj.cost / dataSet.options.coinsRatio) : 0;
        const costptry = cobj ? (cobj.costtry / dataSet.options.coinsRatio) : 0;
        const costp2pt = cobj ? cobj.costp2pt : 0;
        const time = cobj ? cobj.time : 0;
        const timetry = cobj ? cobj.timetry : 0;
        const imyield = cobj ? cobj.myield : 0;
        const imyieldtry = cobj ? cobj.myieldtry : 0;
        const iharvest = cobj ? cobj.harvest : 0;
        const iharvesttry = cobj ? cobj.harvesttry : 0;
        const iharvestdmaxtry = cobj ? cobj.harvestdmaxtry : 0;
        const idsfl = cobj ? cobj.dailysfl : 0;
        const idsfltry = cobj ? cobj.dailysfltry : 0;
        const ibuyit = cobj ? cobj.buyit : 0;
        //const idsfl = cobj ? cobj.dsfltry : 0;
        //const tradeTax = (100 - dataSet.options.tradeTax) / 100;
        //let idsfl = !isNaN(((costp2pt * tradeTax) - costptry) * (iharvestdmaxtry)) ? (((costp2pt * tradeTax) - costptry) * (iharvestdmaxtry)) : 0;
        //if ((parseFloat(costp2pt).toFixed(3) === parseFloat(costptry).toFixed(3)) && idsfl < 0) { idsfl = 0; }
        //const iharvestdmax = cobj ? cobj.harvestdmax : 0;
        //const iharvestdmaxtry = cobj ? cobj.harvestdmaxtry : 0;
        const timechg = (((timmeto1(timetry) - timmeto1(time)) / timmeto1(time)) * 100) || 0;
        const txtTimeChg = timechg ? timechg === Infinity ? "ꝏ" : parseFloat(timechg).toFixed(0) : "";
        const costpchg = (((costptry - costp) / costp) * 100) || 0;
        const txtCostpChg = costpchg ? costpchg === Infinity ? "ꝏ" : parseFloat(costpchg).toFixed(0) : "";
        const imyieldchg = (((imyieldtry - imyield) / imyield) * 100) || 0;
        const txtMyieldChg = imyieldchg ? imyieldchg === Infinity ? "ꝏ" : parseFloat(imyieldchg).toFixed(0) : "";
        const iharvestchg = (((iharvesttry - iharvest) / iharvest) * 100) || 0;
        const txtHarvestChg = iharvestchg ? iharvestchg === Infinity ? "ꝏ" : parseFloat(iharvestchg).toFixed(0) : "";
        const idsflchg = (((idsfltry - idsfl) / Math.abs(idsfl)) * 100) || 0;
        const txtDsflChg = idsflchg ? !isFinite(idsflchg) ? "ꝏ" : parseFloat(idsflchg).toFixed(0) : "";
        const cellDSflStyle = {};
        cellDSflStyle.color = ColorValue(TryChecked ? idsfltry : idsfl, 0, 10);
        const xtime = TryChecked ? timetry : time;
        const xcost = TryChecked ? costptry : costp;
        const xmyield = TryChecked ? imyieldtry : imyield;
        const xharvest = TryChecked ? iharvesttry : iharvest;
        const xdsfl = TryChecked ? idsfltry : idsfl;
        const isTieredNode = (item === "Wood" || item === "Stone" || item === "Iron" || item === "Gold");
        const spotBreakdown = getSpotBreakdown(cobj, TryChecked);
        return (
          <tr key={index}>
            <td style={{ display: 'none' }}>{ido}</td>
            <td id="iccolumn"><i><img src={ico} alt={''} className="itico" title={item} /></i></td>
            {/* <td className="tditem">{item}</td> */}
            <td className="tdcenter tooltipcell"
              onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "timechg"), e)}>{xtime}</td>
            <td className={parseFloat(timechg).toFixed(0) > 0 ? 'chgneg tooltipcell' : parseFloat(timechg).toFixed(0) < 0 ? 'chgpos tooltipcell' : 'chgeq tooltipcell'}
              onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "timechg"), e)}>{txtTimeChg}</td>
            <td className="tdcenter tooltipcell"
              onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "costchg"), e)}>{frmtNb(xcost)}</td>
            <td className={parseFloat(costpchg).toFixed(0) > 0 ? 'chgneg tooltipcell' : parseFloat(costpchg).toFixed(0) < 0 ? 'chgpos tooltipcell' : 'chgeq tooltipcell'}
              onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "costchg"), e)}>{txtCostpChg}</td>
            <td className="tdcenter tooltipcell"
              onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "yieldchg"), e)}>{parseFloat(xmyield).toFixed(2)}</td>
            <td className={parseFloat(imyieldchg).toFixed(0) > 0 ? 'chgpos tooltipcell' : parseFloat(imyieldchg).toFixed(0) < 0 ? 'chgneg tooltipcell' : 'chgeq tooltipcell'}
              onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "yieldchg"), e)}>{txtMyieldChg}</td>
            <td className="tdcenter tooltipcell"
              onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "yieldchg"), e)}>{parseFloat(xharvest).toFixed(2)}</td>
            <td className={parseFloat(iharvestchg).toFixed(0) > 0 ? 'chgpos tooltipcell' : parseFloat(iharvestchg).toFixed(0) < 0 ? 'chgneg tooltipcell' : 'chgeq tooltipcell'}
              onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "yieldchg"), e)}>{txtHarvestChg}</td>
            <td className="tdcenter">
              {/* <input
                type="checkbox"
                name={`buyit:${item}`}
                checked={ibuyit === 1}
                onChange={handleUIChange}
              /> */}
              <input type="checkbox" checked={Number(ibuyit || 0) === 1} onChange={() => handleBuyitChange(item)} />
            </td>
            <td className="tdcenter tooltipcell"
              onClick={(e) => handleTooltip(item, "dailysfl", (TryChecked ? "trynft" : ""), e)} style={{ ...cellDSflStyle }}>{parseFloat(xdsfl).toFixed(2)}</td>
            <td className={parseFloat(idsflchg).toFixed(0) > 0 ? 'chgpos tooltipcell' : parseFloat(idsflchg).toFixed(0) < 0 ? 'chgneg tooltipcell' : 'chgeq tooltipcell'}
              onClick={(e) => handleTooltip(item, "dailysfl", (TryChecked ? "trynft" : ""), e)}>{txtDsflChg}</td>
            <td className="tdcenter">
              <CounterInput
                value={spotBreakdown.spot1}
                onChange={value => handleSpottryChange(item, value, "")}
                min={0}
                max={99}
                activate={TryChecked}
              />
            </td>
            {isTieredNode ? <td className="tdcenter">
              <CounterInput
                value={xit[item][key("spot2")]}
                onChange={value => handleSpottryChange(item, value, "2")}
                min={0}
                max={99}
                activate={TryChecked}
              />
            </td> : null}
            {isTieredNode ? <td className="tdcenter">
              <CounterInput
                value={xit[item][key("spot3")]}
                onChange={value => handleSpottryChange(item, value, "3")}
                min={0}
                max={99}
                activate={TryChecked}
              />
            </td> : null}
          </tr>
        );
      });
      const xtableContent = (
        <>
          <thead>
            <tr>
              <td style={{ display: 'none' }}>ID</td>
              <th className="th-icon">   </th>
              {/* <th>Item</th> */}
              <th>Time</th>
              <th>%</th>
              <th>Cost</th>
              <th>%</th>
              <th>Yield</th>
              <th>%</th>
              <th>Harvest</th>
              <th>%</th>
              <th>Buy
                {/* <div><input type="checkbox" checked={iTotBuyCheck} onChange={() => handleBuyitTotalChange(item)} /></div> */}
              </th>
              <th>Daily<div>{imgSFL}</div></th>
              <th>%</th>
              <th>Nodes</th>
              <th>Tier2</th>
              <th>Tier3</th>
            </tr>
          </thead>
          <tbody>
            {inventoryItems}
          </tbody>
        </>
      );
      return xtableContent;
    }
    return null;
  }
  function buildNFT(xdataSetFarm) {
    if (!xdataSetFarm?.boostables && !xdataSetFarm?.itables?.compost) {
      return null;
    }
    const { nft, nftw, buildng, skill, skilllgc, bud, shrine } = xdataSetFarm.boostables || {};
    const compost = xdataSetFarm?.itables?.compost || {};
    const showNFT = selectedBoostTab === "collectibles";
    const showNFTW = selectedBoostTab === "wearables";
    const showCraft = selectedBoostTab === "craft";
    const showBud = selectedBoostTab === "buds";
    const showSkill = selectedBoostTab === "skills";
    const showShrine = selectedBoostTab === "shrines";
    const showCompost = selectedBoostTab === "compost";
    let totalCost = 0;
    let totalCostM = 0;
    let totalCostactiv = 0;
    let totalCostactivM = 0;
    const nftEntries = nft && Object.entries(nft);
    const nftwEntries = nftw && Object.entries(nftw);
    const buildEntries = buildng && Object.entries(buildng);
    const skillEntries = skill && Object.entries(skill);
    const skilllgcEntries = skilllgc && Object.entries(skilllgc);
    const shrineEntries = shrine && Object.entries(shrine);
    const budEntries = bud && Object.entries(bud);
    const compostEntries = compost && Object.entries(compost);
    const imgOS = <img src={imgopensea} alt={''} className="nftico" />;
    const imgexchng = imgExchng;
    const showTotal = (showNFTW || showNFT);
    const showOpenSeaCol = showTotal && nftPriceCols.includes("opensea");
    const showMarketCol = showTotal && nftPriceCols.includes("market");
    const parseNumOrNull = (v) => {
      if (v === null || v === undefined || v === "") { return null; }
      if (typeof v === "number") { return Number.isFinite(v) ? v : null; }
      let txt = String(v ?? "").trim();
      if (!txt) { return null; }
      // Keep only numeric signs/separators, then normalize locale formats.
      txt = txt.replace(/[^\d.,-]/g, "");
      if (!txt) { return null; }
      const lastComma = txt.lastIndexOf(",");
      const lastDot = txt.lastIndexOf(".");
      if (lastComma > -1 && lastDot > -1) {
        const decimalSep = lastComma > lastDot ? "," : ".";
        const thousandsSep = decimalSep === "," ? "." : ",";
        txt = txt.replace(new RegExp(`\\${thousandsSep}`, "g"), "");
        if (decimalSep === ",") { txt = txt.replace(",", "."); }
      } else if (lastComma > -1) {
        txt = txt.replace(",", ".");
      }
      const n = Number(txt);
      return Number.isFinite(n) ? n : null;
    };
    const toNum = (v) => {
      const n = parseNumOrNull(v);
      return n === null ? 0 : n;
    };
    const isOn = (v) => Number(v || 0) > 0 || v === true;
    const getSkillLevel = (value, tryMode = true) => Math.max(
      0,
      Number(tryMode ? (value?.leveltry ?? value?.level ?? 0) : (value?.level ?? 0)) || 0
    );
    const usdPerSfl = Number(priceData?.[2] ?? dataSet?.options?.usdSfl ?? 0);
    const toDisplayPrice = (value) => {
      const parsed = parseNumOrNull(value);
      if (parsed === null) { return null; }
      const base = parsed;
      if (nftPriceUnit === "flower") {
        return usdPerSfl > 0 ? (base / usdPerSfl) : base;
      }
      return base;
    };
    const formatPriceCell = (value) => {
      const displayed = toDisplayPrice(value);
      if (displayed === null) { return ""; }
      return frmtNb(displayed, 2);
    };

    const addTotalsFromEntries = (entries, mode) => {
      if (!entries) { return; }
      for (const [, value] of entries) {
        if (!value) { continue; }
        if (mode === "price") {
          if (isOn(value.tryit)) {
            totalCost += toNum(value.price);
            totalCostM += toNum(value.pricem);
          }
          if (isOn(value.isactive)) {
            totalCostactiv += toNum(value.price);
            totalCostactivM += toNum(value.pricem);
          }
          continue;
        }
      }
    };

    if (showNFT) { addTotalsFromEntries(nftEntries, "price"); }
    if (showNFTW) { addTotalsFromEntries(nftwEntries, "price"); }
    if (showCraft) { addTotalsFromEntries(buildEntries, "price"); }
    if (showBud) { addTotalsFromEntries(budEntries, "price"); }
    if (showShrine) { addTotalsFromEntries(shrineEntries, "price"); }
    const skillTrySummary = skillBudgetPreview?.summary;
    const hasSkillTrySummary = !!(
      skillTrySummary
      && typeof skillTrySummary === "object"
      && Number.isFinite(Number(skillTrySummary?.selectedPoints))
      && Number.isFinite(Number(skillTrySummary?.selectedShards))
    );
    if (showSkill && hasSkillTrySummary) {
      totalCost = Number(skillTrySummary.selectedPoints || 0);
      totalCostM = Number(skillTrySummary.selectedShards || 0);
      totalCostactiv = Number(skillTrySummary.activePoints || 0);
      totalCostactivM = Number(skillTrySummary.activeShards || 0);
    }

    if (showCompost) {
      const compostRows = [];
      if (compostEntries) {
        for (const [item, value] of compostEntries) {
          if (!value || !value.boost) { continue; }
          if (!applyBoostFilters(item, value)) { continue; }
          compostRows.push(
            <tr key={item}>
              <td className="tditemright">{item}</td>
              <td className="tdcenter" id="iccolumn">
                <i><img src={value?.img || imgna} alt={''} className="nftico" /></i>
              </td>
              <td className="tdcenter">
                <input type="checkbox" checked={!!compost[item]?.tryit} onChange={() => handleTryitChange(item, compost, "compost", "itables")} />
              </td>
              <td className="tditemnft" style={{ color: `rgb(190, 190, 190)` }}>{value?.boost || ""}</td>
            </tr>
          );
        }
      }
      return (
        <>
          <thead>
            <tr>
              <th style={{ width: 150 }}>Item</th>
              <th className="th-icon"> </th>
              <th className="tdcenter">Try</th>
              <th style={{ width: `500px` }}>Boost</th>
            </tr>
          </thead>
          <tbody>
            {compostRows}
          </tbody>
        </>
      );
    }

    var NFT = [];
    //settableNFT("");
    if (nftEntries && showNFT) {
      for (const [item, value] of nftEntries) {
        if (!applyBoostFilters(item, value)) { continue; }
        let isupply = 0;
        if (value.supply) { isupply = value.supply; }
        NFT.push(
          <tr key={item}>
            <td className="tditemright">{item}</td>
            <td className="tdcenter" id="iccolumn"><i><img src={value.img} alt={''} className="nftico" /></i></td>
            <td className="tdcenter">
              <input type="checkbox" checked={nft[item].tryit} onChange={() => handleTryitChange(item, nft, "nft")} />
            </td>
            <td className="tdcenter">
              <input type="checkbox" className={'checkbox-disabled'} checked={!!value.isactive} readOnly />
            </td>
            {showOpenSeaCol ? (<td className="tdcenter">{formatPriceCell(value.price)}</td>) : ("")}
            {showMarketCol ? (<td className="tdcenter">{formatPriceCell(value.pricem || 0)}</td>) : ("")}
            <td className="tdcenter tooltipcell" onClick={(e) => handleTooltip(item, "trynftsupply", buildSupplyTooltipContract(item, value), e)}>{isupply}</td>
            <td className="tditemnft" style={{ color: `rgb(190, 190, 190)` }}>{value.boost}</td>
          </tr>
        );
      }
    }
    if (nftwEntries && showNFTW) {
      for (const [itemw, valuew] of nftwEntries) {
        if (!applyBoostFilters(itemw, valuew)) { continue; }
        let isupplyw = 0;
        if (valuew.supply) { isupplyw = valuew.supply; }
        NFT.push(
          <tr key={itemw}>
            <td className="tditemright">{itemw}</td>
            <td className="tdcenter" id="iccolumn"><i><img src={valuew.img} alt={''} className="nftico" /></i></td>
            <td className="tdcenter">
              <input type="checkbox" checked={nftw[itemw].tryit} onChange={() => handleTryitChange(itemw, nftw, "nftw")} />
            </td>
            <td className="tdcenter">
              <input type="checkbox" className={'checkbox-disabled'} checked={!!valuew.isactive} readOnly />
            </td>
            {showOpenSeaCol ? (<td className="tdcenter">{formatPriceCell(valuew.price)}</td>) : ("")}
            {showMarketCol ? (<td className="tdcenter">{formatPriceCell(valuew.pricem || 0)}</td>) : ("")}
            <td className="tdcenter tooltipcell" onClick={(e) => handleTooltip(itemw, "trynftsupply", buildSupplyTooltipContract(itemw, valuew), e)}>{isupplyw}</td>
            <td className="tditemnft" style={{ color: `rgb(190, 190, 190)` }}>{valuew.boost}</td>
          </tr>
        );
      }
    }
    if (buildEntries && showCraft) {
      for (const [itemb, valueb] of buildEntries) {
        if (!applyBoostFilters(itemb, valueb)) { continue; }
        let isupplyb = 0;
        if (valueb.supply) { isupplyb = valueb.supply; }
        NFT.push(
          <tr key={itemb}>
            <td className="tditemright">{itemb}</td>
            <td className="tdcenter" id="iccolumn"><i><img src={valueb.img} alt={''} className="nftico" /></i></td>
            <td className="tdcenter">
              <input type="checkbox" checked={buildng[itemb].tryit} onChange={() => handleTryitChange(itemb, buildng, "buildng")} />
            </td>
            <td className="tdcenter">
              <input type="checkbox" className={'checkbox-disabled'} checked={!!valueb.isactive} readOnly />
            </td>
            <td className="tdcenter">{isupplyb}</td>
            <td className="tditemnft" style={{ color: `rgb(190, 190, 190)` }}>{valueb.boost}</td>
          </tr>
        );
      }
    }
    if (skillEntries && showSkill) {
      let tierPoints = {};
      const catPoints = {
        Crops: { 2: 3, 3: 7 },
        Fruits: { 2: 2, 3: 5 },
        Trees: { 2: 2, 3: 5 },
        Fishing: { 2: 2, 3: 5 },
        Animals: { 2: 4, 3: 8 },
        Greenhouse: { 2: 2, 3: 5 },
        Mining: { 2: 3, 3: 7 },
        Cooking: { 2: 2, 3: 5 },
        "Bees Flowers": { 2: 2, 3: 5 },
        Machinery: { 2: 2, 3: 5 },
        Compost: { 2: 3, 3: 7 },
        Aging: { 2: 3, 3: 7 }
      };
      // Prerequisite check must use all selected skills, even if some are hidden by filters.
      for (const [items, values] of skillEntries) {
        const cat = skill?.[items]?.cat;
        const tier = skill?.[items]?.tier;
        if (!cat || !tier) { continue; }
        if (!tierPoints[cat]) { tierPoints[cat] = {}; }
        if (!tierPoints[cat][tier]) { tierPoints[cat][tier] = 0; }
        if (getSkillLevel(values, true) > 0) {
          tierPoints[cat][tier] += toNum(values?.points);
        }
      }
      let currentCategory = null;
      for (const [items, values] of skillEntries) {
        if (!applyBoostFilters(items, values)) { continue; }
        if (values.cat !== currentCategory) {
          currentCategory = values.cat;
          NFT.push(
            <tr key={`skill-cat-${currentCategory}`}>
              <td colSpan={5} style={{ textAlign: "center", fontWeight: "bold" }}>
                {currentCategory}
              </td>
            </tr>
          );
        }
        const cellStyle = {};
        cellStyle.backgroundColor = skill[items].tier === 1 ? `rgba(0, 116, 25, 0.63)` : skill[items].tier === 2 ? `rgba(0, 2, 116, 0.63)` : `rgba(114, 116, 0, 0.63)`;
        if (skill[items].tier === 2 && ((catPoints[skill[items].cat]?.[2] || 0) > (tierPoints[skill[items].cat]?.[1] || 0))) {
          cellStyle.backgroundColor = `rgba(255, 94, 94, 0.63)`;
        }
        if (skill[items].tier === 3 && ((catPoints[skill[items].cat]?.[3] || 0) > ((tierPoints[skill[items].cat]?.[1] || 0) + (tierPoints[skill[items].cat]?.[2] || 0)))) {
          cellStyle.backgroundColor = `rgba(255, 94, 94, 0.63)`;
        }
        const rankEffects = formatSkillRankEffects(values?.rankEffect);
        const tryLevel = getSkillLevel(values, true);
        const maxSkillLevel = Math.max(1, Number(values?.maxLevel || 1));
        const skillControlsDisabled = !!values?.disabled;
        NFT.push(
          <tr key={items}>
            <td className="tditemright" style={cellStyle}>{items}</td>
            <td className="tdcenter" id="iccolumn"><i><img src={values.img} alt={''} className="nftico" /></i></td>
            <td className="tdcenter">
              <div className="trynft-skill-level-control">
                <button
                  type="button"
                  className="trynft-skill-level-button"
                  onClick={() => handleSkillLevelChange(items, tryLevel - 1)}
                  disabled={skillControlsDisabled || tryLevel <= 0}
                  aria-label={`Decrease ${items} simulated level`}
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max={maxSkillLevel}
                  step="1"
                  value={tryLevel}
                  onChange={(event) => handleSkillLevelChange(items, event.target.value)}
                  disabled={skillControlsDisabled}
                  className="trynft-skill-level-input"
                  style={{ color: getSkillLevelColor(tryLevel) }}
                  aria-label={`${items} simulated level`}
                />
                <button
                  type="button"
                  className="trynft-skill-level-button"
                  onClick={() => handleSkillLevelChange(items, tryLevel + 1)}
                  disabled={skillControlsDisabled || tryLevel >= maxSkillLevel}
                  aria-label={`Increase ${items} simulated level`}
                >
                  +
                </button>
              </div>
            </td>
            <td
              className="tdcenter"
              style={{
                color: getSkillLevelColor(getSkillLevel(values, false)),
                fontWeight: 700,
              }}
            >
              {getSkillLevel(values, false)}
            </td>
            <td className="tditemnft" style={{ color: `rgb(190, 190, 190)` }}>
              <div>{values.boost}</div>
              {rankEffects && (
                <div
                  style={{ fontSize: "0.82em", opacity: 0.9, marginTop: 2 }}
                  title={`L1 · L2 · L3 (current simulation: L${getSkillLevel(values, true)})`}
                >
                  <span style={{ color: "#fff", fontWeight: 600 }}>L1–{values.maxLevel}: </span>
                  {rankEffects}
                </div>
              )}
            </td>
          </tr>
        );
      }
    }
    if (skilllgcEntries && showSkill) {
      const visibleSkilllgcEntries = skilllgcEntries.filter(([items, values]) => applyBoostFilters(items, values));
      if (visibleSkilllgcEntries.length > 0) {
        NFT.push(
          <tr key="skill-legacy-title">
            <td colSpan={5} style={{ textAlign: "center", fontWeight: "bold" }}>
              Badges (Legacy skills not obtainable anymore)
            </td>
          </tr>
        );
      }
      for (const [items, values] of visibleSkilllgcEntries) {
        /* if (values.tryit) {
          totalCost += Number(values.points);
          totalCostM += Number(values.pricem) || 0;
        }
        if (values.isactive) {
          totalCostactiv += Number(values.points);
          totalCostactivM += Number(values.pricem) || 0;
        } */
        const cellStyle = {};
        //cellStyle.backgroundColor = xskill[items].tier === 1 ? `rgba(0, 116, 25, 0.63)` : xskill[items].tier === 2 ? `rgba(0, 2, 116, 0.63)` : `rgba(114, 116, 0, 0.63)`;
        NFT.push(
          <tr key={items}>
            <td className="tditemright" style={cellStyle}>{items}</td>
            <td className="tdcenter" id="iccolumn"><i><img src={values.img} alt={''} className="nftico" /></i></td>
            <td className="tdcenter">
              <input type="checkbox" checked={skilllgc[items].tryit} onChange={() => handleTryitChange(items, skilllgc, "skilllgc")} />
            </td>
            <td className="tdcenter">
              <input type="checkbox" className={'checkbox-disabled'} checked={!!values.isactive} readOnly />
            </td>
            <td className="tditemnft" style={{ color: `rgb(190, 190, 190)` }}>{values.boost}</td>
          </tr>
        );
      }
    }
    if (budEntries && showBud) {
      for (const [itembd, valuebd] of budEntries) {
        if (!applyBoostFilters(itembd, valuebd)) { continue; }
        NFT.push(
          <tr key={itembd}>
            <td className="tditemright">{itembd}</td>
            <td className="tdcenter" id="iccolumn"><i><img src={valuebd.img} alt={''} className="nftico" /></i></td>
            <td className="tdcenter">
              <input type="checkbox" checked={bud[itembd].tryit} onChange={() => handleTryitChange(itembd, bud, "bud")} />
            </td>
            <td className="tdcenter">
              <input type="checkbox" className={'checkbox-disabled'} checked={!!valuebd.isactive} readOnly />
            </td>
            <td className="tditemnft" style={{ color: `rgb(190, 190, 190)` }}>{valuebd.boost}</td>
          </tr>
        );
      }
    }
    if (shrineEntries && showShrine) {
      for (const [itemb, valueb] of shrineEntries) {
        if (!applyBoostFilters(itemb, valueb)) { continue; }
        let isupplyb = 0;
        if (valueb.supply) { isupplyb = valueb.supply || 0; }
        NFT.push(
          <tr key={itemb}>
            <td className="tditemright">{itemb}</td>
            <td className="tdcenter" id="iccolumn"><i><img src={valueb.img} alt={''} className="nftico" /></i></td>
            <td className="tdcenter">
              <input type="checkbox" checked={shrine[itemb].tryit} onChange={() => handleTryitChange(itemb, shrine, "shrine")} />
            </td>
            <td className="tdcenter">
              <input type="checkbox" className={'checkbox-disabled'} checked={!!valueb.isactive} readOnly />
            </td>
            <td className="tdcenter">{isupplyb}</td>
            <td className="tditemnft" width="500px" style={{ color: `rgb(190, 190, 190)` }}>{valueb.boost}</td>
          </tr>
        );
      }
    }
    const totalCostToDisplayRaw = (TotalCostDisplay === "opensea" || showSkill) ? totalCost : totalCostM;
    const totalCostToDisplay = (!showSkill && nftPriceUnit === "flower" && usdPerSfl > 0)
      ? totalCostToDisplayRaw / usdPerSfl
      : totalCostToDisplayRaw;
    const totalCostactivDisplay = (nftPriceUnit === "flower" && usdPerSfl > 0) ? (totalCostactiv / usdPerSfl) : totalCostactiv;
    const totalCostactivMDisplay = (nftPriceUnit === "flower" && usdPerSfl > 0) ? (totalCostactivM / usdPerSfl) : totalCostactivM;
    const remainingSkillPoints = Number(skillTrySummary?.remainingPoints || 0);
    const remainingShards = Number(skillTrySummary?.remainingShards || 0);
    const farmRemainingSkillPoints = Number(skillTrySummary?.availablePoints || 0);
    const farmRemainingShards = Number(skillTrySummary?.availableShards || 0);
    /* NFT.unshift(
      <tr key="total">
        <td colSpan="3">Total</td>
        <td className="tdcenter">{frmtNb(totalCost)}</td>
      </tr>
    ); */
    const txtTotal = (showSkill || showTotal) && "Total ";
    const widthTotal = showTotal ? 150 : 140;
    const xtableNFT = (
      <>
        <thead style={{ position: "sticky", top: 0, zIndex: 5 }}>
          <tr>
            {/* <td style={{ display: 'none' }}>ID</td> */}
            <th style={{ width: widthTotal }} colSpan={2}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                Item
                {showSkill && isSkillBudgetLoading ? (
                  <CircularProgress size={12} sx={{ color: "rgb(255, 205, 96)" }} />
                ) : null}
              </span>
            </th>
            {/* <th className="tdcenter"> </th> */}
            <th className="tdcenter">Try</th>
            <th className="tdcenter" style={{ fontSize: "10px" }}>Active</th>
            {showOpenSeaCol ? (<th className="tdcenter">{imgOS}</th>) : ("")}
            {showMarketCol ? (<th className="tdcenter">{imgexchng}</th>) : ("")}
            {(showTotal || showCraft || showShrine) ? (<th className="tdcenter">Supply</th>) : ("")}
            <th style={{ width: `150px` }}>Boost</th>
          </tr>
          <tr key="total">
            <td align="right" style={{ width: widthTotal, whiteSpace: "nowrap" }} colSpan={2}>{txtTotal}{showTotal &&
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "nowrap" }}>
                {(showOpenSeaCol && showMarketCol) ? (
                  <DList
                    name="TotalCostDisplay"
                    options={NFT_TOTAL_COST_OPTIONS}
                    value={TotalCostDisplay}
                    onChange={handleChangeTotalCostDisplay}
                    iconOnly={true}
                    menuIconOnly={true}
                    width={38}
                    height={28}
                  />
                ) : null}
                <DList
                  name="nftPriceUnit"
                  options={NFT_PRICE_UNIT_OPTIONS}
                  value={nftPriceUnit}
                  onChange={handleNftPriceUnitChange}
                  iconOnly={true}
                  menuIconOnly={true}
                  width={38}
                  height={28}
                />
              </span>}</td>
            {/* <td className="tdcenter"></td> */}
            <td className="tdcenter">
              {showSkill ? (
                hasSkillTrySummary ? (
                  <span style={{ display: "inline-block", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                    <span style={{ color: "#7fe36f" }}>{frmtNb(totalCostToDisplay, 0)}</span> · <span style={{ color: "#86bdff" }}>{frmtNb(totalCostM, 0)}</span>
                    <br />
                    left <strong style={{ fontSize: 16, color: remainingSkillPoints < 0 ? "#ff8e8e" : "#7fe36f" }}>{frmtNb(remainingSkillPoints, 0)}</strong> · shards <strong style={{ fontSize: 16, color: remainingShards < 0 ? "#ff8e8e" : "#86bdff" }}>{frmtNb(remainingShards, 0)}</strong>
                  </span>
                ) : ""
              ) : (showTotal ? frmtNb(totalCostToDisplay, 2) : "")}
            </td>
            <td className="tdcenter">{showSkill ? (
              hasSkillTrySummary ? (
                <span style={{ display: "inline-block", whiteSpace: "nowrap", lineHeight: 1.3 }}>
                  <span style={{ color: "#7fe36f" }}>{frmtNb(totalCostactiv, 0)}</span> · <span style={{ color: "#86bdff" }}>{frmtNb(totalCostactivM, 0)}</span>
                  <br />
                  <strong style={{ fontSize: 16, color: "#7fe36f" }}>{frmtNb(farmRemainingSkillPoints, 0)}</strong> · <strong style={{ fontSize: 16, color: "#86bdff" }}>{frmtNb(farmRemainingShards, 0)}</strong>
                </span>
              ) : ""
            ) : ""}</td>
            {showOpenSeaCol ? (<td className="tdcenter">{frmtNb(totalCostactivDisplay, 2)}</td>) : ("")}
            {showMarketCol ? (<td className="tdcenter">{frmtNb(totalCostactivMDisplay, 2)}</td>) : ("")}
            {(showTotal || showCraft || showShrine) ? (<td></td>) : ("")}
            <td></td>
          </tr>
        </thead>
        <tbody>
          {NFT}
        </tbody>
      </>
    );
    return xtableNFT;
  }
  /* useEffect(() => {
    Refresh();
  }, []); */
  const tableStyle = {
    flexDirection: tableFlexDirection,
    display: 'flex',
    flex: 1,
    minHeight: 0,
    overflow: 'visible'
  };
  return (
    <div style={{
      position: 'fixed',
      top: '0',
      width: '100%',
      backgroundColor: 'var(--background-color)',
      justifyContent: 'center',
      zIndex: '990',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxHeight: '100vh'
      }}>
        {/* <h2>Try NFT</h2> */}
        <div className="trynft-header-row" style={headerRowStyle}>
          <div className="trynft-action-bar" style={actionBarStyle}>
            <button
              onClick={closeModal}
              className={`button ${isClosingTryset ? "is-wait" : ""}`}
              disabled={isApplyingTryset || isClosingTryset}>
              <img src={imgcancel} alt="" className="resico" />
            </button>
            <button
              onClick={Refresh}
              className={`button ${showTryRefreshHalo ? "tryset-refresh-halo" : "tryset-refresh-idle"} ${isApplyingTryset ? "is-wait" : ""}`}
              disabled={isApplyingTryset || isClosingTryset}>
              <img src={imgconfirm} title="Apply Tryset" alt="" className="resico" />
            </button>
            <button onClick={Reset} title="Reset to active set" className="button">
              <img src={imgrefresh} alt="" className="resico" />
            </button>
            <button onClick={SetZero} title="Disable all NFT/Skill boosts" className="button">
              <img src={imgnoboosttry} alt="" className="resico" />
            </button>
            <button onClick={handleButtonHelpClick} title="Help" className="button"><img src={imgna} alt="" className="itico" /></button>
            <div style={switchWrapStyle}>
              <FormControlLabel
                labelPlacement="top"
                control={
                  <Switch
                    name="TryChecked"
                    checked={TryChecked}
                    onChange={handleUIChange}
                    color="primary"
                    size="small"
                    sx={{
                      '& .MuiSwitch-track': {
                        backgroundColor: 'rgba(140, 140, 140, 0.7)',
                      },
                    }}
                  />
                }
                label={TryChecked ? 'Tryset' : 'Activeset'}
                sx={{
                  margin: 0,
                  alignItems: "center",
                  '& .MuiFormControlLabel-label': {
                    fontSize: '11px',
                    lineHeight: 1,
                    marginBottom: '2px',
                  }
                }}
              />
              <div style={{ marginLeft: 8 }}>
                <DList
                  name="selectedTrySeason"
                  title="Season"
                  options={TRYSET_SEASON_OPTIONS}
                  value={selectedTrySeason}
                  onChange={handleUIChange}
                  height={28}
                />
              </div>
            </div>
          </div>
          <div className="trynft-view-bar">
            <DList
              options={NFT_PRICE_COLUMN_OPTIONS}
              value={nftPriceCols}
              multiple={true}
              closeOnSelect={false}
              emitEvent={false}
              onChange={handleNftPriceColsChange}
              listIcon={imgoptions}
              iconOnly={true}
              height={28}
              menuMinWidth={160}
            />
            <button className="button"
              onClick={() => setTableFlexDirection(dir => dir === 'row' ? 'column' : 'row')}
            >
              {tableFlexDirection === 'row' ? <img src={imghorizontal} alt="" className="resico" /> : <img src={imgvertical} alt="" className="resico" />}
            </button>
            <button className="button"
              onClick={() => setTableView(view =>
                view === 'both' ? 'left' : view === 'left' ? 'right' : 'both'
              )}
            >
              {tableView === 'both' ? <img src={imgcrops} alt="" className="resico" /> : tableView === 'left' ? <img src={imglightning} alt="" className="resico" />
                : <img src={imgcropslightning} alt="" className="resico" />}
            </button>
          </div>
          <div className="trynft-filter-bar">
            <DList
              name="selectedBoostTab"
              options={BOOST_TAB_OPTIONS}
              value={selectedBoostTab}
              onChange={(event) => handleTabChange(event?.target?.value)}
              height={22}
              menuMinWidth={150}
              className="trynft-boost-dlist"
              menuClassName="trynft-boost-dlist-menu"
            />
            <DList
              placeholder="Type"
              options={boostTypeOptions}
              value={boostTypeFilters}
              multiple={true}
              closeOnSelect={false}
              emitEvent={false}
              onChange={handleBoostTypeChange}
              //width={115}
              height={20}
              menuMinWidth={dlistMinWidth}
            />
            <DList
              placeholder="Category"
              options={boostCategoryOptions}
              value={boostCategoryFilters}
              multiple={true}
              closeOnSelect={false}
              emitEvent={false}
              onChange={handleBoostCategoryChange}
              //width={115}
              height={20}
              menuMinWidth={dlistMinWidth}
            />
          </div>
        </div>
        <div style={{ padding: "2px 0 4px 0", display: "flex", justifyContent: "flex-start" }}>
          <TryProfileShareBar
            boostables={dataSetLocal?.boostables || {}}
            itablesIt={dataSetLocal?.itables?.it || {}}
            onApplyProfile={applyTryProfilePayload}
            onShowSummary={handleShowSummary}
            onBuildFullProfilePayload={buildFullProfilePayload}
            onBuildComputedSharePayload={buildComputedSharePayload}
            showProfilesPanel={nftPriceCols.includes("profiles")}
            showSharePanel={nftPriceCols.includes("share")}
            showSummaryPanel={nftPriceCols.includes("summary")}
            shareScopeValue={Array.isArray(tryProfileShareScope) ? tryProfileShareScope : []}
            onShareScopeChange={handleUIChange}
          />
        </div>
        {!hasTryNftTables ? (
          <div style={{ padding: '12px 8px' }}>Loading TryNFT tables...</div>
        ) : (
          <div style={tableStyle}>
            {(tableView === 'both' || tableView === 'left') && (
              <div style={{
                flex: 1,
                overflow: 'auto',
                minHeight: 0,
                display: tableView === 'right' ? 'none' : 'block'
              }}>
                <table>{buildContent(dataSetLocal?.itables?.it)}</table>
              </div>
            )}
            {(tableView === 'both' || tableView === 'right') && (
              <div style={{
                flex: 1,
                overflow: 'auto',
                minHeight: 0,
                display: tableView === 'left' ? 'none' : 'block'
              }}>
                <table className="trynft-boost-table">{buildNFT(dataSetLocal)}</table>
              </div>
            )}
          </div>
        )}
      </div>
      {tooltipData && (
        <Tooltip
          onClose={() => setTooltipData(null)}
          clickPosition={tooltipData}
          item={tooltipData.item}
          context={tooltipData.context}
          value={tooltipData.value}
          dataSet={dataSet}
          dataSetFarm={dataSetLocal}
          forTry={TryChecked}
          interfaceMode={interfaceMode}
        />
      )}
      {showHelp && (
        <Help onClose={handleCloseHelp} image={helpImage} />
      )}
      {summaryProfile ? (
        <TryProfileSummaryModal
          profile={summaryProfile}
          onClose={() => setSummaryProfile(null)}
        />
      ) : null}
    </div>
  );
}
function timmeto1(inputTime) {
  const timeComponents = inputTime.split(':').map(Number);
  const [hours, minutes, seconds] = timeComponents;
  const decimalHours = hours + minutes / 60 + seconds / 3600;
  const normalizedTime = decimalHours / 24;
  return normalizedTime;
}

export default ModalTNFT;


