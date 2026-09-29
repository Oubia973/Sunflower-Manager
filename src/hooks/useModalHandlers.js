import { prepareTryModalResponse } from "../utils/farmResponse/prepareFarmResponse.js";
/**
 * useModalHandlers Hook - Modal handlers
 * Extracted from App.js modal handlers
 */

import { useCallback } from 'react';
import { mergeFarmStateDeep, stripFarmMetadata } from '../fct.js';
import { buildTryitCoverageSignature, hasSectionData, mergeKnownHashesFromPayload } from '../utils/farmState.js';
import { computeRequiredSections } from '../utils/sections.js';
import { readTryitSnapshot, hasTryitPayloadContent, isValidTryitConfig, syncTryitStateAcrossFarmState } from '../tryitStorage.js';

function confirmsModalSections(outcome, farm, farmId, page, sections, sectionPayloadKeys, sectionTablePaths) {
  return outcome?.status === 'applied'
    && String(outcome.requestedFarmId || '').trim() === farmId
    && String(farm?.frmid || '').trim() === farmId
    && outcome.requestedPage === page
    && !outcome.rejectedTablePaths?.length
    && sections.every(section => outcome.requestedSections?.includes(section)
      && outcome.confirmedSections?.includes(section)
      && hasSectionData(farm, section, sectionPayloadKeys, sectionTablePaths));
}

/**
 * Hook for modal handlers
 */
export function useModalHandlers(
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
  getPrices,
  getPricesWithOutcome
) {

  /**
   * Handle TryNFT modal open
   */
  const handleButtonfTNFTClick = useCallback(async (options = {}) => {
    if (!isValidTryitConfig(tryitConfig)) {
      console.error("TRYIT_CONFIG missing: TryNFT opening blocked to preserve local selections.");
      return;
    }
    const hasFullTryTables =
      hasSectionData(dataSetFarmRef.current, "boosts", sectionPayloadKeys, sectionTablePaths) &&
      hasSectionData(dataSetFarmRef.current, "inventory", sectionPayloadKeys, sectionTablePaths);
    const currentFarmState = dataSetFarmRef.current || {};
    const tryitPayload = getTryitRequestPayload(currentFarmState);
    const tryitSignature = buildTryitCoverageSignature(tryitPayload);
    const hasTryitOverrides =
      String(tryitPayload?.tryitMode || "active") !== "active" &&
      hasTryitPayloadContent(tryitPayload?.tryitarrays);
    const currentFarmId = String(currentFarmState?.frmid || dataSet?.options?.farmId || "");
    const openCoverage = tryNftOpenCoverageRef.current;
    const hasSyncedCurrentTryit =
      openCoverage && openCoverage.farmId === currentFarmId && openCoverage.signature === tryitSignature;
    const mustSyncTryTables = !hasFullTryTables || (hasTryitOverrides && !hasSyncedCurrentTryit);

    if (mustSyncTryTables) {
      try {
        // Include the current page too.  Refreshing only the Tryset tables can
        // invalidate the active page projection (notably invData), causing a
        // momentary "Loading page data..." while a second request reloads it.
        const currentPage = String(ui?.selectedInv || "home");
        const currentPageSections = computeRequiredSections(ui, pageSectionRequirements);
        const sectionsToSync = [...new Set(["boosts", "inventory", ...currentPageSections])];
        const outcome = await getPricesWithOutcome(
          false,
          true,
          sectionsToSync,
          hasTryitOverrides,
          currentPage,
          true,
          hasTryitOverrides ? "TRYNFT_OPEN_TRY_SYNC" : "trynft"
        );
        const currentFarm = dataSetFarmRef.current || {};
        if (confirmsModalSections(outcome, currentFarm, currentFarmId, currentPage, sectionsToSync,
          sectionPayloadKeys, sectionTablePaths)
          && buildTryitCoverageSignature(getTryitRequestPayload(currentFarm)) === tryitSignature) {
          tryNftOpenCoverageRef.current = { farmId: currentFarmId, signature: tryitSignature, updatedAt: Date.now() };
        }
      } catch (error) { console.log("TryNFT preload error", error); }
    }
    if (options?.openModal !== false) {
      setShowfTNFT(true);
    }
    return dataSetFarmRef.current || null;
  }, [dataSet, dataSetFarmRef, getTryitRequestPayload, tryitConfig, sectionPayloadKeys, sectionTablePaths,
    farmSectionHashesRef, farmTableHashesRef, tryNftOpenCoverageRef, lastID, getPricesWithOutcome, ui, pageSectionRequirements]);

  /**
   * Handle Delivery modal open
   */
  const handleButtonfDlvrClick = useCallback(async () => {
    const hasOrdersData = !!dataSetFarmRef.current?.orderstable && !!dataSetFarmRef.current?.orderstable?.orders && !!dataSetFarmRef.current?.orderstable?.chores && !!dataSetFarmRef.current?.orderstable?.bounties;
    const hasDeliveryTables = hasSectionData(dataSetFarmRef.current, "deliverypage", sectionPayloadKeys, sectionTablePaths);
    const currentFarmId = String(dataSetFarmRef.current?.frmid || dataSet?.options?.farmId || "");
    const lastSync = deliveryLastSyncRef.current || { farmId: "", pulse: -1 };
    const autoRefreshSinceLastOpen = currentFarmId !== String(lastSync.farmId || "") || Number(autoRefreshPulse) > Number(lastSync.pulse ?? -1);
    const mustSync = !hasOrdersData || !hasDeliveryTables || autoRefreshSinceLastOpen;

    if (mustSync) {
      try {
        const sectionsToSync = ["orders", "deliverypage"];
        const tryitSignature = buildTryitCoverageSignature(getTryitRequestPayload(dataSetFarmRef.current || {}));
        const outcome = await getPricesWithOutcome(false, true, sectionsToSync, false, "delivery", true);
        const currentFarm = dataSetFarmRef.current || {};
        if (confirmsModalSections(outcome, currentFarm, currentFarmId, "delivery", sectionsToSync,
          sectionPayloadKeys, sectionTablePaths)
          && buildTryitCoverageSignature(getTryitRequestPayload(currentFarm)) === tryitSignature) {
          deliveryLastSyncRef.current = { farmId: currentFarmId, pulse: Number(autoRefreshPulse) };
        }
      } catch (error) { console.log("Delivery preload error", error); }
    }
    setShowfDlvr(true);
  }, [dataSet, dataSetFarmRef, sectionPayloadKeys, sectionTablePaths, deliveryLastSyncRef, autoRefreshPulse,
    getTryitRequestPayload, getPricesWithOutcome]);

  /**
   * Handle TryNFT modal close
   */
  const handleClosefTNFT = useCallback(async (xdataSet, xdataSetFarm) => {
    try {
      if (!isValidTryitConfig(tryitConfig)) {
        console.error("TRYIT_CONFIG missing: TryNFT close skipped to preserve local selections.");
        return;
      }
      Object.assign(dataSet, xdataSet);
      const prevFarmState = dataSetFarmRef.current || {};
      const safeTryPayload = prepareTryModalResponse(prevFarmState, xdataSetFarm);
      const mergedFarmStateRaw = mergeFarmStateDeep(dataSetFarmRef.current || {}, safeTryPayload, tryitConfig);
      mergeKnownHashesFromPayload(safeTryPayload, farmSectionHashesRef, farmTableHashesRef);
      // Closing the modal is not a Tryset edit. Re-apply the persisted client
      // configuration instead of rebuilding it from a possibly partial state.
      const tryitSnapshot = readTryitSnapshot(mergedFarmStateRaw?.frmid || dataSet?.options?.farmId || "");
      const mergedFarmState = hasTryitPayloadContent(tryitSnapshot)
        ? syncTryitStateAcrossFarmState(mergedFarmStateRaw, tryitConfig, tryitSnapshot)
        : mergedFarmStateRaw;
      const cleanFarmData = stripFarmMetadata(mergedFarmState, 'useModalHandlers/onClose');
      dataSetFarmRef.current = cleanFarmData;
      setdataSetFarm(cleanFarmData);
      setCookie(mergedFarmState, dataSet, lastID);
      setdeliveriesData(mergedFarmState?.orderstable || []);
      const nextRefreshPulse = typeof bumpAutoRefreshPulse === "function"
        ? bumpAutoRefreshPulse(ui?.selectedInv || "home")
        : Number(autoRefreshPulse || 0);
      if (pageSectionRequirements && typeof getPricesWithOutcome === "function") {
        const closeRefreshUI = { ...(ui || {}), selectedInv: ui?.selectedInv || "home" };
        const activeSections = computeRequiredSections(closeRefreshUI, pageSectionRequirements);
        const closeRefreshSections = [...new Set([...(Array.isArray(activeSections) ? activeSections : []), "orders", "deliverypage"])];
        const farmId = String(mergedFarmState?.frmid || dataSet?.options?.farmId || "").trim();
        const tryitSignature = buildTryitCoverageSignature(getTryitRequestPayload(cleanFarmData));
        try {
          const outcome = await getPricesWithOutcome(false, false, closeRefreshSections, true,
            closeRefreshUI.selectedInv, true, "TRYNFT_CLOSE");
          const currentFarm = dataSetFarmRef.current || {};
          if (confirmsModalSections(outcome, currentFarm, farmId, closeRefreshUI.selectedInv,
            closeRefreshSections, sectionPayloadKeys, sectionTablePaths)
            && buildTryitCoverageSignature(getTryitRequestPayload(currentFarm)) === tryitSignature) {
            deliveryLastSyncRef.current = { farmId, pulse: nextRefreshPulse };
          }
        } catch (error) {
          console.log("TryNFT close page refresh error", error);
        }
      }
      if (!mergedFarmState?.ftrades && !mergedFarmState?.ftradesHeader && typeof getPrices === "function") {
        getPrices(false, true, ["trades"]).catch((error) => {
          console.log("TryNFT close trades sync error", error);
        });
      }
    } catch (error) {
      console.log("TryNFT close error", error);
    } finally {
      setShowfTNFT(false);
    }
  }, [dataSet, dataSetFarmRef, setdataSetFarm, setCookie, lastID, tryitConfig, farmSectionHashesRef,
    farmTableHashesRef, setdeliveriesData, setShowfTNFT, bumpAutoRefreshPulse, ui, autoRefreshPulse,
    pageSectionRequirements, sectionPayloadKeys, sectionTablePaths, getTryitRequestPayload,
    getPrices, getPricesWithOutcome, deliveryLastSyncRef]);

  /**
   * Handle TryNFT modal refresh
   */
  const handleRefreshfTNFT = useCallback((xdataSet, xdataSetFarm, options = {}) => {
    if (!isValidTryitConfig(tryitConfig)) {
      console.error("TRYIT_CONFIG missing: TryNFT refresh skipped to preserve local selections.");
      return;
    }
    Object.assign(dataSet, xdataSet);
    const prevFarmState = dataSetFarmRef.current || {};
    const safeTryPayload = prepareTryModalResponse(prevFarmState, xdataSetFarm);
    const mergedFarmStateRaw = mergeFarmStateDeep(dataSetFarmRef.current || {}, safeTryPayload, tryitConfig);
    mergeKnownHashesFromPayload(safeTryPayload, farmSectionHashesRef, farmTableHashesRef);
    // Refreshing calculated data must not redefine frontend-owned Tryset fields.
    const tryitSnapshot = readTryitSnapshot(mergedFarmStateRaw?.frmid || dataSet?.options?.farmId || "");
    const mergedFarmState = hasTryitPayloadContent(tryitSnapshot)
      ? syncTryitStateAcrossFarmState(mergedFarmStateRaw, tryitConfig, tryitSnapshot)
      : mergedFarmStateRaw;
    const cleanFarmData = stripFarmMetadata(mergedFarmState, 'useModalHandlers/onRefresh');
    dataSetFarmRef.current = cleanFarmData;
    setdataSetFarm(cleanFarmData);
    if (options?.markTryitSynced === true) {
      tryNftOpenCoverageRef.current = {
        farmId: String(cleanFarmData?.frmid || dataSet?.options?.farmId || ""),
        signature: buildTryitCoverageSignature(getTryitRequestPayload(cleanFarmData)),
        updatedAt: Date.now(),
      };
    }
    setCookie(mergedFarmState, dataSet, lastID);
    if (!mergedFarmState?.ftrades && !mergedFarmState?.ftradesHeader && typeof getPrices === "function") {
      getPrices(false, true, ["trades"]).catch((error) => {
        console.log("TryNFT refresh trades sync error", error);
      });
    }
  }, [dataSet, dataSetFarmRef, setdataSetFarm, setCookie, lastID, tryitConfig, farmSectionHashesRef, farmTableHashesRef,
    tryNftOpenCoverageRef, getTryitRequestPayload, getPrices]);

  return {
    handleButtonfTNFTClick,
    handleButtonfDlvrClick,
    handleClosefTNFT,
    handleRefreshfTNFT,
  };
}
