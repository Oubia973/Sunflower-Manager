/**
 * useModalHandlers Hook - Modal handlers
 * Extracted from App.js modal handlers
 */

import { useCallback } from 'react';
import { unpackFarmPayloadTables, mergeFarmStateDeep, stripFarmMetadata } from '../fct.js';
import { buildTryitCoverageSignature, hasSectionData, mergeKnownHashesFromPayload } from '../utils/farmState.js';
import { computeRequiredSections } from '../utils/sections.js';
import { buildCanonicalTryitSnapshot, writeTryitSnapshot, hasTryitPayloadContent, isValidTryitConfig, syncTryitStateAcrossFarmState } from '../tryitStorage.js';

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
  getPrices
) {

  /**
   * Handle TryNFT modal open
   */
  const handleButtonfTNFTClick = useCallback(async () => {
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
        const syncedFarm = await getPrices(false, true, ["boosts", "inventory"], hasTryitOverrides, "trynft", true, hasTryitOverrides ? "TRYNFT_OPEN_TRY_SYNC" : "trynft");
        if (syncedFarm && typeof syncedFarm === "object") {
          dataSetFarmRef.current = stripFarmMetadata(syncedFarm, 'useModalHandlers/onSync');
          tryNftOpenCoverageRef.current = { farmId: currentFarmId, signature: tryitSignature, updatedAt: Date.now() };
        }
      } catch (error) { console.log("TryNFT preload error", error); }
    }
    setShowfTNFT(true);
  }, [dataSet, dataSetFarmRef, getTryitRequestPayload, tryitConfig, sectionPayloadKeys, sectionTablePaths,
    farmSectionHashesRef, farmTableHashesRef, tryNftOpenCoverageRef, lastID, getPrices]);

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
        await getPrices(false, true, ["orders", "deliverypage"], false, "delivery", true);
        deliveryLastSyncRef.current = { farmId: currentFarmId, pulse: Number(autoRefreshPulse) };
      } catch (error) { console.log("Delivery preload error", error); }
    }
    setShowfDlvr(true);
  }, [dataSet, dataSetFarmRef, sectionPayloadKeys, sectionTablePaths, deliveryLastSyncRef, autoRefreshPulse, getPrices]);

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
      const unpackedTryPayload = unpackFarmPayloadTables(xdataSetFarm);
      const safeTryPayload = { ...(unpackedTryPayload || {}) };
      delete safeTryPayload.ftrades;
      delete safeTryPayload.ftradesHeader;
      if (!Object.prototype.hasOwnProperty.call(safeTryPayload, "ftrades")) safeTryPayload.ftrades = prevFarmState?.ftrades;
      if (!Object.prototype.hasOwnProperty.call(safeTryPayload, "ftradesHeader")) safeTryPayload.ftradesHeader = prevFarmState?.ftradesHeader;
      const mergedFarmStateRaw = mergeFarmStateDeep(dataSetFarmRef.current || {}, safeTryPayload, tryitConfig);
      mergeKnownHashesFromPayload(safeTryPayload, farmSectionHashesRef, farmTableHashesRef);
      const tryitSnapshot = buildCanonicalTryitSnapshot(mergedFarmStateRaw, tryitConfig);
      const mergedFarmState = tryitSnapshot
        ? syncTryitStateAcrossFarmState(mergedFarmStateRaw, tryitConfig, tryitSnapshot)
        : mergedFarmStateRaw;
      const cleanFarmData = stripFarmMetadata(mergedFarmState, 'useModalHandlers/onClose');
      dataSetFarmRef.current = cleanFarmData;
      setdataSetFarm(cleanFarmData);
      setCookie(mergedFarmState, dataSet, lastID);
      if (tryitSnapshot) writeTryitSnapshot(tryitSnapshot, mergedFarmState?.frmid || dataSet?.options?.farmId || "");
      setdeliveriesData(mergedFarmState?.orderstable || []);
      const nextRefreshPulse = typeof bumpAutoRefreshPulse === "function"
        ? bumpAutoRefreshPulse(ui?.selectedInv || "home")
        : Number(autoRefreshPulse || 0);
      if (pageSectionRequirements && typeof getPrices === "function") {
        const closeRefreshUI = { ...(ui || {}), selectedInv: ui?.selectedInv || "home" };
        const activeSections = computeRequiredSections(closeRefreshUI, pageSectionRequirements);
        const closeRefreshSections = [...new Set([...(Array.isArray(activeSections) ? activeSections : []), "orders", "deliverypage"])];
        try {
          await getPrices(false, false, closeRefreshSections, true, closeRefreshUI.selectedInv, true, "TRYNFT_CLOSE");
          deliveryLastSyncRef.current = {
            farmId: String(mergedFarmState?.frmid || dataSet?.options?.farmId || ""),
            pulse: nextRefreshPulse,
          };
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
  }, [dataSet, dataSetFarmRef, setdataSetFarm, setCookie, lastID, tryitConfig, farmSectionHashesRef, farmTableHashesRef, setdeliveriesData, setShowfTNFT, bumpAutoRefreshPulse, ui, autoRefreshPulse, pageSectionRequirements, getPrices, deliveryLastSyncRef]);

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
    const unpackedTryPayload = unpackFarmPayloadTables(xdataSetFarm);
    const safeTryPayload = { ...(unpackedTryPayload || {}) };
    delete safeTryPayload.ftrades;
    delete safeTryPayload.ftradesHeader;
    if (!Object.prototype.hasOwnProperty.call(safeTryPayload, "ftrades")) safeTryPayload.ftrades = prevFarmState?.ftrades;
    if (!Object.prototype.hasOwnProperty.call(safeTryPayload, "ftradesHeader")) safeTryPayload.ftradesHeader = prevFarmState?.ftradesHeader;
    const mergedFarmStateRaw = mergeFarmStateDeep(dataSetFarmRef.current || {}, safeTryPayload, tryitConfig);
    mergeKnownHashesFromPayload(safeTryPayload, farmSectionHashesRef, farmTableHashesRef);
    const tryitSnapshot = buildCanonicalTryitSnapshot(mergedFarmStateRaw, tryitConfig);
    const mergedFarmState = tryitSnapshot
      ? syncTryitStateAcrossFarmState(mergedFarmStateRaw, tryitConfig, tryitSnapshot)
      : mergedFarmStateRaw;
    const cleanFarmData = stripFarmMetadata(mergedFarmState, 'useModalHandlers/onRefresh');
    dataSetFarmRef.current = cleanFarmData;
    setdataSetFarm(cleanFarmData);
    setCookie(mergedFarmState, dataSet, lastID);
    if (options?.persistTrySnapshot !== false && tryitSnapshot) {
      writeTryitSnapshot(tryitSnapshot, mergedFarmState?.frmid || dataSet?.options?.farmId || "");
    }
    if (!mergedFarmState?.ftrades && !mergedFarmState?.ftradesHeader && typeof getPrices === "function") {
      getPrices(false, true, ["trades"]).catch((error) => {
        console.log("TryNFT refresh trades sync error", error);
      });
    }
  }, [dataSet, dataSetFarmRef, setdataSetFarm, setCookie, lastID, tryitConfig, farmSectionHashesRef, farmTableHashesRef, getPrices]);

  return {
    handleButtonfTNFTClick,
    handleButtonfDlvrClick,
    handleClosefTNFT,
    handleRefreshfTNFT,
  };
}
