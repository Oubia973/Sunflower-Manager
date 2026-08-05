/**
 * useTryitSync Hook - Tryit snapshot and sync management
 * Extracted from App.js tryit-related logic
 */

import { useRef, useCallback } from 'react';
import {
  hasTryitPayloadContent,
  buildCanonicalTryitSnapshot,
  isValidTryitConfig,
  readTryitSnapshot,
  writeTryitSnapshot,
} from '../tryitStorage.js';

/**
 * Hook for tryit snapshot management
 */
export function useTryitSync(dataSetFarmRef, tryitConfig) {
  const pendingTryitSnapshotRef = useRef(false);

  /**
   * Get tryit request payload for current farm state
   */
  const getTryitRequestPayload = useCallback((farmState) => {
    if (!isValidTryitConfig(tryitConfig)) {
      return {
        tryitarrays: {},
        tryitMode: 'config-missing',
        configMissing: true,
      };
    }
    const farmId = String(farmState?.frmid || dataSetFarmRef?.current?.frmid || "").trim();
    const stored = readTryitSnapshot(farmId);
    if (hasTryitPayloadContent(stored)) {
      return { tryitarrays: stored, tryitMode: 'snapshot' };
    }
    return { tryitarrays: {}, tryitMode: 'active' };
  }, [tryitConfig, dataSetFarmRef]);

  /**
   * Mark that tryit snapshot needs to be saved
   */
  const markTryitPending = useCallback(() => {
    pendingTryitSnapshotRef.current = true;
  }, []);

  /**
   * Build and write tryit snapshot
   */
  const buildAndWriteSnapshot = useCallback((farmState, farmId) => {
    if (!isValidTryitConfig(tryitConfig)) {
      console.error("TRYIT_CONFIG missing: snapshot write skipped to preserve client fields.");
      return null;
    }
    const existing = readTryitSnapshot(farmId || farmState?.frmid || '');
    if (!hasTryitPayloadContent(existing)) {
      console.error("TRYIT snapshot write skipped: no existing local client configuration to refresh.");
      return null;
    }
    const snapshot = buildCanonicalTryitSnapshot(farmState, tryitConfig);
    if (hasTryitPayloadContent(snapshot)) {
      writeTryitSnapshot(snapshot, farmId || farmState?.frmid || '');
    }
    return snapshot;
  }, [tryitConfig]);

  /**
   * Process tryit snapshot pending flag
   */
  const processPendingTryitSnapshot = useCallback((currentFarmState) => {
    if (!pendingTryitSnapshotRef.current) return;
    pendingTryitSnapshotRef.current = false;
    if (!isValidTryitConfig(tryitConfig)) {
      console.error("TRYIT_CONFIG missing: pending snapshot write skipped to preserve client fields.");
      return;
    }
    const farmState = currentFarmState || dataSetFarmRef.current || {};
    const farmId = String(farmState?.frmid || '');
    const snapshot = buildCanonicalTryitSnapshot(farmState, tryitConfig);
    if (hasTryitPayloadContent(snapshot)) {
      writeTryitSnapshot(snapshot, farmId);
    }
  }, [tryitConfig, dataSetFarmRef]);

  return {
    getTryitRequestPayload,
    markTryitPending,
    buildAndWriteSnapshot,
    processPendingTryitSnapshot,
    pendingTryitSnapshotRef,
  };
}

export default useTryitSync;
