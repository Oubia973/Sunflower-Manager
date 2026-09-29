/**
 * useDataFetcher Hook - Data fetching and price processing
 * Extracted from App.js getPrices function
 */

import { useRef, useCallback } from 'react';
import {
  mergeFarmStateDeep,
  formatUpdated,
  frmtNb,
  stripFarmMetadata,
} from '../fct.js';
import {
  syncTryitStateAcrossFarmState,
  resolveTryitSnapshot,
  isValidTryitConfig,
} from '../tryitStorage.js';
import { computeGemsRatio } from '../gemsRatio.js';
import {
  buildTryitCoverageSignature,
  mergeKnownHashesFromPayload,
  mergeTradeEntryHashesFromPayload,
  shouldDebugHashFlow,
  hasInventoryItemFields,
  collectKnownProjectionHashes,
} from '../utils/farmState.js';
import { getBalanceValue } from '../utils/balance.js';
import { computeRequiredSections } from '../utils/sections.js';
import { fetchJson } from '../services/apiClient.js';
import { versionImageUrl } from '../constants/images.js';
import { prepareFarmTableResponse, finalizeFarmResponse } from '../utils/farmResponse/prepareFarmResponse.js';
import { claimFarmRequestSections, currentFarmRequestSections, selectFarmResponseSections } from '../utils/farmResponse/responseScope.js';
import { getDailyCoinFlow } from '../utils/coinActivity.js';

/**
 * Hook for data fetching and price processing
 */
export function useDataFetcher(
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
  setSectionsLoading,
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
  showfDlvr,
  calculationIntentRef,
  farmIdentityIntentRef
) {
  // Internal header request tracking (eliminates circular dependency with useSectionLoader)
  const headerRequestCountRef = useRef(0);
  const farmRequestSequenceRef = useRef(0);
  const latestRequestByResourceRef = useRef(new Map());
  const refreshRequestCountRef = useRef(0);
  const latestUiRef = useRef(ui);
  latestUiRef.current = ui;

  const beginHeaderRequest = useCallback(() => {
    headerRequestCountRef.current += 1;
    setSectionsLoading(true);
  }, [setSectionsLoading]);

  const endHeaderRequest = useCallback(() => {
    headerRequestCountRef.current = Math.max(0, headerRequestCountRef.current - 1);
    if (headerRequestCountRef.current < 1) {
      setSectionsLoading(false);
    }
  }, [setSectionsLoading]);

  /**
   * Fetch prices and/or farm data sections
   */
  const getPricesWithOutcome = useCallback(async (
    onlyPrices,
    withSectionLoader = false,
    forcedSections = null,
    forceRecalc = false,
    forcedPage = null,
    alwaysCheckServer = false,
    requestTag = ""
  ) => {
    let requestInfo = {};
    const outcome = (status, legacyValue, extra = {}) => ({ ...requestInfo, status,
      farm: legacyValue, legacyValue, rejectedTablePaths: [], confirmedSections: [], ...extra });
    if (!onlyPrices && (!pageSectionRequirements || !sectionPayloadKeys || !sectionTablePaths)) {
      setReqState(sectionsMetaError || "Config sections missing");
      return outcome('unavailable', undefined, { reason: 'sections-config' });
    }
    if (!onlyPrices && !isValidTryitConfig(tryitConfig)) {
      setReqState(sectionsMetaError || "Tryset config missing. Local selections are preserved; calculations are paused until backend config reloads.");
      return outcome('unavailable', null, { reason: 'tryit-config' });
    }
    const currentFarmState = dataSetFarmRef.current || {};
    const { tryitarrays: tryItArrays, tryitMode } = getTryitRequestPayload(currentFarmState);
    const requestTryitSignature = buildTryitCoverageSignature({
      tryitarrays: tryItArrays,
      tryitMode,
    });
    const requestCalculationIntent = calculationIntentRef?.current || 0;
    const requestIdentityRevision = farmIdentityIntentRef?.current?.revision || 0;
    const requestTrySeason = String(ui?.selectedTrySeason || "all").toLowerCase();
    const isCalculationContextCurrent = () => (
      requestCalculationIntent === (calculationIntentRef?.current || 0)
      && requestTrySeason === String(latestUiRef.current?.selectedTrySeason || "all").toLowerCase()
    );
    const includeSource = (Array.isArray(forcedSections) && forcedSections.length > 0)
      ? forcedSections
      : computeRequiredSections(ui, pageSectionRequirements);
    const requestedPage = (forcedPage !== null && forcedPage !== undefined && String(forcedPage).trim() !== "")
      ? String(forcedPage).trim()
      : ((Array.isArray(forcedSections) && forcedSections.length === 1)
        ? String(forcedSections[0])
        : String(ui?.selectedInv || "home"));
    const includeSet = new Set(includeSource);
    if (!withSectionLoader) {
      includeSet.add("trades");
      includeSet.add("core");
    }
    if (!onlyPrices && showfDlvr) {
      includeSet.add("orders");
      includeSet.add("deliverypage");
    }
    const include = [...includeSet];
    const includeMissingOnly = include.filter((section) =>
      !hasSectionData(currentFarmState, section, sectionPayloadKeys, sectionTablePaths)
    );
    const includeToRequest = (withSectionLoader && !forceRecalc && !alwaysCheckServer)
      ? includeMissingOnly
      : include;
    requestInfo = { requestedFarmId: String(currentFarmState?.frmid || dataSet?.options?.farmId || "").trim(),
      requestedPage, requestedSections: [...includeToRequest] };
    const hasAllRequestedSectionsLocal = includeMissingOnly.length < 1;
    if (!onlyPrices && withSectionLoader && !forceRecalc && !alwaysCheckServer && hasAllRequestedSectionsLocal) {
      setReqState('');
      return outcome('cached', undefined, { farm: currentFarmState });
    }
    if (!onlyPrices && withSectionLoader) {
      setSectionsLoading(true);
    }
    const knownHashes = { ...(farmSectionHashesRef.current || {}) };
    const knownTableHashes = { ...(farmTableHashesRef.current || {}) };
    const requestedSectionSet = new Set(includeToRequest.map((section) => String(section || "").toLowerCase()));
    if (
      (requestedSectionSet.has("inv") || requestedSectionSet.has("inventory")) &&
      !hasInventoryItemFields(currentFarmState)
    ) {
      delete knownHashes.inv;
      delete knownHashes.inventory;
      delete knownTableHashes["itables.it"];
      if (farmSectionHashesRef.current) {
        delete farmSectionHashesRef.current.inv;
        delete farmSectionHashesRef.current.inventory;
      }
      if (farmTableHashesRef.current) {
        delete farmTableHashesRef.current["itables.it"];
      }
    }
    const knownTradeHashes = (
      includeToRequest.includes("trades") &&
      currentFarmState?.ftrades &&
      typeof currentFarmState.ftrades === "object" &&
      !Array.isArray(currentFarmState.ftrades) &&
      Object.keys(tradeEntryHashesRef.current || {}).length > 0
    ) ? { ...(tradeEntryHashesRef.current || {}) } : null;
    includeToRequest.forEach((section) => {
      if (!hasSectionData(currentFarmState, section, sectionPayloadKeys, sectionTablePaths)) {
        delete knownHashes[section];
        const missingSectionPaths = Array.isArray(sectionTablePaths?.[section])
          ? sectionTablePaths[section]
          : [];
        missingSectionPaths.forEach((path) => {
          delete knownTableHashes[path];
        });
      }
    });
    const requestMode = withSectionLoader && requestTag !== "AUTO_REFRESH" ? "nav" : "refresh";
    const requestFarmId = dataSetFarmRef.current?.frmid || dataSet?.options?.farmId || "";
    const isFarmIdentityCurrent = () => {
      const intent = farmIdentityIntentRef?.current;
      return requestIdentityRevision === (intent?.revision || 0)
        && !(intent?.pending && String(intent.sourceFarmId) === String(requestFarmId));
    };
    let vHeaders = onlyPrices ? {
      onlyprices: "true",
    } : {
      frmid: requestFarmId,
      deviceId: deviceIdRef.current,
      options: dataSet.options,
      selectedTrySeason: requestTrySeason,
      include: [...new Set(includeToRequest)],
      page: requestedPage,
      knownHashes,
      knownProjectionHashes: collectKnownProjectionHashes(currentFarmState),
      knownTableHashes,
      capabilities: { tableEntryDeltas: 1 },
      ...(knownTradeHashes ? { knownTradeHashes } : {}),
      mode: requestMode,
      forceRecalc: !!forceRecalc,
      alwaysCheckServer: !!alwaysCheckServer,
      tryitarrays: tryItArrays,
      tryitMode,
      requestTag: String(requestTag || ""),
    };
    if (!onlyPrices && shouldDebugHashFlow()) {
      console.log(
        `[hashflow][client:req] mode:${requestMode} page:${String(requestedPage || "unknown")} ` +
        `knownTables:${Object.keys(knownTableHashes || {}).length} knownSections:${Object.keys(knownHashes || {}).length}`
      );
    }
    const isRefreshRequest = !onlyPrices && !withSectionLoader;
    if (isRefreshRequest) {
      refreshRequestCountRef.current += 1;
      refreshInFlightRef.current = true;
    }
    if (!onlyPrices) {
      beginHeaderRequest();
    }
    const requestSequence = onlyPrices ? 0 : farmRequestSequenceRef.current + 1;
    if (!onlyPrices) {
      farmRequestSequenceRef.current = requestSequence;
      claimFarmRequestSections(includeToRequest, requestSequence, latestRequestByResourceRef.current,
        sectionPayloadKeys, sectionTablePaths);
    }
    try {
      const responseData = await fetchJson(API_URL, "/getdatacrypto", {
        method: 'POST',
        body: vHeaders,
        timeoutMs: 30_000,
      });
        const currentSections = onlyPrices ? [] : currentFarmRequestSections(
          includeToRequest, requestSequence, latestRequestByResourceRef.current,
          sectionPayloadKeys, sectionTablePaths
        );
        const isScopedLate = !onlyPrices && requestSequence !== farmRequestSequenceRef.current;
        if (!onlyPrices && currentSections.length === 0) {
          console.log(`[farm] stale response ignored${requestTag ? ` (${requestTag})` : ""}`);
          return outcome('ignored', dataSetFarmRef.current || null, { reason: 'sequence' });
        }
        if (!onlyPrices && !isCalculationContextCurrent()) {
          console.log(`[farm] calculation context changed; response ignored${requestTag ? ` (${requestTag})` : ""}`);
          return outcome('ignored', dataSetFarmRef.current || null, { reason: 'options' });
        }
        if (!onlyPrices && !isFarmIdentityCurrent()) {
          console.log(`[farm] identity changed; response ignored${requestTag ? ` (${requestTag})` : ""}`);
          return outcome('ignored', dataSetFarmRef.current || null, { reason: 'farm-intent' });
        }
        const latestFarmId = String(
          dataSetFarmRef.current?.frmid || dataSet?.options?.farmId || ""
        ).trim();
        if (
          !onlyPrices &&
          String(requestFarmId || "").trim() &&
          latestFarmId &&
          String(requestFarmId).trim() !== latestFarmId
        ) {
          console.log(`[farm] response for previous farm ignored${requestTag ? ` (${requestTag})` : ""}`);
          return outcome('ignored', dataSetFarmRef.current || null, { reason: 'farm' });
        }
        const latestTryitSignature = buildTryitCoverageSignature(
          getTryitRequestPayload(dataSetFarmRef.current || {})
        );
        if (!onlyPrices && latestTryitSignature !== requestTryitSignature) {
          console.log(`[tryset] stale response ignored${requestTag ? ` (${requestTag})` : ""}`);
          setReqState('');
          return outcome('ignored', dataSetFarmRef.current || null, { reason: 'tryset' });
        }
        const receiveFarmState = dataSetFarmRef.current || currentFarmState;
        const scopedRawPayload = isScopedLate
          ? selectFarmResponseSections(responseData.allData, currentSections, sectionPayloadKeys, sectionTablePaths)
          : responseData.allData;
        const deltaResult = prepareFarmTableResponse(
          receiveFarmState,
          scopedRawPayload,
          farmTableHashesRef.current || {},
          tryitConfig
        );
        if (deltaResult.rejectedPaths.length > 0 && deltaResult.payload?.sectionHashes) {
          deltaResult.payload.sectionHashes = { ...deltaResult.payload.sectionHashes };
        }
        deltaResult.rejectedPaths.forEach((tablePath) => {
          if (farmTableHashesRef.current) delete farmTableHashesRef.current[tablePath];
          Object.entries(sectionTablePaths || {}).forEach(([section, paths]) => {
            if (!Array.isArray(paths) || !paths.includes(tablePath)) return;
            if (farmSectionHashesRef.current) delete farmSectionHashesRef.current[section];
            delete deltaResult.payload.sectionHashes?.[section];
          });
          console.warn(`[table-delta] rejected ${tablePath}; next request will fetch the full table`);
        });
        const { rawPayload: rawRespData, payload: respData } = finalizeFarmResponse(receiveFarmState, deltaResult.payload);
        let mergedFarmData = receiveFarmState;
        if (!isScopedLate && (Array.isArray(responseData.priceData) || typeof responseData.priceData === 'string')) {
          setpriceData(responseData.priceData);
          if (Array.isArray(responseData.priceData)) {
            dataSet.options.usdSfl = responseData.priceData[2];
          }
        } else if (!isScopedLate) {
          console.error('[DEBUG useDataFetcher] priceData is not array/string, skipping setpriceData. Value:', responseData.priceData);
        }
        if (respData !== "" && respData !== undefined) {
          mergeKnownHashesFromPayload(respData, farmSectionHashesRef, farmTableHashesRef);
          mergeTradeEntryHashesFromPayload(rawRespData, tradeEntryHashesRef);
          mergedFarmData = mergeFarmStateDeep(receiveFarmState, respData, tryitConfig);
          const tryitSnapshot = resolveTryitSnapshot({
            farmState: receiveFarmState,
            tryitConfig,
            responseSnapshot: null,
            farmId: String(receiveFarmState?.frmid || dataSet?.options?.farmId || "").trim(),
          });
          mergedFarmData = syncTryitStateAcrossFarmState(mergedFarmData, tryitConfig, tryitSnapshot);
          const farmMeta = mergedFarmData?.farmMeta || mergedFarmData?.frmData || {};
          getDailyCoinFlow(farmMeta?.coinActivity, mergedFarmData?.frmid || dataSet?.options?.farmId);
          setFarmData(farmMeta);
          dataSet.options.isAbo = mergedFarmData.isabo;
          dataSet.isVip = farmMeta?.vip;
          dataSet.aboLifetime = respData?.aboLifetime
            ?? mergedFarmData?.aboLifetime
            ?? dataSet?.aboLifetime
            ?? false;
          dataSet.aboExpiresAt = respData?.aboExpiresAt || mergedFarmData?.aboExpiresAt || 0;
          let refreshOptions = false;
          if (dataSet?.options?.tradeTax !== farmMeta?.tradeTax && dataSet?.options?.tradeTax > 0 && dataSet.options.autoTradeTax) {
            dataSet.options.tradeTax = farmMeta?.tradeTax;
            refreshOptions = true;
          }
          if (dataSet?.options?.autoCoinRatio) {
            dataSet.options.coinsRatio = respData?.bestCoinRatio?.ratio
              || mergedFarmData?.bestCoinRatio?.ratio
              || dataSet.options.coinsRatio
              || 1000;
            refreshOptions = true;
          }
          dataSet.dateVip = farmMeta?.datevip;
          dataSet.dailychest = farmMeta?.dailychest;
          dataSet.taxFreeSFL = frmtNb(farmMeta?.taxFreeSFL);
          dataSet.bumpkin = mergedFarmData?.Bumpkin?.[0];
          setBumpkinData(mergedFarmData?.Bumpkin || []);
          const frmData = farmMeta;
          const Fish = mergedFarmData?.Fish;
          dataSet.balance = getBalanceValue(frmData?.balance, "sfl");
          dataSet.coins = getBalanceValue(frmData?.balance, "coins");
          const nextGemsRatio = computeGemsRatio(
            dataSet?.options?.gemsPack || 15500,
            dataSet?.options?.usdSfl
          );
          if (nextGemsRatio > 0 && Number(dataSet?.options?.gemsRatio || 0) !== nextGemsRatio) {
            dataSet.options.gemsRatio = nextGemsRatio;
            refreshOptions = true;
          }
          if (refreshOptions && typeof setOptions === "function") {
            setOptions({ ...dataSet.options });
          }
          const tryChecked = !!ui?.TryChecked;
          const xfishcastmax = Fish && (tryChecked ? Fish.CastMaxtry : Fish.CastMax);
          const xfishcost = Fish && ((tryChecked ? Fish.CastCosttry : Fish.CastCost) / dataSet.options.coinsRatio);
          dataSet.fishcasts = Fish && (Fish.casts + "/" + xfishcastmax);
          dataSet.fishcosts = Fish && (parseFloat(Fish.casts * xfishcost).toFixed(3) + "/" + parseFloat(xfishcastmax * xfishcost).toFixed(3));
          const cleanData = stripFarmMetadata(mergedFarmData, 'useDataFetcher');
          dataSetFarmRef.current = cleanData;
          setdataSetFarm((prevFarmState) => {
            const mergedLatest = mergeFarmStateDeep(prevFarmState, respData, tryitConfig);
            const tryitSnapshot = resolveTryitSnapshot({
              farmState: prevFarmState,
              tryitConfig,
              responseSnapshot: null,
              farmId: String(prevFarmState?.frmid || dataSet?.options?.farmId || "").trim(),
            });
            const syncedLatest = syncTryitStateAcrossFarmState(
              mergedLatest,
              tryitConfig,
              tryitSnapshot
            );
            const cleanLatest = stripFarmMetadata(syncedLatest, 'useDataFetcher/setState');
            dataSetFarmRef.current = cleanLatest;
            return { ...cleanLatest };
          });
          dataSet.updated = formatUpdated(frmData?.updated);
          if (mergedFarmData.mutantsHeader || mergedFarmData.mutantchickens) {
            setMutants(mergedFarmData);
          }
          setdeliveriesData(mergedFarmData.orderstable);
          setCookie(mergedFarmData, dataSet, "");
        }
        if (!isScopedLate) setReqState('');
        const rawFarmPayload = scopedRawPayload;
        const hasPayload = rawFarmPayload && typeof rawFarmPayload === "object"
          && !Array.isArray(rawFarmPayload) && Object.keys(rawFarmPayload).length > 0;
        return outcome(onlyPrices ? 'prices' : hasPayload ? 'applied' : 'unavailable', mergedFarmData,
          { reason: !onlyPrices && !hasPayload ? 'farm-payload' : undefined,
            confirmedSections: onlyPrices ? [] : currentSections.filter(section =>
              (Array.isArray(respData?.returnedSections) && respData.returnedSections.includes(section))
              || (Array.isArray(respData?.unchangedSections) && respData.unchangedSections.includes(section))
              || hasSectionData(respData, section, sectionPayloadKeys, sectionTablePaths)),
            rejectedTablePaths: deltaResult.rejectedPaths });
    } catch (error) {
      if (!onlyPrices && requestSequence !== farmRequestSequenceRef.current) {
        console.log(`[farm] stale request error ignored${requestTag ? ` (${requestTag})` : ""}`);
        return outcome('ignored', dataSetFarmRef.current || null, { reason: 'sequence-error' });
      }
      if (!onlyPrices && !isCalculationContextCurrent()) {
        console.log(`[farm] stale calculation error ignored${requestTag ? ` (${requestTag})` : ""}`);
        return outcome('ignored', dataSetFarmRef.current || null, { reason: 'options-error' });
      }
      if (!onlyPrices && !isFarmIdentityCurrent()) {
        console.log(`[farm] stale farm error ignored${requestTag ? ` (${requestTag})` : ""}`);
        return outcome('ignored', dataSetFarmRef.current || null, { reason: 'farm-intent-error' });
      }
      setReqState(`Error : ${error.message}`);
      throw error;
    } finally {
      if (isRefreshRequest) {
        refreshRequestCountRef.current = Math.max(0, refreshRequestCountRef.current - 1);
        refreshInFlightRef.current = refreshRequestCountRef.current > 0;
      }
      if (!onlyPrices) {
        endHeaderRequest();
      }
    }
  }, [
    API_URL, ui, dataSet, dataSetFarmRef, farmSectionHashesRef, farmTableHashesRef,
    tradeEntryHashesRef, deviceIdRef, beginHeaderRequest, endHeaderRequest,
    refreshInFlightRef, setpriceData, setFarmData, setBumpkinData, setdataSetFarm,
    setReqState, setOptions, setSectionsLoading, setMutants, setdeliveriesData, setCookie,
    sectionsMeta, sectionsMetaError, pageSectionRequirements,
    sectionPayloadKeys, sectionTablePaths, tryitConfig, getTryitRequestPayload, hasSectionData,
    hasPathData, showfDlvr, calculationIntentRef, farmIdentityIntentRef
  ]);

  const getPrices = useCallback(async (...args) => {
    const result = await getPricesWithOutcome(...args);
    return result.legacyValue;
  }, [getPricesWithOutcome]);
  return { getPrices, getPricesWithOutcome, beginHeaderRequest, endHeaderRequest };
}
