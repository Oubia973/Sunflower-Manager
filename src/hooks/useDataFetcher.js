/**
 * useDataFetcher Hook - Data fetching and price processing
 * Extracted from App.js getPrices function
 */

import { useRef, useCallback } from 'react';
import {
  unpackFarmPayloadTables,
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
  extractReceivedTableHashes,
  mergeTradeEntryHashesFromPayload,
  applyTradesDeltaToPayload,
  shouldDebugHashFlow,
  hasInventoryItemFields,
  collectKnownProjectionHashes,
} from '../utils/farmState.js';
import { getBalanceValue } from '../utils/balance.js';
import { computeRequiredSections } from '../utils/sections.js';
import { fetchJson } from '../services/apiClient.js';
import { normalizeServerImagesDeep, versionImageUrl } from '../constants/images.js';

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
  showfDlvr
) {
  // Internal header request tracking (eliminates circular dependency with useSectionLoader)
  const headerRequestCountRef = useRef(0);
  const farmRequestSequenceRef = useRef(0);
  const refreshRequestCountRef = useRef(0);

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
  const getPrices = useCallback(async (
    onlyPrices,
    withSectionLoader = false,
    forcedSections = null,
    forceRecalc = false,
    forcedPage = null,
    alwaysCheckServer = false,
    requestTag = ""
  ) => {
    if (!onlyPrices && (!pageSectionRequirements || !sectionPayloadKeys || !sectionTablePaths)) {
      setReqState(sectionsMetaError || "Config sections missing");
      return;
    }
    if (!onlyPrices && !isValidTryitConfig(tryitConfig)) {
      setReqState(sectionsMetaError || "Tryset config missing. Local selections are preserved; calculations are paused until backend config reloads.");
      return null;
    }
    const currentFarmState = dataSetFarmRef.current || {};
    const { tryitarrays: tryItArrays, tryitMode } = getTryitRequestPayload(currentFarmState);
    const requestTryitSignature = buildTryitCoverageSignature({
      tryitarrays: tryItArrays,
      tryitMode,
    });
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
    const hasAllRequestedSectionsLocal = includeMissingOnly.length < 1;
    if (!onlyPrices && withSectionLoader && !forceRecalc && !alwaysCheckServer && hasAllRequestedSectionsLocal) {
      setReqState('');
      return;
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
    let vHeaders = onlyPrices ? {
      onlyprices: "true",
    } : {
      frmid: requestFarmId,
      deviceId: deviceIdRef.current,
      options: dataSet.options,
      selectedTrySeason: String(ui?.selectedTrySeason || "all").toLowerCase(),
      include: [...new Set(includeToRequest)],
      page: requestedPage,
      knownHashes,
      knownProjectionHashes: collectKnownProjectionHashes(currentFarmState),
      knownTableHashes,
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
    }
    try {
      const responseData = await fetchJson(API_URL, "/getdatacrypto", {
        method: 'POST',
        body: vHeaders,
        timeoutMs: 30_000,
      });
        if (!onlyPrices && requestSequence !== farmRequestSequenceRef.current) {
          console.log(`[farm] stale response ignored${requestTag ? ` (${requestTag})` : ""}`);
          return dataSetFarmRef.current || null;
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
          return dataSetFarmRef.current || null;
        }
        const latestTryitSignature = buildTryitCoverageSignature(
          getTryitRequestPayload(dataSetFarmRef.current || {})
        );
        if (!onlyPrices && latestTryitSignature !== requestTryitSignature) {
          console.log(`[tryset] stale response ignored${requestTag ? ` (${requestTag})` : ""}`);
          setReqState('');
          return dataSetFarmRef.current || null;
        }
        const rawRespData = unpackFarmPayloadTables(responseData.allData);
        const normalizedRawRespData = normalizeServerImagesDeep(rawRespData || {});
        if (normalizedRawRespData?.constants?.imgtkt) {
          normalizedRawRespData.constants.imgtkt = versionImageUrl(normalizedRawRespData.constants.imgtkt);
        }
        const respData = rawRespData && typeof rawRespData === "object"
          ? applyTradesDeltaToPayload(currentFarmState, normalizedRawRespData)
          : normalizedRawRespData;
        let mergedFarmData = currentFarmState;
        if (Array.isArray(responseData.priceData) || typeof responseData.priceData === 'string') {
          setpriceData(responseData.priceData);
          if (Array.isArray(responseData.priceData)) {
            dataSet.options.usdSfl = responseData.priceData[2];
          }
        } else {
          console.error('[DEBUG useDataFetcher] priceData is not array/string, skipping setpriceData. Value:', responseData.priceData);
        }
        if (respData !== "" && respData !== undefined) {
          if (respData?.sectionHashes && typeof respData.sectionHashes === "object") {
            farmSectionHashesRef.current = {
              ...(farmSectionHashesRef.current || {}),
              ...respData.sectionHashes,
            };
          }
          if (respData?.tableHashes && typeof respData.tableHashes === "object") {
            const knownFromPayload = extractReceivedTableHashes(respData, respData.tableHashes);
            farmTableHashesRef.current = {
              ...(farmTableHashesRef.current || {}),
              ...knownFromPayload,
            };
          }
          mergeTradeEntryHashesFromPayload(rawRespData, tradeEntryHashesRef);
          mergedFarmData = mergeFarmStateDeep(currentFarmState, respData, tryitConfig);
          const tryitSnapshot = resolveTryitSnapshot({
            farmState: currentFarmState,
            tryitConfig,
            responseSnapshot: null,
            farmId: String(currentFarmState?.frmid || dataSet?.options?.farmId || "").trim(),
          });
          mergedFarmData = syncTryitStateAcrossFarmState(mergedFarmData, tryitConfig, tryitSnapshot);
          const farmMeta = mergedFarmData?.farmMeta || mergedFarmData?.frmData || {};
          setFarmData(farmMeta);
          dataSet.options.isAbo = mergedFarmData.isabo;
          dataSet.isVip = farmMeta?.vip;
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
            dataSet?.options?.gemsPack || 7400,
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
        setReqState('');
        return mergedFarmData;
    } catch (error) {
      if (!onlyPrices && requestSequence !== farmRequestSequenceRef.current) {
        console.log(`[farm] stale request error ignored${requestTag ? ` (${requestTag})` : ""}`);
        return dataSetFarmRef.current || null;
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
    hasPathData, showfDlvr
  ]);

  return { getPrices, beginHeaderRequest, endHeaderRequest };
}
