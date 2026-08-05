/**
 * useNotificationHelpers Hook - Notification helper functions
 * Extracted from App.js buildDisabledNotifItems, buildAuctionWatchEntries
 */

import { useCallback } from 'react';

/**
 * Hook for notification helpers
 */
export function useNotificationHelpers(dataSet, dataSetFarmRef, curID) {

  /**
   * Get current notification farm ID
   */
  const getCurrentNotifFarmId = useCallback(() => {
    return String(dataSetFarmRef?.current?.frmid || dataSet?.options?.farmId || curID || "").trim();
  }, [dataSet, dataSetFarmRef, curID]);

  /**
   * Build disabled notification items list
   */
  const buildDisabledNotifItems = useCallback(() => {
    const notifList = dataSet?.options?.notifList || [];
    return notifList
      .filter(([, enabled]) => Number(enabled) !== 1)
      .map(([key]) => key);
  }, [dataSet?.options?.notifList]);

  /**
   * Build auction watch entries for notification sync
   */
  const buildAuctionWatchEntries = useCallback((source = dataSet.options?.auctionNotifSelection) => {
    const farmKey = String(dataSetFarmRef?.current?.frmid || dataSet?.options?.farmId || curID || "").trim();
    const allSelections = (source && typeof source === "object") ? source : {};
    const src = farmKey && allSelections?.[farmKey] && typeof allSelections[farmKey] === "object"
      ? allSelections[farmKey]
      : {};
    return Object.entries(src)
      .map(([auctionId, rawEntry]) => {
        const entry = (rawEntry && typeof rawEntry === "object") ? rawEntry : {};
        const endAt = Number(entry?.e ?? entry?.endAt ?? 0);
        const label = String(entry?.l ?? entry?.label ?? "").trim();
        const id = String(auctionId || entry?.id || "").trim();
        if (!id || !Number.isFinite(endAt) || endAt <= Date.now()) return null;
        return { id, e: endAt, l: label || id };
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.e || 0) - Number(b.e || 0));
  }, [dataSet, dataSetFarmRef, curID]);

  return {
    getCurrentNotifFarmId,
    buildDisabledNotifItems,
    buildAuctionWatchEntries,
  };
}
