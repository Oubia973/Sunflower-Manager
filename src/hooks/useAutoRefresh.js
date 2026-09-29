/**
 * useAutoRefresh Hook - Auto-refresh timer management
 * Extracted from App.js auto-refresh logic
 */

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { computeRequiredSections } from '../utils/sections.js';

/**
 * Hook for auto-refresh functionality
 */
export function useAutoRefresh(
  options,
  ui,
  dataSetFarm,
  hasLoadedFarm,
  loadedFarmId,
  autoRefreshNonce,
  showfTNFT,
  showfGraph,
  showfDlvr,
  pageSectionRequirements,
  getPricesWithOutcome
) {
  const [, setAutoRefreshNonceState] = useState(0);
  const [autoRefreshPulse, setAutoRefreshPulse] = useState(0);
  const [autoRefreshNextAt, setAutoRefreshNextAt] = useState(0);
  const [autoRefreshDurationMs, setAutoRefreshDurationMs] = useState(60 * 1000);

  const autoRefreshPulseRef = useRef(0);
  const pageLastSyncedPulseRef = useRef({});
  const autoRefreshViewRef = useRef({
    selectedInv: 'home',
    activityDisplay: 'item',
    fishView: 'fish',
    petView: 'pets',
    showfDlvr: false,
  });
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const timerGenerationRef = useRef(0);
  const fetchDataRef = useRef(null);
  const autoRefreshForceNormalFirstCycleRef = useRef(false);
  const startAutoRefreshRef = useRef(null);
  const clearAllTimersRef = useRef(null);

  const autoRefreshEnabled = options?.autoRefresh !== false;
  const activeFarmId = String(loadedFarmId || dataSetFarm?.frmid || '').trim();
  const autoRefreshActive = !!(autoRefreshEnabled && hasLoadedFarm && activeFarmId && !showfTNFT && !showfGraph);
  const autoRefreshResetKey = `${activeFarmId}|${autoRefreshNonce}|${showfTNFT ? 1 : 0}|${showfGraph ? 1 : 0}|${autoRefreshPulse}`;
  const receiveContextKey = JSON.stringify([activeFarmId, dataSetFarm?.frmid, hasLoadedFarm,
    options, autoRefreshNonce, ui?.selectedInv, ui?.activityDisplay, ui?.fishView,
    ui?.petView, showfTNFT, showfGraph, showfDlvr, pageSectionRequirements]);
  const receiveContextRef = useRef({ key: receiveContextKey, generation: 0, active: true });
  useLayoutEffect(() => {
    receiveContextRef.current.farmId = activeFarmId;
    receiveContextRef.current.enabled = autoRefreshActive;
    if (receiveContextRef.current.key !== receiveContextKey) {
      receiveContextRef.current.key = receiveContextKey;
      receiveContextRef.current.generation += 1;
    }
  }, [receiveContextKey, activeFarmId, autoRefreshActive]);
  useLayoutEffect(() => {
    receiveContextRef.current.active = true;
    const invalidateVisibility = () => { receiveContextRef.current.generation += 1; };
    document.addEventListener('visibilitychange', invalidateVisibility);
    return () => {
      receiveContextRef.current.active = false;
      document.removeEventListener('visibilitychange', invalidateVisibility);
    };
  }, []);

  /**
   * Bump the auto-refresh pulse
   */
  const bumpAutoRefreshPulse = useCallback((page, markPage = true) => {
    const nextPulse = Number(autoRefreshPulseRef.current || 0) + 1;
    autoRefreshPulseRef.current = nextPulse;
    setAutoRefreshPulse(nextPulse);
    if (markPage) markPageSyncedPulse(page, nextPulse);
    return nextPulse;
  }, []);

  /**
   * Mark a page as synced at a specific pulse
   */
  const markPageSyncedPulse = useCallback((page, pulse = autoRefreshPulseRef.current) => {
    const pageKey = String(page || 'home');
    pageLastSyncedPulseRef.current = {
      ...(pageLastSyncedPulseRef.current || {}),
      [pageKey]: Number(pulse || 0),
    };
  }, []);

  const getPageSyncedPulse = useCallback((page) => {
    const pageKey = String(page || 'home');
    return Number(pageLastSyncedPulseRef.current?.[pageKey] ?? -1);
  }, []);

  /**
   * Reset pulse on farm change
   */
  const resetPulse = useCallback(() => {
    autoRefreshPulseRef.current = 0;
    pageLastSyncedPulseRef.current = {};
    setAutoRefreshPulse(0);
  }, []);

  /**
   * Fetch data for auto-refresh
   */
  const fetchData = useCallback(async (timerGeneration) => {
    if (!autoRefreshEnabled) return;
    if (!hasLoadedFarm) return;
    if (!activeFarmId) return;
    if (showfTNFT || showfGraph) return;
    if (document.visibilityState !== 'visible') return;

    const view = autoRefreshViewRef.current || {};
    const refreshUI = {
      selectedInv: view.selectedInv || 'home',
      activityDisplay: view.activityDisplay || 'item',
      fishView: view.fishView || 'fish',
      petView: view.petView || 'pets',
    };
    const sections = computeRequiredSections(refreshUI, pageSectionRequirements);
    const includeSections = view.selectedInv === 'activity'
      ? ['trades']
      : [...new Set([
          ...(Array.isArray(sections) ? sections : []),
          'trades',
          ...(view.showfDlvr ? ['orders', 'deliverypage'] : []),
        ])];

    const generation = receiveContextRef.current.generation;
    const requestContextKey = receiveContextRef.current.key;
    const page = view.selectedInv || 'home';
    try {
      const result = await getPricesWithOutcome(false, true, includeSections, false, page, true, 'AUTO_REFRESH');
      const confirmed = result?.confirmedSections || [];
      const canSync = result?.status === 'applied'
        && timerGeneration === timerGenerationRef.current
        && receiveContextRef.current.active
        && receiveContextRef.current.enabled
        && receiveContextRef.current.key === requestContextKey
        && receiveContextRef.current.generation === generation
        && document.visibilityState === 'visible'
        && String(result.requestedFarmId || '').trim() === activeFarmId
        && receiveContextRef.current.farmId === activeFarmId
        && result.requestedPage === page
        && includeSections.every(section => result.requestedSections?.includes(section) && confirmed.includes(section))
        && !result.rejectedTablePaths?.length;
      if (canSync) {
        // Activity refreshes trades only; that does not confirm its calculated page sections.
        bumpAutoRefreshPulse(page, sections.every(section => confirmed.includes(section)));
      }
      if (timerGeneration === timerGenerationRef.current && receiveContextRef.current.active
        && receiveContextRef.current.enabled && document.visibilityState === 'visible') {
        setAutoRefreshDurationMs(60 * 1000);
        setAutoRefreshNextAt(Date.now() + 60 * 1000);
      }
    } catch (error) {
      console.log(`Error: ${error}`);
    }
  }, [autoRefreshEnabled, hasLoadedFarm, activeFarmId, showfTNFT, showfGraph, pageSectionRequirements, getPricesWithOutcome, bumpAutoRefreshPulse, receiveContextKey]);

  /**
   * Clear all timers
   */
  const clearAllTimers = useCallback(() => {
    timerGenerationRef.current += 1;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useLayoutEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

  // Both start and reset own one generation; a cleared cycle cannot revive itself.
  const scheduleAutoRefresh = useCallback((firstDuration) => {
    const generation = timerGenerationRef.current;
    const normalDuration = 60 * 1000;
    const isCurrent = () => generation === timerGenerationRef.current
      && receiveContextRef.current.active && receiveContextRef.current.enabled
      && document.visibilityState === 'visible';
    const tick = () => {
      if (!isCurrent()) return Promise.resolve();
      return fetchDataRef.current(generation).catch(error => console.log(`Error: ${error}`));
    };
    setAutoRefreshDurationMs(firstDuration);
    setAutoRefreshNextAt(Date.now() + firstDuration);
    if (firstDuration !== normalDuration) {
      timeoutRef.current = setTimeout(() => {
        if (!isCurrent()) return;
        timeoutRef.current = null;
        tick().finally(() => {
          if (!isCurrent()) return;
          setAutoRefreshDurationMs(normalDuration);
          setAutoRefreshNextAt(Date.now() + normalDuration);
          intervalRef.current = setInterval(tick, normalDuration);
        });
      }, firstDuration);
    } else {
      intervalRef.current = setInterval(tick, normalDuration);
    }
  }, []);

  // Keep refs in sync with the latest callback instances
  clearAllTimersRef.current = clearAllTimers;

  /**
   * Start auto-refresh timers
   */
  const startAutoRefresh = useCallback(() => {
    clearAllTimersRef.current();

    if (!autoRefreshEnabled || !hasLoadedFarm || !activeFarmId || showfTNFT || showfGraph || document.visibilityState !== 'visible') {
      setAutoRefreshNextAt(0);
      return;
    }

    const normalDuration = 60 * 1000;
    const firstDuration = autoRefreshForceNormalFirstCycleRef.current
      ? normalDuration
      : (dataSetFarm?.isabo ? normalDuration : 20 * 1000);
    autoRefreshForceNormalFirstCycleRef.current = false;

    scheduleAutoRefresh(firstDuration);
  }, [autoRefreshEnabled, hasLoadedFarm, activeFarmId, dataSetFarm?.isabo, showfTNFT, showfGraph, scheduleAutoRefresh]);

  // Keep startAutoRefresh ref in sync
  startAutoRefreshRef.current = startAutoRefresh;

  /**
   * Stop auto-refresh timers
   */
  const stopAutoRefresh = useCallback(() => {
    clearAllTimersRef.current();
    setAutoRefreshNextAt(0);
  }, []);

  /**
   * Reset auto-refresh timers immediately.
   */
  const resetAutoRefreshTimer = useCallback((nextFarmState = null) => {
    clearAllTimersRef.current();

    const farmState = nextFarmState || dataSetFarm || {};
    if (!autoRefreshEnabled || !hasLoadedFarm || !(farmState?.frmid || activeFarmId) || showfTNFT || showfGraph || document.visibilityState !== 'visible') {
      setAutoRefreshNextAt(0);
      return;
    }

    const normalDuration = 60 * 1000;
    const firstDuration = autoRefreshForceNormalFirstCycleRef.current
      ? normalDuration
      : (farmState?.isabo ? normalDuration : 20 * 1000);
    autoRefreshForceNormalFirstCycleRef.current = false;
    scheduleAutoRefresh(firstDuration);
  }, [autoRefreshEnabled, hasLoadedFarm, activeFarmId, dataSetFarm, showfTNFT, showfGraph, scheduleAutoRefresh]);

  // Update view ref when UI changes
  useEffect(() => {
    autoRefreshViewRef.current = {
      selectedInv: ui?.selectedInv || 'home',
      activityDisplay: ui?.activityDisplay || 'item',
      fishView: ui?.fishView || 'fish',
      petView: ui?.petView || 'pets',
      showfDlvr: !!showfDlvr,
    };
  }, [ui?.selectedInv, ui?.activityDisplay, ui?.fishView, ui?.petView, showfDlvr]);

  // Reset pulse on farm change
  useEffect(() => {
    resetPulse();
  }, [dataSetFarm?.frmid, resetPulse]);

  // Start/stop auto-refresh (uses refs to avoid re-creating effect on navigation)
  useEffect(() => {
    startAutoRefreshRef.current();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startAutoRefreshRef.current();
      } else {
        clearAllTimersRef.current();
        setAutoRefreshNextAt(0);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllTimersRef.current();
    };
  }, [activeFarmId, hasLoadedFarm, autoRefreshNonce, showfTNFT, showfGraph, pageSectionRequirements, autoRefreshEnabled]);

  // Stop when modals are open
  useEffect(() => {
    if (showfTNFT || showfGraph) {
      clearAllTimersRef.current();
      setAutoRefreshNextAt(0);
    }
  }, [showfTNFT, showfGraph]);

  return {
    autoRefreshActive,
    autoRefreshResetKey,
    autoRefreshDurationMs,
    setAutoRefreshDurationMs,
    autoRefreshNextAt,
    setAutoRefreshNextAt,
    autoRefreshEnabled,
    autoRefreshPulse,
    setAutoRefreshNonce: setAutoRefreshNonceState,
    autoRefreshForceNormalFirstCycleRef,
    bumpAutoRefreshPulse,
    markPageSyncedPulse,
    getPageSyncedPulse,
    startAutoRefresh,
    stopAutoRefresh,
    resetAutoRefreshTimer,
    clearAllTimers,
  };
}

export default useAutoRefresh;
