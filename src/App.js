import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import './App.css';
import ModalTNFT from './ftrynft.js';
import ModalGraph from './fgraph.js';
import ModalDlvr from './fdelivery.js';
import ModalOptions from './foptions.js';
import ModalChatbot from './chatbot.jsx';
import ModalAdmin from './fadmin.jsx';
import PageCoach from './components/PageCoach.jsx';
import Cadre from './animodal.js';
import Tooltip from "./tooltip.js";
import DList from "./dlist.jsx";
import { Switch, FormControlLabel } from '@mui/material';
import { frmtNb, UpdatedSince, getOrCreateDeviceId } from './fct.js';
import { promptPass, promptInfo, promptConfirm, promptChoice, promptInput } from './promptW';
import { fetchJson } from './services/apiClient.js';
import { useAppVersionRefresh } from './hooks/useAppVersionRefresh.js';

import { AppCtx } from "./context/AppCtx";
import PanelTable from "./tables/PanelTable";
import HeaderTrades from "./components/HeaderTrades";
import AutoRefreshProgress from "./components/AutoRefreshProgress";
import TryProfileSummaryModal from "./components/TryProfileSummaryModal.jsx";
import QuickTryDrawer from "./components/QuickTryDrawer.jsx";
import {
  parseTryProfileFromLocation,
  clearTryProfileFromUrl,
  buildTryProfileSummaryRows,
  buildSharedBoostChangesRows,
} from "./tryProfileShare.js";
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
const isNativeApp = Capacitor.isNativePlatform();

// Extracted constants
import { API_URL, LOAD_FARM_COOLDOWN_MS, LOAD_FARM_SPAM_WINDOW_MS, LOAD_FARM_SPAM_THRESHOLD, AUCTION_NOTIF_SYNC_DEBOUNCE_MS } from './constants/api.js';
import { ANIMAL_COST_ALLOCATION_OPTIONS } from './constants/animalCostAllocation.js';

// Extracted image constants
import {
  imgsfl, imgSFL, imgcoins, imgCoins, imgxp, imgcrop, imgwood, imgstone,
  imgsaltfarm, imgbeehive, imgcow, imgsheep, imgflowerbed, imgchkn, imgrdy,
  imgpet, imgcrustacean, imgshrine, imgacorn, imgexchng, imgExchng,
  imgprodit, imgbuyit, imgadmin, imgrod,
  imgwinter, imgspring, imgsummer, imgautumn,
  imgusdc, imgmatic, imgbase, imgeth, imgconfirm, imgcancel, imgrefresh,
  imgsearch, imgsyncing, imglightning, imggrubnuk, imggoblinThinking,
  imgplayerCount, imgshovel, imgchefHat, imgsandShovel, imgbeeBox,
  imgefficiencyExtModule, imgworld, imghammer, imgsunstoneRock1, imglavaPit,
  imgchapter, imgcalendar, imgtrophy, imgoptions, imgdelivBoard,
  imgcropBucket, imgdoubledelivery, imgfish, imgredPansy, imgapple,
  imgcheese, imgcarrotCake, imgfloatingIsland,
  imghoney, imgsunstone, imgna, imgwinterPath, imgspringPath,
  imgsummerPath, imgautumnPath,
  imgfactions, imgchores, imgstopwatch, imgkitchenIcon,
  imggobcarry,
} from './constants/images.js';

// Extracted utilities
import { computeRequiredSections } from './utils/sections.js';
import { hasPathData, hasSectionData, mergeTradeEntryHashesFromPayload, selectCurrentProjection } from './utils/farmState.js';
import { formatVipPromptMessage } from './utils/formatting.js';
import { isValidTryitConfig } from './tryitStorage.js';

// Extracted column constants (re-export for backward compatibility)
import {
  INV_COLUMNS_TEMPLATE, INV_COLUMNS_PICKER,
  COOK_COLUMNS_TEMPLATE, COOK_COLUMNS_PICKER,
  FISH_COLUMNS_TEMPLATE, FISH_COLUMNS_PICKER,
  CRUSTA_COLUMNS_TEMPLATE, CRUSTA_COLUMNS_PICKER,
  CROPMACHINE_COLUMNS_TEMPLATE, CROPMACHINE_COLUMNS_PICKER,
  EXPAND_COLUMNS_TEMPLATE, EXPAND_COLUMNS_PICKER,
  BUYNODES_COLUMNS_TEMPLATE, BUYNODES_COLUMNS_PICKER,
  AUCTIONS_COLUMNS_TEMPLATE, AUCTIONS_COLUMNS_PICKER,
} from './constants/tableColumns.js';

// Extracted modules
import { createUIHandlers } from './handlers/uiHandlers.js';
import { createOptionHandlers } from './handlers/optionHandlers.js';
import { createTooltipHandlers, refreshOpenTooltip } from './handlers/tooltipHandlers.js';
import { useUIState as useUIStateHook } from './hooks/useUIState.js';
import { useTryitSync } from './hooks/useTryitSync.js';
import { useAdminVIP } from './hooks/useAdminVIP.js';
import { useNotifications } from './hooks/useNotifications.js';
import { useFarmLoader } from './hooks/useFarmLoader.js';
import { useSectionLoader } from './hooks/useSectionLoader.js';
import { useAutoRefresh } from './hooks/useAutoRefresh.js';
import { useDataFetcher } from './hooks/useDataFetcher.js';
import { useStorage } from './hooks/useStorage.js';
import { useModalHandlers } from './hooks/useModalHandlers.js';
import { useNotificationHelpers } from './hooks/useNotificationHelpers.js';
import { useExpandHelpers } from './hooks/useExpandHelpers.js';
import { createPushService } from './services/pushService.js';

// Global state holders (kept for backward compatibility with existing code)
let dataSet = { balance: 0, coins: 0, options: {} };
let buttonClicked = false;
let curID = "";
const ASCENSION_EXPAND_TYPES = new Set([
  "swamp",
  "spooky",
  "crystal",
  "galaxy",
  "marble",
]);
const EXPAND_RANGES = {
  basic: { base: 1, max: 9 },
  spring: { base: 1, max: 16 },
  desert: { base: 1, max: 25 },
  volcano: { base: 1, max: 30 },
  swamp: { base: 30, max: 42 },
  spooky: { base: 30, max: 42 },
  crystal: { base: 30, max: 42 },
  galaxy: { base: 30, max: 42 },
  marble: { base: 30, max: 42 },
};

function normalizeExpandRange(type, rawFrom, rawTo) {
  const range = EXPAND_RANGES[type] || EXPAND_RANGES.spring;
  const from = Math.max(
    range.base,
    Math.min(range.max - 1, Number(rawFrom) || range.base),
  );
  const preservedTo = Math.max(
    range.base + 1,
    Math.min(range.max, Number(rawTo) || range.max),
  );
  const to = preservedTo > from
    ? preservedTo
    : Math.min(range.max, from + 1);

  return { from, to };
}

function App() {
  useAppVersionRefresh();

  // ========== Core State ==========
  const [initialDataSet, setInitialDataSet] = useState(null);
  const [notifListInitial, setNotifListInitial] = useState(null);
  const legacyAnimalLoveNotifKeys = useMemo(() => new Set([
    'Chicken needs love',
    'Cow needs love',
    'Sheep needs love',
  ]), []);
  const [options, setOptions] = useState({});
  const [GraphType, setGraphType] = useState('');
  const [priceData, setpriceData] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [vipLoading, setVipLoading] = useState(false);
  const [reqState, setReqState] = useState("");
  const [iaLoading] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showfTNFT, setShowfTNFT] = useState(false);
  const [showfGraph, setShowfGraph] = useState(false);
  const [showfDlvr, setShowfDlvr] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpStartMode, setHelpStartMode] = useState("page");
  const [showHelpReminder, setShowHelpReminder] = useState(false);
  const [showCadre, setShowCadre] = useState(false);
  const [sharedTryProfile, setSharedTryProfile] = useState(null);
  const [sectionsMeta, setSectionsMeta] = useState(null);
  const [sectionsMetaError, setSectionsMetaError] = useState("");
  const [listingsData, setlistingsData] = useState([]);
  const [tooltipData, setTooltipData] = useState(null);
  const [activeTimers] = useState([]);
  const [, setSectionsLoadingState] = useState(false);
  const [deliveriesData, setdeliveriesData] = useState([]);
  const [mutData, setmutData] = useState([]);
  const [autoRefreshStarted, setAutoRefreshStarted] = useState(false);
  const [autoRefreshFarmId, setAutoRefreshFarmId] = useState("");
  const [autoRefreshNonce, setAutoRefreshNonce] = useState(0);
  const [platformListings, setPlatformListings] = useState("Trades");
  const [loadFarmUiBusy, setLoadFarmUiBusy] = useState(false);
  const [farmLoadSyncNonce, setFarmLoadSyncNonce] = useState(0);
  const loadFarmUiBusyTimerRef = useRef(null);
  const lastAutoRefreshLoadNonceRef = useRef(0);

  // ========== Refs ==========
  const pendingSaveRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const initialPriceLoadRef = useRef(false);
  const tryNftOpenCoverageRef = useRef(null);
  const deliveryLastSyncRef = useRef({ farmId: "", pulse: -1 });
  const auctionNotifSyncTimerRef = useRef(null);
  const auctionNotifPendingSelectionRef = useRef(null);
  const loadFarmCooldownUntilRef = useRef(0);
  const loadFarmRequestInFlightRef = useRef(false);
  const loadFarmSpamClickTimesRef = useRef([]);
  const loadFarmSpamPromptOpenRef = useRef(false);
  const invBuyRefreshCooldownUntilRef = useRef(0);
  const hoveredTooltipCellRef = useRef(null);
  const deviceIdRef = useRef(getOrCreateDeviceId());
  const farmSectionHashesRef = useRef({});
  const farmTableHashesRef = useRef({});
  const tradeEntryHashesRef = useRef({});
  const firstVisitHelpRef = useRef(false);
  const helpReminderTimerRef = useRef(null);

  useEffect(() => () => {
    if (helpReminderTimerRef.current) {
      clearTimeout(helpReminderTimerRef.current);
    }
  }, []);

  // ========== UI State Hook ==========
  const {
    ui, setUI,
    TryChecked, selectedInv, fromexpand, toexpand, selectedExpandType, selectedExpandAscension,
    invPickerOptions, invPickerValue, invSortOptions,
    cookPickerOptions, cookPickerValue, cookSortOptions,
    fishPickerOptions, fishPickerValue,
    crustaPickerOptions, crustaPickerValue,
    cropMachinePickerOptions, cropMachinePickerValue,
    expandPickerOptions, expandPickerValue,
    buyNodesPickerOptions, buyNodesPickerValue,
    auctionsPickerOptions, auctionsPickerValue,
    activePetColumnsPicker, petPickerOptions, petPickerValue,
  } = useUIStateHook();

  // ========== Farm Data State ==========
  const [farmData, setFarmData] = useState([]);
  const [dataSetFarm, setdataSetFarm] = useState({});
  const [bumpkinData, setBumpkinData] = useState([]);
  const dataSetFarmRef = useRef({});
  const tooltipTryRevisionRef = useRef(0);
  useEffect(() => {
    const keys = Object.keys(dataSetFarm || {});
    const metadataKeys = keys.filter(k =>
      k === 'sectionHashes' || k === 'projectionHashes' || k === 'tableHashes' || k === 'unchangedSections' ||
      k === 'requestedSections' || k === 'returnedSections' || k === 'priceData'
    );
    if (metadataKeys.length > 0) {
      console.error('[FATAL] dataSetFarm state contains metadata keys:', metadataKeys, 'full keys:', keys);
      throw new Error('dataSetFarm state contains metadata keys: ' + metadataKeys.join(', '));
    }
    dataSetFarmRef.current = dataSetFarm || {};
  }, [dataSetFarm]);

  useEffect(() => {
    const nextRevision = Math.max(0, Math.floor(Number(dataSetFarm?.tryitRevision) || 0));
    const previousRevision = tooltipTryRevisionRef.current;
    tooltipTryRevisionRef.current = nextRevision;
    if (ui.interfaceMode !== "compact" && previousRevision > 0 && nextRevision > 0 && previousRevision !== nextRevision) {
      setTooltipData(null);
    }
  }, [dataSetFarm?.tryitRevision, ui.interfaceMode]);

  const isAboFarm = !!(dataSetFarm?.isabo ?? dataSet?.options?.isAbo);
  const aboStatusKnown = (dataSetFarm?.isabo !== undefined) || (dataSet?.options?.isAbo !== undefined);
  const canUseChatbot = isAboFarm;

  // ========== Section Meta ==========
  const pageSectionRequirements = useMemo(() => {
    const base = sectionsMeta?.pageSectionRequirements;
    if (!base || typeof base !== "object") return null;
    return {
      ...base,
      lavapits: Array.isArray(base?.lavapits) ? base.lavapits : ["core", "lavapits"],
      rngprediction: Array.isArray(base?.rngprediction) ? base.rngprediction : ["core", "rngprediction"],
    };
  }, [sectionsMeta]);
  const sectionPayloadKeys = sectionsMeta?.sectionKeys || null;
  const sectionTablePaths = sectionsMeta?.sectionTablePaths || null;
  const tryitConfig = sectionsMeta?.tryitConfig || null;
  const hasTryitConfig = isValidTryitConfig(tryitConfig);

  // ========== Tryit Sync Hook ==========
  const { getTryitRequestPayload, markTryitPending, buildAndWriteSnapshot, processPendingTryitSnapshot } = useTryitSync(dataSetFarmRef, tryitConfig);
  useEffect(() => {
    processPendingTryitSnapshot(dataSetFarm);
  }, [dataSetFarm, processPendingTryitSnapshot]);

  // ========== Create Services ==========
  const pushService = useMemo(() => createPushService(API_URL), []);

  // ========== Notifications Hook ==========
  const {
    handleNotificationToggle, updateNotifList, updateAuctionNotifList, checkBootStatus
  } = useNotifications(
    API_URL,
    () => String(dataSetFarm?.frmid || dataSet.options?.farmId || curID || ""),
    deviceIdRef,
    () => dataSet,
    setOptions,
    promptInfo,
    promptChoice,
    promptConfirm,
    pushService
  );

  // ========== Admin/VIP Hook ==========
  const {
    fetchAdminView, requestVipPayment, confirmVipPayment
  } = useAdminVIP(
    API_URL,
    () => dataSetFarm,
    () => dataSet,
    promptPass,
    promptChoice,
    promptInfo,
    promptInput
  );

  const optionHandlers = createOptionHandlers(dataSet, setOptions, handleNotificationToggle);
  const { handleOptionChange, setOptionField } = optionHandlers;

  const tooltipHandlers = createTooltipHandlers(setTooltipData, hoveredTooltipCellRef);
  const { handleTooltip, handleTooltipCellMouseOver, handleTooltipCellMouseOut, clearHoveredTooltipCell } = tooltipHandlers;

  useEffect(() => {
    if (!tooltipData?.anchor) return undefined;
    const frame = requestAnimationFrame(() => refreshOpenTooltip(tooltipData));
    return () => cancelAnimationFrame(frame);
  }, [options]);

  useEffect(() => {
    setTooltipData(null);
    if (hoveredTooltipCellRef.current) {
      hoveredTooltipCellRef.current.classList.remove('tooltipcell-hover');
      hoveredTooltipCellRef.current = null;
    }
  }, [selectedInv]);

  useEffect(() => {
    if (!showfDlvr && !showfTNFT) return;
    setTooltipData(null);
    if (hoveredTooltipCellRef.current) {
      hoveredTooltipCellRef.current.classList.remove('tooltipcell-hover');
      hoveredTooltipCellRef.current = null;
    }
  }, [showfDlvr, showfTNFT]);

  // ========== Storage Hook ==========
  const { setCookie, loadCookie, lastID, setLastID } = useStorage(
    dataSet, dataSetFarm, dataSetFarmRef, setdataSetFarm, setOptions, setUI, tryitConfig
  );

  useEffect(() => {
    if (!pendingSaveRef.current) return;
    pendingSaveRef.current = false;
    const farmState = dataSetFarmRef.current || dataSetFarm || {};
    if (typeof setCookie === 'function') {
      setCookie(farmState, dataSet);
    }
  }, [dataSetFarm, dataSet, setCookie]);

  useEffect(() => {
    loadCookie();
  }, [loadCookie]);

  useEffect(() => {
    if (isNativeApp) {
      StatusBar.setOverlaysWebView({ overlay: false });
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .catch(error => {
          console.error("Erreur lors de l'enregistrement du Service Worker:", error);
        });
    }
  }, []);

  // ========== Notification Helpers Hook ==========
  const { getCurrentNotifFarmId, buildAuctionWatchEntries } = useNotificationHelpers(
    dataSet, dataSetFarmRef, curID
  );

  // ========== Expand Helpers Hook ==========
  const {
    expandLoading, getFromToExpand
  } = useExpandHelpers(API_URL, dataSet, dataSetFarm, TryChecked);

  // ========== Farm Loader Hook ==========
  const {
    loadFarm, bumpkinLoading
  } = useFarmLoader(
    API_URL,
    () => curID,
    dataSetFarmRef,
    farmSectionHashesRef,
    farmTableHashesRef,
    tradeEntryHashesRef,
    loadFarmCooldownUntilRef,
    loadFarmRequestInFlightRef,
    loadFarmSpamClickTimesRef,
    getTryitRequestPayload,
    tryitConfig,
    promptInfo,
    dataSet,
    ui,
    setdataSetFarm,
    setFarmData,
    setBumpkinData
  );

  const setMutants = useCallback((dataSetMutant) => {
    const normalizedHeader = Array.isArray(dataSetMutant?.mutantsHeader)
      ? dataSetMutant.mutantsHeader
      : [];
    const extractFirstRewardItem = (entry) => {
      if (!entry) return null;
      if (Array.isArray(entry) && entry.length > 0) {
        if (Array.isArray(entry[0])) return extractFirstRewardItem(entry[0]);
        if (entry[0] && typeof entry[0] === "object") return entry[0];
        if (typeof entry[0] === "string") return { name: entry[0] };
      }
      if (typeof entry === "object" && !Array.isArray(entry)) {
        if (entry.name || entry.item || entry.key || entry.id) {
          return { ...entry, name: entry.name || entry.item || entry.key || entry.id };
        }
        const firstKey = Object.keys(entry)[0];
        if (firstKey) return { name: firstKey };
      }
      return null;
    };
    const tableMutant = normalizedHeader.length > 0
      ? normalizedHeader
      : (
        Array.isArray(dataSetMutant?.mutantchickens)
          ? dataSetMutant.mutantchickens.map((entry) => extractFirstRewardItem(entry)).filter(Boolean)
          : []
      );
    const mutItems = tableMutant.map((mutEntry, index) => {
      const itemObj = extractFirstRewardItem(mutEntry) || mutEntry || {};
      const itemName = itemObj?.name;
      let itemImg = itemObj?.img || imgna;
      if (!itemObj?.img && dataSetMutant?.boostables?.nft?.[itemName]) itemImg = dataSetMutant.boostables.nft[itemName]?.img;
      if (!itemObj?.img && dataSetMutant?.itables?.mutant?.[itemName]) itemImg = dataSetMutant.itables.mutant[itemName]?.img;
      return <img key={`mut-${index}-${itemName || "na"}`} src={itemImg} alt="" className="nftico" title={itemName || "Mutant"} />;
    });
    setmutData(tableMutant.length > 0
      ? <><span style={{ fontSize: "11px" }}>Mutant: {mutItems}</span></>
      : null
    );
  }, []);

  // ========== Data Fetcher Hook (needs getPrices early for section loader & auto refresh) ==========
  const { getPrices } = useDataFetcher(
    API_URL,
    ui,
    dataSet,
    dataSetFarmRef,
    farmSectionHashesRef,
    farmTableHashesRef,
    tradeEntryHashesRef,
    deviceIdRef,
    refreshInFlightRef,
    setpriceData,
    setFarmData,
    setBumpkinData,
    setdataSetFarm,
    setReqState,
    setOptions,
    setSectionsLoadingState,
    setMutants,
    setdeliveriesData,
    setCookie,
    sectionsMeta,
    sectionsMetaError,
    pageSectionRequirements,
    sectionPayloadKeys,
    sectionTablePaths,
    tryitConfig,
    getTryitRequestPayload,
    hasSectionData,
    hasPathData,
    showfDlvr
  );

  useEffect(() => {
    if (initialPriceLoadRef.current) return;
    if (typeof getPrices !== 'function') return;
    initialPriceLoadRef.current = true;
    getPrices(true, false, null, false, null, false, 'INITIAL_PRICES').catch(() => {});
  }, [getPrices]);

  useEffect(() => {
    return () => {
      if (loadFarmUiBusyTimerRef.current) {
        clearTimeout(loadFarmUiBusyTimerRef.current);
        loadFarmUiBusyTimerRef.current = null;
      }
    };
  }, []);

  // ========== Auto Refresh Hook (needs getPrices) ==========
  const {
    autoRefreshPulse, autoRefreshNextAt, autoRefreshDurationMs,
    setAutoRefreshDurationMs, setAutoRefreshNextAt,
    autoRefreshEnabled, autoRefreshActive, autoRefreshResetKey,
    autoRefreshForceNormalFirstCycleRef, bumpAutoRefreshPulse, markPageSyncedPulse,
    resetAutoRefreshTimer,
    getPageSyncedPulse
  } = useAutoRefresh(
    options,
    ui,
    dataSetFarm,
    autoRefreshStarted,
    autoRefreshFarmId,
    autoRefreshNonce,
    showfTNFT,
    showfGraph,
    showfDlvr,
    pageSectionRequirements,
    getPrices
  );

  useEffect(() => {
    if (!autoRefreshNonce) return;
    if (lastAutoRefreshLoadNonceRef.current === autoRefreshNonce) return;
    lastAutoRefreshLoadNonceRef.current = autoRefreshNonce;
    if (typeof resetAutoRefreshTimer === 'function') {
      resetAutoRefreshTimer(dataSetFarmRef.current || dataSetFarm || {});
    }
  }, [autoRefreshNonce, dataSetFarm?.frmid, resetAutoRefreshTimer, dataSetFarmRef, dataSetFarm]);

  // ========== Section Loader Hook (needs getPrices and auto refresh pulse) ==========
  const { sectionsLoading, headerRequestLoading } = useSectionLoader(
    ui,
    dataSetFarm,
    dataSetFarmRef,
    pageSectionRequirements,
    sectionPayloadKeys,
    sectionTablePaths,
    refreshInFlightRef,
    autoRefreshPulse,
    markPageSyncedPulse,
    getPageSyncedPulse,
    getTryitRequestPayload,
    getPrices
  );

  // ========== Modal Handlers Hook (needs getPrices) ==========
  const {
    handleButtonfTNFTClick,
    handleButtonfDlvrClick,
    handleClosefTNFT,
    handleRefreshfTNFT,
  } = useModalHandlers(
    dataSet,
    dataSetFarmRef,
    setdataSetFarm,
    setCookie,
    setdeliveriesData,
    setShowfTNFT,
    setShowfDlvr,
    getTryitRequestPayload,
    tryitConfig,
    sectionPayloadKeys,
    sectionTablePaths,
    farmSectionHashesRef,
    farmTableHashesRef,
    tryNftOpenCoverageRef,
    deliveryLastSyncRef,
    autoRefreshPulse,
    bumpAutoRefreshPulse,
    ui,
    pageSectionRequirements,
    lastID,
    getPrices
  );

  // ========== Handlers (needs getPrices, autoRefresh setters) ==========
  const uiHandlers = createUIHandlers(
    setUI, setdataSetFarm, dataSetFarmRef, pendingSaveRef, markTryitPending, buildAndWriteSnapshot,
    invBuyRefreshCooldownUntilRef, getPrices,
    autoRefreshForceNormalFirstCycleRef, setAutoRefreshDurationMs, setAutoRefreshNextAt,
    setAutoRefreshNonce, dataSetFarm, dataSet, tryitConfig, setCookie
  );
  const { handleUIChange, handleHomeClic, handleSetHrvMax, handleInvBuyRefresh, setUIField } = uiHandlers;

  // ========== Helper Functions ==========
  const refreshDataSet = useCallback((dataSetRefresh) => {
    let notifListChanged = false;
    const invIt = dataSetRefresh?.itables?.it;
    if (invIt) {
      const resolveNotifIconSrc = (key) => {
        const itemKey = String(key || "").trim();
        if (!itemKey) return null;
        if (itemKey === 'Honey') return imghoney;
        if (itemKey === 'Animal needs love') return imgchkn;
        if (invIt?.[itemKey]?.img) return invIt[itemKey].img;
        if (itemKey === 'Bee Swarm') return imgbeehive;
        if (itemKey === 'Market Sold') return imgcoins;
        if (itemKey === 'Crustaceans') return imgcrustacean;
        if (itemKey === 'Auctions') return imgcalendar;
        if (itemKey === 'Floating Island') return imgfloatingIsland;
        return null;
      };

      const ensureNotifOption = (key, label = key, iconSrc = null) => {
        if (!Array.isArray(dataSet.options.notifList)) {
          dataSet.options.notifList = [];
          notifListChanged = true;
        }
        const idx = dataSet.options.notifList.findIndex(([entryKey]) => entryKey === key);
        const current = idx >= 0 ? dataSet.options.notifList[idx] : null;
        const enabled = current && Number(current[1]) === 0 ? 0 : 1;
        const nextEntry = iconSrc
          ? [key, enabled, label, iconSrc]
          : [key, enabled, label];
        if (idx >= 0) {
          if (JSON.stringify(dataSet.options.notifList[idx]) !== JSON.stringify(nextEntry)) {
            notifListChanged = true;
          }
          dataSet.options.notifList[idx] = nextEntry;
        } else {
          notifListChanged = true;
          dataSet.options.notifList.push(nextEntry);
        }
      };

      const ensureNotifOptionAfter = (key, afterKeys, label = key, iconSrc = null) => {
        if (!Array.isArray(dataSet.options.notifList)) {
          dataSet.options.notifList = [];
          notifListChanged = true;
        }
        const idx = dataSet.options.notifList.findIndex(([entryKey]) => entryKey === key);
        const current = idx >= 0 ? dataSet.options.notifList[idx] : null;
        const enabled = current && Number(current[1]) === 0 ? 0 : 1;
        const nextEntry = iconSrc
          ? [key, enabled, label, iconSrc]
          : [key, enabled, label];
        if (idx >= 0) {
          if (JSON.stringify(dataSet.options.notifList[idx]) !== JSON.stringify(nextEntry)) {
            notifListChanged = true;
          }
          dataSet.options.notifList[idx] = nextEntry;
          return;
        }
        const anchors = Array.isArray(afterKeys) ? afterKeys : [afterKeys];
        let insertAt = -1;
        anchors.forEach((anchorKey) => {
          const anchorIdx = dataSet.options.notifList.findLastIndex?.(([entryKey]) => entryKey === anchorKey)
            ?? dataSet.options.notifList.findIndex(([entryKey]) => entryKey === anchorKey);
          if (anchorIdx > insertAt) insertAt = anchorIdx;
        });
        if (insertAt >= 0) {
          dataSet.options.notifList.splice(insertAt + 1, 0, nextEntry);
        } else {
          dataSet.options.notifList.push(nextEntry);
        }
        notifListChanged = true;
      };

      if (Array.isArray(dataSet.options.notifList)) {
        const nextNotifList = dataSet.options.notifList.map((entry) => {
          if (!Array.isArray(entry)) return entry;
          const key = String(entry[0] || "").trim();
          if (!key || legacyAnimalLoveNotifKeys.has(key)) return null;
          const enabled = Number(entry[1]) === 0 ? 0 : 1;
          const label = String(entry[2] || key).trim() || key;
          const resolvedIconSrc = resolveNotifIconSrc(key);
          const iconSrc = resolvedIconSrc || (typeof entry[3] === "string" && entry[3].trim() ? entry[3] : null);
          return iconSrc ? [key, enabled, label, iconSrc] : [key, enabled, label];
        }).filter(Boolean);
        if (JSON.stringify(nextNotifList) !== JSON.stringify(dataSet.options.notifList)) {
          notifListChanged = true;
        }
        dataSet.options.notifList = nextNotifList;
      }

      if (!dataSet.options?.animalLvl) {
        dataSet.options.animalLvl = Object.fromEntries(
          Object.keys(dataSetRefresh?.Animals || {}).map(animal => [animal, 5])
        );
      }
      if (!Array.isArray(dataSet.options?.notifList) || dataSet.options.notifList.length === 0) {
        dataSet.options.notifList = Object.keys(invIt)
          .filter(key => !(invIt[key]?.matcat === 2) && !(key === "Wild Mushroom") && !(key === "Magic Mushroom"))
          .map(key => {
            const iconSrc = resolveNotifIconSrc(key);
            return iconSrc ? [key, 1, key, iconSrc] : [key, 1, key];
          });
        notifListChanged = true;
      }
      if (!dataSet.options.notifList.some(([key]) => key === 'Bee Swarm')) {
        ensureNotifOption('Bee Swarm', 'Bee Swarm', resolveNotifIconSrc('Bee Swarm'));
      }
      ensureNotifOptionAfter('Honey', 'Bee Swarm', 'Honey', resolveNotifIconSrc('Honey'));
      ensureNotifOptionAfter('Salt', 'Oil', 'Salt', resolveNotifIconSrc('Salt'));
      if (!dataSet.options.notifList.some(([key]) => key === 'Market Sold')) {
        ensureNotifOption('Market Sold', 'Market Sold', resolveNotifIconSrc('Market Sold'));
      }
      if (!dataSet.options.notifList.some(([key]) => key === 'Animal needs love')) {
        ensureNotifOption('Animal needs love', 'Animal needs love', resolveNotifIconSrc('Animal needs love'));
      }
      if (!dataSet.options.notifList.some(([key]) => key === 'Crustaceans')) {
        ensureNotifOption('Crustaceans', 'Crustaceans', resolveNotifIconSrc('Crustaceans'));
      }
      if (!dataSet.options.notifList.some(([key]) => key === 'Auctions')) {
        ensureNotifOption('Auctions', 'Auctions', resolveNotifIconSrc('Auctions'));
      }
      if (!dataSet.options.notifList.some(([key]) => key === 'Floating Island')) {
        ensureNotifOption('Floating Island', 'Floating Island', resolveNotifIconSrc('Floating Island'));
      }
    }
    return notifListChanged;
  }, [dataSet]);

  // ========== Auction Notif Sync ==========
  const syncAuctionNotifSelectionDebounced = async (selectionSource = null) => {
    if (!dataSet.options?.useNotifications) return;
    if (!getCurrentNotifFarmId()) return;
    try {
      await updateAuctionNotifList(buildAuctionWatchEntries(selectionSource || dataSet.options?.auctionNotifSelection));
    } catch (error) {
      console.error("Error syncing auction notifications:", error);
    }
  };

  const scheduleAuctionNotifSelectionSync = (selectionSource = null) => {
    auctionNotifPendingSelectionRef.current = selectionSource || dataSet.options?.auctionNotifSelection || null;
    if (auctionNotifSyncTimerRef.current) {
      clearTimeout(auctionNotifSyncTimerRef.current);
    }
    auctionNotifSyncTimerRef.current = setTimeout(() => {
      auctionNotifSyncTimerRef.current = null;
      const pendingSelection = auctionNotifPendingSelectionRef.current;
      auctionNotifPendingSelectionRef.current = null;
      syncAuctionNotifSelectionDebounced(pendingSelection);
    }, AUCTION_NOTIF_SYNC_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (auctionNotifSyncTimerRef.current) {
        clearTimeout(auctionNotifSyncTimerRef.current);
        auctionNotifSyncTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    checkBootStatus();
  }, [dataSetFarm?.frmid, dataSet.options?.farmId, dataSet.options?.useNotifications, checkBootStatus]);

  useEffect(() => {
    if (!aboStatusKnown) return;
    if (!["lavapits", "rngprediction", "supply"].includes(String(ui?.selectedInv || "home"))) return;
    if (isAboFarm) return;
    setUIField("selectedInv", "home");
  }, [aboStatusKnown, isAboFarm, ui?.selectedInv, setUIField]);

  useEffect(() => {
    const fixedAscensionByIsland = {
      swamp: 1,
      spooky: 2,
      crystal: 3,
      galaxy: 4,
    };
    const fixedAscension = fixedAscensionByIsland[selectedExpandType];
    const normalizedAscension = fixedAscension
      || (selectedExpandType === "marble"
        ? Math.max(5, Number(selectedExpandAscension) || 5)
        : Number(selectedExpandAscension) || 1);
    if (
      ASCENSION_EXPAND_TYPES.has(selectedExpandType)
      && normalizedAscension !== Number(selectedExpandAscension)
    ) {
      setUI((previous) => ({
        ...previous,
        selectedExpandAscension: normalizedAscension,
      }));
      return;
    }

    setUI((previous) => {
      const normalized = normalizeExpandRange(
        selectedExpandType,
        previous.fromexpand,
        previous.toexpand,
      );
      if (
        Number(previous.fromexpand) === normalized.from
        && Number(previous.toexpand) === normalized.to
      ) {
        return previous;
      }
      return {
        ...previous,
        fromexpand: normalized.from,
        toexpand: normalized.to,
      };
    });
  }, [
    selectedExpandType,
    selectedExpandAscension,
    fromexpand,
    toexpand,
    setUI,
  ]);

  useEffect(() => {
    const normalized = normalizeExpandRange(selectedExpandType, fromexpand, toexpand);
    if (
      Number(fromexpand) !== normalized.from
      || Number(toexpand) !== normalized.to
    ) {
      return;
    }
    getFromToExpand(
      normalized.from + 1,
      normalized.to,
      selectedExpandType,
      selectedExpandAscension,
    );
  }, [
    fromexpand,
    toexpand,
    selectedExpandType,
    selectedExpandAscension,
    dataSetFarm?.frmid,
    dataSetFarm?.spot,
    dataSet.options?.farmId,
    getFromToExpand,
  ]);

  useEffect(() => {
    const it = dataSetFarm?.itables?.it
      || selectCurrentProjection(dataSetFarm, "invData")?.itables?.it
      || selectCurrentProjection(dataSetFarm, "cookData")?.itables?.it;
    if (!it) return;
    const nextHrvst = {};
    const nextHrvstTry = {};
    for (const item in it) {
      const dc = it[item]?.dailycycle ?? 0;
      const dcTry = it[item]?.dailycycletry ?? dc;
      if (dc > 0) nextHrvst[item] = Math.ceil(Number(dc));
      if (dcTry > 0) nextHrvstTry[item] = Math.ceil(Number(dcTry));
    }
    setUI((prev) => ({
      ...prev,
      xHrvst: { ...nextHrvst, ...(prev.xHrvst ?? {}) },
      xHrvsttry: { ...nextHrvstTry, ...(prev.xHrvsttry ?? {}) },
    }));
  }, [dataSetFarm, setUI]);

  // ========== Shared Profile Load ==========
  useEffect(() => {
    let cancelled = false;
    const loadSharedProfile = async () => {
      const sharedProfile = await parseTryProfileFromLocation();
      if (cancelled) return;
      if (sharedProfile && typeof sharedProfile === "object") {
        const directBoostChanges = Array.isArray(sharedProfile?.boostChanges) ? sharedProfile.boostChanges : [];
        const sharedRows = buildSharedBoostChangesRows(sharedProfile);
        const rows = directBoostChanges.length > 0
          ? directBoostChanges
          : sharedRows.length > 0
            ? sharedRows
            : buildTryProfileSummaryRows(sharedProfile).map((row) => ({
              ...row,
              status: "added",
              section: row?.section || "",
              category: row?.category || "Other",
            }));
        setSharedTryProfile({
          ...sharedProfile,
          compareMode: "shared",
          profileName: String(sharedProfile?.profileName || "Shared"),
          boostChanges: rows,
        });
      }
    };
    loadSharedProfile();
    return () => { cancelled = true; };
  }, []);

  // ========== Handle Button Click (Farm Load) ==========
  const handleButtonClick = async (context = null) => {
    const registerLoadFarmSpamAttempt = () => {
      const nowTs = Date.now();
      const recent = (loadFarmSpamClickTimesRef.current || []).filter((ts) => (nowTs - ts) <= LOAD_FARM_SPAM_WINDOW_MS);
      recent.push(nowTs);
      loadFarmSpamClickTimesRef.current = recent;
      if (recent.length < LOAD_FARM_SPAM_THRESHOLD) return;
      if (loadFarmSpamPromptOpenRef.current) return;
      loadFarmSpamPromptOpenRef.current = true;
      loadFarmSpamClickTimesRef.current = [];
      promptInfo(
        "No need to spam this button. The server can take up to 20 seconds to provide up-to-date farm data.",
        "Please wait",
        "Got it"
      ).finally(() => { loadFarmSpamPromptOpenRef.current = false; });
    };

    const { inputValue } = ui;
    if (inputValue === null || inputValue === "" || inputValue === 0) return;
    if (!pageSectionRequirements || !sectionPayloadKeys || !sectionTablePaths) {
      setReqState(sectionsMetaError || "Initialization in progress, please retry in a second.");
      return;
    }
    if (!hasTryitConfig) {
      setReqState(sectionsMetaError || "Tryset config missing. Local selections are preserved; calculations are paused until backend config reloads.");
      return;
    }
    const now = Date.now();
    if (loadFarmRequestInFlightRef.current) { registerLoadFarmSpamAttempt(); return; }
    if (now < loadFarmCooldownUntilRef.current) { registerLoadFarmSpamAttempt(); return; }

    buttonClicked = true;
    setAutoRefreshFarmId(String(inputValue ?? "").trim());
    setAutoRefreshStarted(true);
    setAutoRefreshNonce((v) => v + 1);
    loadFarmSpamClickTimesRef.current = [];
    loadFarmRequestInFlightRef.current = true;
    loadFarmCooldownUntilRef.current = now + LOAD_FARM_COOLDOWN_MS;
    activeTimers?.forEach(timerId => clearInterval(timerId));
    setLoadFarmUiBusy(true);

    try {
      const normalizedInputId = String(inputValue ?? "").trim();
      const currentLoadedFarmId = String(dataSetFarmRef.current?.frmid || dataSet?.options?.farmId || "").trim();
      const normalizedInputUsername = normalizedInputId.toLowerCase();
      const currentLoadedUsername = String(dataSet?.options?.username || dataSetFarmRef.current?.username || "").trim().toLowerCase();
      const keepCurrentViewWhileRefreshing = buttonClicked && normalizedInputId !== "" && (
        normalizedInputId === currentLoadedFarmId ||
        (normalizedInputUsername !== "" && normalizedInputUsername === currentLoadedUsername)
      );
      const currentFarmStateBeforeRefresh = dataSetFarmRef.current || dataSetFarm || {};
      // Loading another farm is not a Tryset edit. The persisted client
      // snapshot remains the source of truth and must not be rebuilt here.
      if (typeof setCookie === 'function') {
        setCookie(currentFarmStateBeforeRefresh, dataSet, lastID);
      }
      pendingSaveRef.current = false;

      curID = inputValue;
      if (!keepCurrentViewWhileRefreshing) {
        farmSectionHashesRef.current = {};
        farmTableHashesRef.current = {};
        tradeEntryHashesRef.current = {};
        // Keep the current farm state while the new payload is loading so
        // client-side fields like cookit are not reset to zero before merge.
      }

      const requiredSections = computeRequiredSections(ui, pageSectionRequirements);
      const includeSections = [...new Set([...requiredSections, "trades"])];
      if (context === "EnterPressed") { setFarmData([]); }

      const loadResult = await loadFarm(curID, includeSections, context, ui, dataSet, deviceIdRef.current);
      
      if (!loadResult?.success) {
        setReqState(loadResult?.error || "");
        return;
      }

      if (loadResult?.success) {
        buttonClicked = true;
        setFarmLoadSyncNonce((v) => v + 1);
        setAutoRefreshFarmId(String(dataSetFarmRef.current?.frmid || dataSet?.options?.farmId || curID || "").trim());
        
        if (loadResult.expandData) {
          const loadedExpandType = String(loadResult.expandData.type || "spring");
          const expandMaximums = {
            basic: 9,
            spring: 16,
            desert: 25,
            volcano: 30,
            swamp: 42,
            spooky: 42,
            crystal: 42,
            galaxy: 42,
            marble: 42,
          };
          setUIField("selectedExpandType", loadedExpandType);
          setUIField(
            "fromexpand",
            Number(loadResult.expandData.current)
              || (ASCENSION_EXPAND_TYPES.has(loadedExpandType) ? 30 : 1),
          );
          setUIField(
            "toexpand",
            expandMaximums[loadedExpandType] || 16,
          );
          if (Number(loadResult.expandData.ascensionLevel) > 0) {
            setUIField("selectedExpandAscension", Number(loadResult.expandData.ascensionLevel));
          }
        }
        
        const notifListChanged = refreshDataSet(dataSetFarmRef.current);
        if (notifListChanged && dataSet.options.useNotifications) {
          await updateNotifList();
        }
        
        const Fish = loadResult.Fish;
        if (Fish) {
          const xfishcastmax = TryChecked ? Fish.CastMaxtry : Fish.CastMax;
          const xfishcost = (TryChecked ? Fish.CastCosttry : Fish.CastCost) / dataSet.options.coinsRatio;
          dataSet.fishcasts = Fish.casts + '/' + xfishcastmax;
          dataSet.fishcosts = parseFloat(Fish.casts * xfishcost).toFixed(3) + '/' + parseFloat(xfishcastmax * xfishcost).toFixed(3);
        }
        
        if (dataSet.options.firstLoad) {
          dataSet.options.firstLoad = false;
          handleFirstVisitHelpOpen();
        }
        
        if (context === "optionChanged") {
          bumpAutoRefreshPulse(ui?.selectedInv || "home");
        }
        
        setMutants(loadResult.mutantsData || loadResult.mergedFarm || dataSetFarmRef.current);
        
        if (loadResult.orderstable) {
          setdeliveriesData(loadResult.orderstable);
        }
        
        setCookie(dataSetFarmRef.current, dataSet, lastID);
        
        // Load missing sections after farm load
        try {
          await getPrices(false, true, null, false, null, false, 'FARM_LOAD');
        } catch (error) {
          console.error('Error loading sections after farm load:', error);
        } finally {
          setAutoRefreshNonce((v) => v + 1);
        }
      }
      
      setLastID(curID);
    } finally {
      loadFarmRequestInFlightRef.current = false;
      setLoadFarmUiBusy(false);
      if (loadFarmUiBusyTimerRef.current) {
        clearTimeout(loadFarmUiBusyTimerRef.current);
        loadFarmUiBusyTimerRef.current = null;
      }
      const remainingCooldownMs = Math.max(0, Number(loadFarmCooldownUntilRef.current || 0) - Date.now());
      loadFarmUiBusyTimerRef.current = setTimeout(() => {
        loadFarmUiBusyTimerRef.current = null;
      }, remainingCooldownMs);
    }
  };

  // ========== Modal Close Handlers ==========
  const handleCloseOptions = useCallback(() => {
    setShowOptions(false);
    setCookie();
    if (notifListInitial && JSON.stringify(dataSet.options.notifList) !== notifListInitial) {
      updateNotifList();
    }
  }, [notifListInitial, dataSet, setCookie]);

  const handleCloseHelp = useCallback(() => {
    setShowHelp(false);
    if (!firstVisitHelpRef.current) return;
    firstVisitHelpRef.current = false;
    setShowHelpReminder(true);
    if (helpReminderTimerRef.current) {
      clearTimeout(helpReminderTimerRef.current);
    }
    helpReminderTimerRef.current = setTimeout(() => {
      helpReminderTimerRef.current = null;
      setShowHelpReminder(false);
    }, 10000);
  }, []);
  const handleCloseCadre = useCallback(() => { setShowCadre(false); }, []);
  const handleCloseTryProfileSummary = useCallback(() => { setSharedTryProfile(null); clearTryProfileFromUrl(); }, []);
  const handleClosefGraph = useCallback(() => { setShowfGraph(false); }, []);
  const handleClosefDlvr = useCallback(() => { setShowfDlvr(false); }, []);
  const handleButtonOptionsClick = useCallback(async () => {
    if (
      (!Array.isArray(dataSet.options?.notifList) || dataSet.options.notifList.length === 0) &&
      (dataSetFarmRef.current?.frmid || dataSet.options?.farmId)
    ) {
      try {
        const farmWithInventory = await getPrices(
          false,
          true,
          ["inventory"],
          false,
          "inv",
          true,
          "OPTIONS_NOTIFICATIONS"
        );
        if (farmWithInventory) {
          refreshDataSet(farmWithInventory);
          setOptions({ ...dataSet.options });
        }
      } catch (error) {
        console.error("Unable to initialize notification options:", error);
      }
    }
    if (Array.isArray(dataSet.options?.notifList)) {
      dataSet.options.notifList = dataSet.options.notifList.filter((entry) => {
        if (!Array.isArray(entry)) return true;
        const key = String(entry[0] || "").trim();
        return !legacyAnimalLoveNotifKeys.has(key);
      });
    }
    setInitialDataSet(JSON.parse(JSON.stringify(dataSet)));
    setNotifListInitial(JSON.stringify(dataSet.options.notifList));
    setShowOptions(true);
  }, [dataSet, dataSetFarmRef, getPrices, legacyAnimalLoveNotifKeys, refreshDataSet, setOptions]);
  const handleButtonHelpClick = useCallback(() => {
    firstVisitHelpRef.current = false;
    setHelpStartMode("page");
    setShowHelpReminder(false);
    if (helpReminderTimerRef.current) {
      clearTimeout(helpReminderTimerRef.current);
      helpReminderTimerRef.current = null;
    }
    setShowHelp(true);
  }, []);
  const handleFirstVisitHelpOpen = useCallback(() => {
    firstVisitHelpRef.current = true;
    setHelpStartMode("features");
    setShowHelpReminder(false);
    setShowHelp(true);
  }, []);
  const handleButtonIAClick = useCallback(() => {
    if (!canUseChatbot) return;
    setShowChatbot(true);
  }, [canUseChatbot]);

  // ========== Trade/Graph Handlers ==========
  const handleTraderClick = useCallback(() => { setGraphType("Marketplace"); setShowfGraph(true); }, []);
  const handleNiftyClick = useCallback(() => { setGraphType("Nifty"); setShowfGraph(true); }, []);
  const handleOSClick = useCallback(() => { setGraphType("OpenSea"); setShowfGraph(true); }, []);

  const handleTradeListClick = useCallback(async (frmid, element, platform) => {
    setPlatformListings(platform);
    if (platform === "OS") {
      try {
        const responseData = await fetchJson(API_URL, "/get50listing", {
          method: 'GET',
          headers: { frmid: frmid, listid: element, platform: platform },
        });
        if (responseData !== 'error') { setlistingsData(responseData); setShowCadre(true); }
      } catch (error) { console.log(error); }
    }
  }, [API_URL]);

  const handleAdminClick = useCallback(async () => {
    const farmId = Number(dataSetFarm?.frmid || dataSet?.options?.farmId || 0);
    if (farmId !== 1972) return;
    try {
      setAdminLoading(true);
      const responseData = await fetchAdminView({ mode: "summary" }, true);
      setAdminData(responseData);
      setShowAdmin(true);
      setReqState("");
    } catch (error) {
      const msg = String(error?.message || "Admin error");
      if (msg.toLowerCase().includes("cancelled")) return;
      setReqState(msg);
    } finally { setAdminLoading(false); }
  }, [dataSetFarm, dataSet, fetchAdminView]);

  const handleVipClick = useCallback(async () => {
    const farmId = Number(dataSetFarm?.frmid || dataSet?.options?.farmId || 0);
    if (!farmId || farmId === 1972) return;
    const username = String(dataSet?.options?.username || dataSetFarm?.username || "");
    const isAbo = !!dataSet?.options?.isAbo;
    const aboExpiresAt = dataSet?.aboExpiresAt || dataSetFarm?.aboExpiresAt || 0;

    const action = await promptChoice(
      formatVipPromptMessage({ farmId, username, isAbo, aboExpiresAt }),
      "Supporter",
      [
        { value: "usdc_polygon", label: "USDC Polygon", primary: true, iconSrc: imgusdc, labelIconSrc: imgmatic },
        { value: "usdc_base", label: "USDC Base", iconSrc: imgusdc, labelIconSrc: imgbase },
        { value: "eth_base", label: "ETH Base", iconSrc: imgeth, labelIconSrc: imgbase },
        { value: "flower_base", label: "FLOWER Base", iconSrc: imgsfl, labelIconSrc: imgbase },
        { value: "close", label: "Close" },
      ],
      { closeOnBackdrop: false }
    );
    if (action === "close") return;

    try {
      setVipLoading(true);
      const paymentChoice = action === "flower_base"
        ? { tokenSymbol: "FLOWER", chainKey: "base" }
        : action === "eth_base" ? { tokenSymbol: "ETH", chainKey: "base" }
        : action === "usdc_base" ? { tokenSymbol: "USDC", chainKey: "base" }
        : { tokenSymbol: "USDC", chainKey: "polygon" };

      const responseData = await requestVipPayment({
        farmId, username, isAbo, vipExpiresAt: aboExpiresAt,
        tokenSymbol: paymentChoice.tokenSymbol, chainKey: paymentChoice.chainKey,
      });

      const paymentAction = await promptChoice(
        String(responseData?.message || `Payment request sent for farm ${farmId}.`),
        "Supporter",
        [
          { value: "paid", label: `I donated on ${responseData?.chainLabel || "Polygon"}`, primary: true },
          { value: "close", label: "Close" },
        ],
        { closeOnBackdrop: false }
      );
      if (paymentAction !== "paid") { setReqState(""); return; }

      const txHash = await promptInput(
        `Paste the ${(responseData?.chainLabel || "Polygon")}Scan link or the transaction hash.`,
        "Supporter", `0x... or ${(responseData?.explorerBaseUrl || "https://polygonscan.com")}/tx/...`,
        "", "Validate", "Close",
        { closeOnBackdrop: false }
      );
      if (txHash === null) { setReqState(""); return; }

      const confirmation = await confirmVipPayment({ paymentId: responseData?.paymentId, txHash });
      dataSet.options.isAbo = true;
      dataSet.aboExpiresAt = confirmation?.expiresAt || dataSet.aboExpiresAt || 0;
      setdataSetFarm((prev) => ({ ...(prev || {}), isabo: true }));

      try { await handleButtonClick("manualLoad"); } catch { /* keep confirmation */ }
      await promptInfo(
        String(confirmation?.message || `Payment confirmed for farm ${farmId}.`),
        "Supporter",
        "Close",
        { closeOnBackdrop: false }
      );
      setReqState("");
    } catch (error) {
      const msg = String(error?.message || "Supporter error");
      setReqState(msg);
      await promptInfo(msg, "Supporter", "Close", { closeOnBackdrop: false });
    } finally { setVipLoading(false); }
  }, [dataSetFarm, dataSet, requestVipPayment, confirmVipPayment]);

  // ========== Page Options ==========
  const pageOptions = [
    { value: "home", label: "Home", iconSrc: imgplayerCount },
    { value: "inv", label: "Farm", iconSrc: imgshovel },
    { value: "cook", label: "Cook", iconSrc: imgchefHat },
    { value: "fish", label: "Fish", iconSrc: imgfish },
    { value: "flower", label: "Flower", iconSrc: imgredPansy },
    { value: "bounty", label: "Dig", iconSrc: imgsandShovel },
    { value: "animal", label: "Animals", iconSrc: imgchkn },
    { value: "pet", label: "Pets", iconSrc: imgpet },
    { value: "craft", label: "Craft", iconSrc: imgbeeBox },
    { value: "cropmachine", label: "Crop Machine", iconSrc: imgefficiencyExtModule },
    { value: "map", label: "Map", iconSrc: imgworld },
    { value: "expand", label: "Expand", iconSrc: imghammer },
    { value: "buynodes", label: "Buy nodes", iconSrc: imgsunstoneRock1 },
    ...(isAboFarm ? [{ value: "lavapits", label: "Lavapits", iconSrc: imglavaPit }] : []),
    ...(isAboFarm ? [{ value: "rngprediction", label: "RNG", iconSrc: imglightning }] : []),
    ...(isAboFarm ? [{ value: "supply", label: "Supply", iconSrc: imgfloatingIsland }] : []),
    { value: "factions", label: "Factions", iconSrc: imgfactions },
    { value: "market", label: "Market", iconSrc: imgexchng },
    { value: "chapter", label: "Chapter", iconSrc: imgchapter },
    { value: "auctions", label: "Auctions", iconSrc: imgcalendar },
    ...(dataSet.options.isAbo ? [{ value: "activity", label: "Activity", iconSrc: imgstopwatch }] : []),
    { value: "toplists", label: "Lists", iconSrc: imgtrophy },
  ];

  const requiredSectionsForView = useMemo(
    () => computeRequiredSections(ui, pageSectionRequirements),
    [ui?.selectedInv, ui?.activityDisplay, ui?.fishView, ui?.petView, pageSectionRequirements]
  );
  const isCurrentPageDataReady = useMemo(
    () => {
      return requiredSectionsForView.every((section) => hasSectionData(dataSetFarm, section, sectionPayloadKeys, sectionTablePaths));
    },
    [requiredSectionsForView, dataSetFarm, sectionPayloadKeys, sectionTablePaths, ui?.selectedInv]
  );
  const canRenderCurrentPage = useMemo(() => isCurrentPageDataReady, [isCurrentPageDataReady]);
  const isAdminFarm = Number(dataSetFarm?.frmid || dataSet?.options?.farmId || 0) === 1972;

  // ========== Context ==========
  const data = useMemo(() => {
    return {
      dataSet, dataSetFarm, farmData, bumpkinData, bumpkinLoading, priceData, tooltipData, farmLoadSyncNonce
    };
  }, [dataSet, dataSetFarm, farmData, bumpkinData, bumpkinLoading, priceData, tooltipData, farmLoadSyncNonce]);

  const config = useMemo(() => ({ API_URL, tryitConfig }), [API_URL, tryitConfig]);

  const actions = useMemo(() => ({
    handleUIChange, handleOptionChange, setUIField, setOptionField,
    syncAuctionNotifSelection: scheduleAuctionNotifSelectionSync,
    handleTooltip, handleHomeClic, handleTraderClick, handleNiftyClick, handleOSClick,
    handleTradeListClick, handleRefreshfTNFT, handleSetHrvMax, handleInvBuyRefresh
  }), [handleUIChange, handleOptionChange, setUIField, setOptionField, scheduleAuctionNotifSelectionSync,
    handleTooltip, handleHomeClic, handleTraderClick, handleNiftyClick, handleOSClick,
    handleTradeListClick, handleRefreshfTNFT, handleSetHrvMax, handleInvBuyRefresh]);

  const img = useMemo(() => ({
    imgsfl, imgSFL, imgcoins, imgCoins, imgxp, imgrdy, imgwinter, imgspring,
    imgsummer, imgautumn, imgcrop, imgwood, imgstone, imgsaltfarm, imgbeehive, imgcow, imgsheep,
    imgflowerbed, imgchkn, imgpet, imgcrustacean, imgexchng, imgExchng, imgprodit, imgbuyit, imgna, imgrod,
  }), [imgsfl, imgSFL, imgcoins, imgCoins, imgxp, imgrdy, imgwinter, imgspring, imgsummer, imgautumn,
    imgcrop, imgwood, imgstone, imgsaltfarm, imgbeehive, imgcow, imgsheep, imgflowerbed, imgchkn, imgpet,
    imgcrustacean, imgexchng, imgExchng, imgprodit, imgbuyit, imgna, imgrod]);

  const ctx = useMemo(() => ({ data, config, ui, actions, img }), [data, config, ui, actions, img]);

  // ========== Effects ==========
  useEffect(() => {
    return () => { clearHoveredTooltipCell(); };
  }, []);

  useEffect(() => {
    if (!canUseChatbot && showChatbot) {
      setShowChatbot(false);
    }
  }, [canUseChatbot, showChatbot]);

  // ========== Load Sections Meta ==========
  useEffect(() => {
    const loadSectionsMeta = async () => {
      try {
        const meta = await fetchJson(API_URL, "/getsectionsmeta", { method: "GET" });
        const pageReq = meta?.pageSectionRequirements;
        const secKeys = meta?.sectionKeys;
        const secTablePaths = meta?.sectionTablePaths;
        const trConfig = meta?.tryitConfig;
        const valid =
          pageReq && typeof pageReq === "object" &&
          secKeys && typeof secKeys === "object" &&
          secTablePaths && typeof secTablePaths === "object" &&
          trConfig && typeof trConfig === "object" &&
          Array.isArray(trConfig?.boostTables) && trConfig.boostTables.length > 0 &&
          trConfig?.itemTables && typeof trConfig.itemTables === "object" &&
          Array.isArray(pageReq?.home) &&
          Array.isArray(secKeys?.core);
        if (!valid) {
          setSectionsMeta(null);
          setSectionsMetaError("Config sections invalid (backend)");
          return;
        }
        setSectionsMeta({
          pageSectionRequirements: pageReq,
          sectionKeys: secKeys,
          sectionTablePaths: secTablePaths,
          tryitConfig: trConfig,
        });
        setSectionsMetaError("");
      } catch {
        setSectionsMeta(null);
        setSectionsMetaError("Unable to load sections config");
      }
    };
    loadSectionsMeta();
  }, []);

  const bumpkinLevelLabel = (
    bumpkinData[0]?.levelLabel ||
    (bumpkinData[0]?.lvl > 0 ? `lvl ${bumpkinData[0].lvl}` : "")
  );

  // ========== Render ==========
  return (
    <>
      <div
        className={`App interface-${ui.interfaceMode === "compact" ? "compact" : "classic"}`}
        onMouseOver={handleTooltipCellMouseOver}
        onMouseOut={handleTooltipCellMouseOut}
        onMouseLeave={clearHoveredTooltipCell}
      >
        <div className="top-frame">
          <h1 className="App-h1">
            <div className="vertical">
              <div onClick={(e) => handleTooltip("", "username", "", e)}>
                {dataSet?.options?.username && dataSet?.options?.username !== "" ? dataSet.options.username + (bumpkinLevelLabel ? ` · ${bumpkinLevelLabel}` : "") :
                  <span>Farm ID or name</span>}</div>
              <div className="horizontal">
                <input
                  type="text" name="inputValue"
                  value={ui?.inputValue ?? ""}
                  onChange={handleUIChange}
                  onKeyDown={(e) => { if (e.key === "Enter") { handleButtonClick("EnterPressed"); } }}
                  style={{ width: '65px' }}
                />
                <div className="coach-search-refresh-target" style={{ position: "relative", left: -4, top: 0 }}>
                  <button
                    name="getFarm" onClick={() => { handleButtonClick(); }}
                    data-help-id="farm-search"
                    className={`button ${loadFarmRequestInFlightRef.current ? 'is-wait' : ''}`} style={{ left: 1, top: 3, zIndex: 2 }}
                    disabled={!sectionsMeta || loadFarmRequestInFlightRef.current}
                  >
                    <img src={imgsearch} alt="" className="resico" />
                  </button>
                  <div className="coach-autorefresh-target" style={{ position: "absolute", left: -1, top: 0, pointerEvents: "none", zIndex: 1 }}>
                    <AutoRefreshProgress
                      key={autoRefreshResetKey}
                      active={autoRefreshActive}
                      resetKey={autoRefreshResetKey}
                      durationMs={autoRefreshDurationMs}
                      deadlineMs={autoRefreshNextAt}
                      variant="circle"
                    />
                  </div>
                </div>
              </div>
              <div style={{ pointerEvents: 'none', fontSize: '9px', color: 'gray' }}>
                {farmData?.updated ? (<UpdatedSince unixTime={farmData?.updated} />) : ""}
              </div>
              {buttonClicked ? (
                <div className="vertical" style={{ transform: 'translate(105px, 0%)' }}>
                  <div className="horizontal">
                    <button
                      onClick={handleButtonfTNFTClick}
                      data-help-id="boosts-shortcut"
                      title={hasTryitConfig ? "NFT" : "Tryset config missing"}
                      className="button coach-boosts-btn"
                      disabled={!hasTryitConfig}
                    >
                      <img src={imglightning} alt="" className="itico" />
                    </button>
                    <FormControlLabel
                      data-help-id="tryset-switch"
                      className="coach-tryset-switch" labelPlacement="top"
                      control={
                        <Switch
                          name="TryChecked" checked={!!ui.TryChecked} onChange={handleUIChange}
                          color="primary" size="small"
                          sx={{
                            '& .MuiSwitch-track': { backgroundColor: 'gray' },
                            transform: 'translate(10%, 0%)',
                          }}
                        />
                      }
                      label={TryChecked ? 'Tryset' : 'Activeset'}
                      sx={{
                        margin: 0, alignItems: 'center',
                        '& .MuiFormControlLabel-label': { fontSize: '10px', marginBottom: '1px' },
                      }}
                    />
                  </div>
                  <button data-help-id="deliveries-shortcut" style={{ top: '3px' }} onClick={handleButtonfDlvrClick} title="Deliveries" className="button"><img src={imgchores} alt="" className="itico" /></button>
                  <img src={imggobcarry} alt="" className="App-logo App-logo-mobile" />
                </div>
              ) : ""}
            </div>
            <div className="h1-container"><img src={imggobcarry} alt="" className="App-logo" />Sunflower Manager</div>
            {buttonClicked ? (
              <div className="currencies">
                <div className="currency-controls">
                  <div className="currency-top-row">
                    <div className="horizontal currency-actions" style={{ margin: "0", padding: "0" }}>
                      {isAdminFarm ? (
                        <button onClick={handleAdminClick} title="Admin" className="button" disabled={adminLoading}>
                          <img src={adminLoading ? imgsyncing : imgadmin} alt="" className="itico" />
                        </button>
                      ) : null}
                      {Number(dataSet?.options?.farmId || dataSetFarm?.frmid || 0) !== 1972 ? (
                        <button onClick={handleVipClick} title="Supporter" className="button" disabled={vipLoading}>
                          <img src={vipLoading ? imgsyncing : imgadmin} alt="" className="itico" />
                        </button>
                      ) : null}
                      {canUseChatbot ? (
                        <button data-help-id="chatbot" onClick={handleButtonIAClick} className="button" disabled={iaLoading} title={iaLoading ? "Loading" : "Ask IA"}>
                          <img src={iaLoading ? imggoblinThinking : imggrubnuk} alt="" className="itico" />
                        </button>
                      ) : null}
                    </div>
                    <DList
                      name="selectedCurr"
                      options={[
                        { value: "SFL", label: "Flower", iconSrc: imgsfl },
                        { value: "MATIC", label: "POL", iconSrc: imgmatic },
                        { value: "USDC", label: "USDC", iconSrc: imgusdc },
                      ]}
                      value={ui.selectedCurr} onChange={handleUIChange}
                      className="header-currency-select" iconOnly={true} height={38}
                    />
                  </div>
                  <div className="horizontal currency-secondary-actions" style={{ margin: "0", padding: "0" }}>
                    <button data-help-id="options" onClick={handleButtonOptionsClick} title="Options" className="button"><img src={imgoptions} alt="" className="itico" /></button>
                    {showHelpReminder ? <span className="coach-help-reminder">Help</span> : null}
                    <button data-help-id="page-coach" onClick={handleButtonHelpClick} title="Help" className={`button coach-help-btn ${showHelpReminder ? "is-reminded" : ""}`}><img src={imgna} alt="" className="itico" /></button>
                    <label
                      className={`interface-mode-switch mobile-interface-mode-switch ${ui.interfaceMode === "compact" ? "is-compact" : "is-classic"}`}
                      title={ui.interfaceMode === "compact" ? "Use classic interface" : "Use modern interface"}
                    >
                      <span className="interface-mode-switch-label" aria-hidden="true">UI</span>
                      <Switch
                        checked={ui.interfaceMode === "compact"}
                        onChange={(event) => setUIField("interfaceMode", event.target.checked ? "compact" : "classic")}
                        color="primary"
                        size="small"
                        inputProps={{ "aria-label": "Use compact interface" }}
                      />
                    </label>
                  </div>
                </div>
                <div className="currency-pair">
                  <div className="currency"><img src={imgsfl} alt="" className="nodico" />{Number.isFinite(Number(priceData?.[2])) ? Number(priceData[2]).toFixed(3) : "--"}</div>
                  <div className="currency"><img src={imgmatic} alt="" className="curr-icon" />{Number.isFinite(Number(priceData?.[1])) ? Number(priceData[1]).toFixed(3) : "--"}</div>
                  <label
                    className={`interface-mode-switch currency-interface-mode-switch ${ui.interfaceMode === "compact" ? "is-compact" : "is-classic"}`}
                    title={ui.interfaceMode === "compact" ? "Use classic interface" : "Use modern interface"}
                  >
                    <span className="interface-mode-switch-label" aria-hidden="true">UI</span>
                    <Switch
                      checked={ui.interfaceMode === "compact"}
                      onChange={(event) => setUIField("interfaceMode", event.target.checked ? "compact" : "classic")}
                      color="primary"
                      size="small"
                      inputProps={{ "aria-label": "Use compact interface" }}
                    />
                  </label>
                </div>
              </div>
            ) : ("")}
          </h1>
          <div style={{ marginTop: 0, margin: 0, padding: 0 }}>
            <div className="horizontal" style={{ margin: "0", padding: "0" }}>
              {buttonClicked ? (<>
                <div className="horizontal" onClick={(e) => handleTooltip("", "balance", dataSetFarm?.farmMeta?.balanceTooltip || null, e)} style={{ margin: "0", padding: "0" }}>
                  {imgSFL}{frmtNb(dataSet?.balance ?? 0)} {imgCoins}{Number(dataSet?.coins ?? 0).toFixed(0)}{dataSet?.isBanned ? dataSet.isBanned : null}
                </div>
                <span>{mutData || null}</span>
              </>) : null}
              <p className="reqstat">{reqState}</p>
              {sectionsMetaError ? (<p className="reqstat" style={{ color: "red" }}>{sectionsMetaError}</p>) : null}
            </div>
            {buttonClicked ? (<>
              <HeaderTrades
                API_URL={API_URL} farmId={String(dataSetFarm?.frmid || "")}
                options={dataSet.options} currentPage={ui?.selectedInv}
                dataSetFarm={dataSetFarm}
                onTooltip={(e, payload) => handleTooltip("", "trades", payload || "", e)}
                onTradesUpdate={(payload) => {
                  if (!payload) return;
                  mergeTradeEntryHashesFromPayload(payload, tradeEntryHashesRef);
                  const hasTradesField = Object.prototype.hasOwnProperty.call(payload, "ftrades");
                  const hasHeaderField = Object.prototype.hasOwnProperty.call(payload, "ftradesHeader");
                  if (hasTradesField || hasHeaderField) {
                    setdataSetFarm((prev) => {
                      const nextFarm = { ...(prev || {}), ...(hasTradesField ? { ftrades: payload.ftrades } : {}), ...(hasHeaderField ? { ftradesHeader: payload.ftradesHeader } : {}) };
                      dataSetFarmRef.current = nextFarm;
                      return nextFarm;
                    });
                    return;
                  }
                  setdataSetFarm((prev) => { const nextFarm = { ...(prev || {}), ftrades: payload }; dataSetFarmRef.current = nextFarm; return nextFarm; });
                }}
              />
              <div className={`header-controls-row header-controls-${selectedInv}`}>
                <DList name="selectedInv" options={pageOptions} value={ui.selectedInv} onChange={handleUIChange}
                  helpId="page-selector"
                  className={selectedInv === "market" ? "header-market-select" : "header-page-select"}
                  width={130} height={25} maxListHeight={null} />
                {(sectionsLoading || headerRequestLoading) ? (
                  <img src={imgsyncing} alt="Loading sections" className="itico header-loading-indicator" style={{ width: 14, height: 14, opacity: 0.9 }} />
                ) : null}
                {selectedInv === "animal" && (
                  <>
                    <DList name="selectedAnimalLvl" helpId="animal-level-mode" options={[{ value: "farm", label: "Farm" }, { value: "all", label: "All lvl" }]}
                      value={ui.selectedAnimalLvl} onChange={handleUIChange} height={20} />
                    <DList
                      name="animalCostAllocationMode"
                      helpId="animal-cost-mode"
                      className="animal-calculations-select"
                      title="Calculations"
                      options={ANIMAL_COST_ALLOCATION_OPTIONS}
                      value={Number(dataSet.options?.animalCostAllocationMode ?? 0)}
                      onChange={async (event) => {
                        handleOptionChange(event);
                        await getPrices(
                          false,
                          true,
                          null,
                          true,
                          "animal",
                          true,
                          "ANIMAL_COST_MODE"
                        );
                      }}
                      height={20}
                      width={158}
                      menuMinWidth={190}
                    />
                    {ui.selectedAnimalLvl === "all" && (
                      <DList name="selectedAnimalPettings" helpId="animal-petting-mode" title={<><img src="/icon/ui/expression_love.png" alt="" className="itico" /> Petting</>} options={[
                        { value: "0", label: "0", iconSrc: "/icon/ui/expression_love.png" },
                        { value: "1", label: "1", iconSrc: "/icon/ui/expression_love.png" },
                        { value: "2", label: "2", iconSrc: "/icon/ui/expression_love.png" },
                      ]}
                        value={String(ui.selectedAnimalPettings ?? "0")} onChange={handleUIChange} height={20} />
                    )}
                  </>
                )}
                {selectedInv === "home" && (
                  <DList name="selectedHomeMode" options={[{ value: "current", label: "Current harvests" }, { value: "daily", label: "Daily harvests" }]}
                    value={ui.selectedHomeMode} onChange={handleUIChange} height={20} />
                )}
                {selectedInv === "activity" && (
                  <DList name="activityDisplay" options={[{ value: "day", label: "Day" }, { value: "item", label: "Item" }, { value: "trades", label: "Trades" }, { value: "quest", label: "Quest" }]}
                    value={ui.activityDisplay} onChange={handleUIChange} height={20} />
                )}
                {selectedInv === "expand" && (
                  <>
                    <DList name="selectedExpandType" title="Island"
                      options={[
                        { value: "basic", label: "Basic" },
                        { value: "spring", label: "Spring", iconSrc: "/icon/biome/spring.webp" },
                        { value: "desert", label: "Desert", iconSrc: "/icon/biome/desert.webp" },
                        { value: "volcano", label: "Volcano", iconSrc: "/icon/biome/volcano.webp" },
                        { value: "swamp", label: "Swamp", iconSrc: "/icon/biome/swamp.webp" },
                        { value: "spooky", label: "Spooky", iconSrc: "/icon/biome/spooky.webp" },
                        { value: "crystal", label: "Crystal", iconSrc: "/icon/biome/crystal.webp" },
                        { value: "galaxy", label: "Galaxy", iconSrc: "/icon/biome/galaxy.webp" },
                        { value: "marble", label: "Marble", iconSrc: "/icon/biome/marble.webp" },
                      ]}
                      value={ui.selectedExpandType} onChange={handleUIChange} height={20} />
                    {ASCENSION_EXPAND_TYPES.has(ui.selectedExpandType) ? (
                      <DList
                        name="selectedExpandAscension"
                        title="Ascension"
                        options={(
                          ui.selectedExpandType === "marble"
                            ? Array.from({ length: 16 }, (_, index) => index + 5)
                            : [{
                              swamp: 1,
                              spooky: 2,
                              crystal: 3,
                              galaxy: 4,
                            }[ui.selectedExpandType] || 1]
                        ).map((ascension) => ({
                          value: ascension,
                          label: `Ascension ${ascension}`,
                        }))}
                        value={ui.selectedExpandAscension || 1}
                        onChange={handleUIChange}
                        height={20}
                      />
                    ) : null}
                    {expandLoading ? (<img src={imgsyncing} alt="Loading island data" className="itico" style={{ width: 14, height: 14, opacity: 0.9 }} />) : null}
                    <DList options={expandPickerOptions} value={expandPickerValue} multiple={true} closeOnSelect={false} emitEvent={false}
                      onChange={(selectedValues) => {
                        const selectedSet = new Set((selectedValues || []).map(String));
                        const next = (ui.xListeColExpand || EXPAND_COLUMNS_TEMPLATE).map((col, idx) => {
                          const isPickerCol = EXPAND_COLUMNS_PICKER.some((c) => c.idx === idx);
                          if (!isPickerCol) return col;
                          return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                        });
                        setUIField("xListeColExpand", next);
                      }} listIcon={imgoptions} iconOnly={true} height={28} menuMinWidth={220} />
                  </>
                )}
                {selectedInv === "cropmachine" && (
                  <DList options={cropMachinePickerOptions} value={cropMachinePickerValue} multiple={true} closeOnSelect={false} emitEvent={false}
                    onChange={(selectedValues) => {
                      const selectedSet = new Set((selectedValues || []).map(String));
                      const next = (ui.xListeColCropMachine || CROPMACHINE_COLUMNS_TEMPLATE).map((col, idx) => {
                        const isPickerCol = CROPMACHINE_COLUMNS_PICKER.some((c) => c.idx === idx);
                        if (!isPickerCol) return col;
                        return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                      });
                      setUIField("xListeColCropMachine", next);
                    }} listIcon={imgoptions} iconOnly={true} height={28} menuMinWidth={220} />
                )}
                {selectedInv === "buynodes" && (
                  <DList options={buyNodesPickerOptions} value={buyNodesPickerValue} multiple={true} closeOnSelect={false} emitEvent={false}
                    onChange={(selectedValues) => {
                      const selectedSet = new Set((selectedValues || []).map(String));
                      const next = (ui.xListeColBuyNodes || BUYNODES_COLUMNS_TEMPLATE).map((col, idx) => {
                        const isPickerCol = BUYNODES_COLUMNS_PICKER.some((c) => c.idx === idx);
                        if (!isPickerCol) return col;
                        return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                      });
                      setUIField("xListeColBuyNodes", next);
                    }} listIcon={imgoptions} iconOnly={true} height={28} menuMinWidth={220} />
                )}
                {selectedInv === "auctions" && (
                  <DList options={auctionsPickerOptions} value={auctionsPickerValue} multiple={true} closeOnSelect={false} emitEvent={false}
                    onChange={(selectedValues) => {
                      const selectedSet = new Set((selectedValues || []).map(String));
                      const next = (ui.xListeColAuctions || AUCTIONS_COLUMNS_TEMPLATE).map((col, idx) => {
                        const isPickerCol = AUCTIONS_COLUMNS_PICKER.some((c) => c.idx === idx);
                        if (!isPickerCol) return col;
                        return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                      });
                      setUIField("xListeColAuctions", next);
                    }} listIcon={imgoptions} iconOnly={true} height={28} menuMinWidth={220} />
                )}
                {selectedInv === "pet" && (
                  <>
                    <DList name="petView" options={[{ value: "pets", label: "Pets", iconSrc: imgpet }, { value: "shrines", label: "Shrines", iconSrc: imgshrine }, { value: "components", label: "Fetch", iconSrc: imgacorn }]}
                      value={ui.petView} onChange={handleUIChange} height={20} />
                    <DList options={petPickerOptions} value={petPickerValue} multiple={true} closeOnSelect={false} emitEvent={false}
                      onChange={(selectedValues) => {
                        const selectedSet = new Set((selectedValues || []).map(String));
                        const picker = activePetColumnsPicker?.picker || [];
                        const template = activePetColumnsPicker?.template || [];
                        const stateKey = activePetColumnsPicker?.stateKey;
                        if (!stateKey) return;
                        const next = (ui?.[stateKey] || template).map((col, idx) => {
                          const isPickerCol = picker.some((c) => c.idx === idx);
                          if (!isPickerCol) return col;
                          return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                        });
                        setUIField(stateKey, next);
                      }} listIcon={imgoptions} iconOnly={true} height={28} menuMinWidth={220} />
                  </>
                )}
                {selectedInv === "fish" && (
                  <>
                    <DList name="fishView" options={[{ value: "fish", label: "Fish", iconSrc: imgfish }, { value: "crustacean", label: "Crustaceans", iconSrc: imgcrustacean }]}
                      value={ui.fishView} onChange={handleUIChange} height={20} />
                    <DList options={ui.fishView === "crustacean" ? crustaPickerOptions : fishPickerOptions}
                      value={ui.fishView === "crustacean" ? crustaPickerValue : fishPickerValue}
                      multiple={true} closeOnSelect={false} emitEvent={false}
                      onChange={(selectedValues) => {
                        const selectedSet = new Set((selectedValues || []).map(String));
                        if (ui.fishView === "crustacean") {
                          const next = (ui.xListeColCrusta || CRUSTA_COLUMNS_TEMPLATE).map((col, idx) => {
                            const isPickerCol = CRUSTA_COLUMNS_PICKER.some((c) => c.idx === idx);
                            if (!isPickerCol) return col;
                            return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                          });
                          setUIField("xListeColCrusta", next);
                          return;
                        }
                        const next = (ui.xListeColFish || FISH_COLUMNS_TEMPLATE).map((col, idx) => {
                          const isPickerCol = FISH_COLUMNS_PICKER.some((c) => c.idx === idx);
                          if (!isPickerCol) return col;
                          return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                        });
                        setUIField("xListeColFish", next);
                      }} listIcon={imgoptions} iconOnly={true} height={28} menuMinWidth={220} />
                  </>
                )}
                {selectedInv === "cook" && (
                  <>
                    <DList options={cookPickerOptions} value={cookPickerValue} multiple={true} closeOnSelect={false} emitEvent={false}
                      onChange={(selectedValues) => {
                        const selectedSet = new Set((selectedValues || []).map(String));
                        const next = (ui.xListeColCook || COOK_COLUMNS_TEMPLATE).map((col, idx) => {
                          const isPickerCol = COOK_COLUMNS_PICKER.some((c) => c.idx === idx);
                          if (!isPickerCol) return col;
                          return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                        });
                        setUIField("xListeColCook", next);
                      }} className="header-columns-select" listIcon={imgoptions} iconOnly={true} height={28} menuMinWidth={250} />
                    <DList name="cookCategories" title="Categories"
                      options={[{ value: "base", label: "Base", iconSrc: imgchefHat }, { value: "honey", label: "Honey", iconSrc: imghoney }, { value: "cheese", label: "Cheese", iconSrc: imgcheese }, { value: "fish", label: "Fish", iconSrc: imgfish }, { value: "cake", label: "Cake", iconSrc: imgcarrotCake }]}
                      multiple={true} closeOnSelect={false} value={ui.cookCategories || ["base", "honey", "cheese", "fish", "cake"]} onChange={handleUIChange}
                      className="header-cook-categories" height={20} />
                    <DList name="cookSortBy" title="Sort" options={cookSortOptions} value={ui.cookSortBy || "none"} onChange={handleUIChange}
                      className="header-cook-sort" height={20} />
                    <DList name="cookSortDir" title="Direction" options={[{ value: "asc", label: "Asc" }, { value: "desc", label: "Desc" }]}
                      value={ui.cookSortDir || "asc"} onChange={handleUIChange} className="header-cook-direction" height={20} />
                  </>
                )}
                {selectedInv === "inv" && (
                  <>
                    <DList options={invPickerOptions} value={invPickerValue} multiple={true} closeOnSelect={false} emitEvent={false}
                      onChange={(selectedValues) => {
                        const selectedSet = new Set((selectedValues || []).map(String));
                        const next = (ui.xListeCol || INV_COLUMNS_TEMPLATE).map((col, idx) => {
                          const isPickerCol = INV_COLUMNS_PICKER.some((c) => c.idx === idx);
                          if (!isPickerCol) return col;
                          return [col[0], selectedSet.has(String(idx)) ? 1 : 0];
                        });
                        setUIField("xListeCol", next);
                      }} listIcon={imgoptions} iconOnly={true} height={28} menuMinWidth={220} />
                    <DList name="invCategories" title="Categories"
                      options={[{ value: "crop", label: "Crop", iconSrc: imgcrop }, { value: "resources", label: "Resources", iconSrc: imgstone }, { value: "animals", label: "Animals", iconSrc: imgcow }, { value: "fruit", label: "Fruit", iconSrc: imgapple }, { value: "buildings", label: "Buildings", iconSrc: imgkitchenIcon }]}
                      multiple={true} closeOnSelect={false} value={ui.invCategories || ["crop", "resources", "animals", "fruit", "buildings"]} onChange={handleUIChange} height={20} />
                    <DList name="invSortBy" title="Sort" options={invSortOptions} value={ui.invSortBy || "none"} onChange={handleUIChange} height={20} />
                    <DList name="invSortDir" title="Direction" options={[{ value: "asc", label: "Asc" }, { value: "desc", label: "Desc" }]}
                      value={ui.invSortDir || "asc"} onChange={handleUIChange} height={20} />
                  </>
                )}
              </div>
            </>) : null}
          </div>
        </div>
        <div className={`table-container ${(selectedInv === "activity" && ui?.activityDisplay === "trades") ? "table-container-fill" : ""}`}>
          {buttonClicked ?
            <AppCtx.Provider value={ctx}>
              {canRenderCurrentPage ? <PanelTable /> : <div>Loading page data...</div>}
              <QuickTryDrawer
                onOpenFull={handleButtonfTNFTClick}
                onEnsureData={() => handleButtonfTNFTClick({ openModal: false })}
                currentSections={requiredSectionsForView}
                knownHashes={farmSectionHashesRef.current}
                knownTableHashes={farmTableHashesRef.current}
              />
            </AppCtx.Provider> : null}
        </div>
        {showOptions && (
          <ModalOptions onClose={() => {
            handleCloseOptions();
            const hasChanged = JSON.stringify(initialDataSet) !== JSON.stringify(dataSet);
            if (hasChanged) { handleButtonClick("optionChanged"); }
          }} dataSet={dataSet.options} onOptionChange={handleOptionChange} API_URL={API_URL}
            itemTable={dataSetFarm?.itables?.it || selectCurrentProjection(dataSetFarm, "invData")?.itables?.it}
            toolTable={dataSetFarm?.itables?.tool || selectCurrentProjection(dataSetFarm, "invData")?.itables?.tool}
            coinActivity={dataSetFarm?.farmMeta?.coinActivity}
            bestCoinRatio={dataSetFarm?.bestCoinRatio}
            isAbo={isAboFarm}
            deviceId={deviceIdRef.current} />
        )}
        {showChatbot && canUseChatbot && (
          <ModalChatbot onClose={() => setShowChatbot(false)} API_URL={API_URL}
            farmId={curID || dataSet?.options?.farmId || dataSetFarm?.frmid || ""}
            options={dataSet.options}
            tryChecked={TryChecked}
            tryitPayload={getTryitRequestPayload(dataSetFarmRef.current || dataSetFarm || {})}
            currentPage={ui?.selectedInv || "home"}
            username={dataSet?.options?.username || dataSetFarm?.username || ""} />
        )}
        {showAdmin && (
          <ModalAdmin onClose={() => setShowAdmin(false)} value={adminData} onAdminFetch={fetchAdminView} API_URL={API_URL} />
        )}
        {showfGraph && (
          <ModalGraph onClose={handleClosefGraph} graphtype={GraphType} frmid={dataSet.options.farmId}
            username={dataSet.options.username} dataSetFarm={dataSetFarm} API_URL={API_URL} />
        )}
        {showfTNFT && (
          <AppCtx.Provider value={ctx}>
            <ModalTNFT onClose={handleClosefTNFT} />
          </AppCtx.Provider>
        )}
        {showfDlvr && (
          <AppCtx.Provider value={ctx}>
            <ModalDlvr onClose={() => { handleClosefDlvr() }} tableData={dataSetFarm?.orderstable || deliveriesData}
              imgtkt={dataSet.imgtkt} coinsRatio={dataSet.options.coinsRatio}
              autoRefreshEnabled={autoRefreshEnabled} autoRefreshActive={autoRefreshActive}
              autoRefreshResetKey={autoRefreshResetKey} autoRefreshNextAt={autoRefreshNextAt} />
          </AppCtx.Provider>
        )}
        {showCadre && (
          <Cadre onClose={handleCloseCadre} tableData={listingsData} Platform={platformListings} frmid={curID} />
        )}
        {showHelp && (
          <PageCoach onClose={handleCloseHelp} currentPage={ui?.selectedInv || "home"} initialMode={helpStartMode} />
        )}
        {sharedTryProfile && (
          <TryProfileSummaryModal profile={sharedTryProfile} onClose={handleCloseTryProfileSummary} />
        )}
        {tooltipData && (
          <Tooltip onClose={() => setTooltipData(null)} clickPosition={tooltipData}
            item={tooltipData.item} context={tooltipData.context} value={tooltipData.value}
            dataSet={dataSet} dataSetFarm={dataSetFarm} bdrag={tooltipData.bdrag} forTry={TryChecked}
            cropMachineUi={{
              selectedSeeds: ui.selectedSeedsCM,
              customSeeds: ui.customSeedCM,
              selectedCrops: ui.toCM,
            }}
            interfaceMode={ui.interfaceMode} />
        )}
      </div>
    </>
  );
}

export default App;
