/**
 * useSectionLoader Hook - Section loading and hash management
 * Extracted from App.js section loading logic
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { hasSectionData } from '../utils/farmState.js';
import { computeRequiredSections } from '../utils/sections.js';

/**
 * Hook for section loading and navigation
 */
export function useSectionLoader(
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
) {
  const [sectionsLoading] = useState(false);
  const [headerRequestLoading, setHeaderRequestLoading] = useState(false);

  const navLoadInFlightRef = useRef(false);
  const lastNavLoadSignatureRef = useRef({ signature: '', at: 0 });
  const suppressNavUntilRef = useRef(0);
  const postTryCloseCoverageRef = useRef(null);

  let headerRequestCountRef = useRef(0);

  /**
   * Begin a header request
   */
  const beginHeaderRequest = useCallback(() => {
    headerRequestCountRef.current += 1;
    setHeaderRequestLoading(true);
  }, []);

  /**
   * End a header request
   */
  const endHeaderRequest = useCallback(() => {
    headerRequestCountRef.current = Math.max(0, headerRequestCountRef.current - 1);
    if (headerRequestCountRef.current < 1) {
      setHeaderRequestLoading(false);
    }
  }, []);

  /**
   * Mark page as synced
   */
  const markPageSynced = useCallback(() => {
    // This would update the pulse tracking in useAutoRefresh
    // For now, it's handled there
  }, []);

  /**
   * Load sections if needed for current page
   */
  const loadSectionsIfNeeded = useCallback(async () => {
    if (!dataSetFarm?.frmid) return;
    if (navLoadInFlightRef.current) return;
    if (refreshInFlightRef.current) {
      // Retry after delay
      await new Promise(resolve => setTimeout(resolve, 150));
      return loadSectionsIfNeeded();
    }

    const currentPage = String(ui?.selectedInv || 'home');
    const latestRefreshPulse = Number(autoRefreshPulse || 0);
    const currentPagePulse = typeof getPageSyncedPulse === 'function'
      ? Number(getPageSyncedPulse(currentPage))
      : Number(postTryCloseCoverageRef.current?.pagePulses?.[currentPage] ?? -1);
    const shouldForceNavAfterRefreshElsewhere =
      latestRefreshPulse > 0 &&
      currentPagePulse < latestRefreshPulse;
    const required = computeRequiredSections(ui, pageSectionRequirements);
    const tryitSignature = (() => {
      try {
        const payload = typeof getTryitRequestPayload === 'function'
          ? getTryitRequestPayload(dataSetFarmRef?.current || dataSetFarm || {})
          : null;
        return JSON.stringify(payload || {});
      } catch {
        return '';
      }
    })();
    const hasAllSections = required.every((section) => 
      hasSectionData(dataSetFarm, section, sectionPayloadKeys, sectionTablePaths)
    );

    if (hasAllSections && !shouldForceNavAfterRefreshElsewhere) return;

    const missingSections = required.filter((section) => 
      !hasSectionData(dataSetFarm, section, sectionPayloadKeys, sectionTablePaths)
    );

    // Debounce check
    const requestSignature = JSON.stringify({
      farmId: dataSetFarm?.frmid,
      page: currentPage,
      pulse: latestRefreshPulse,
      force: shouldForceNavAfterRefreshElsewhere,
      missing: missingSections,
      tryit: tryitSignature,
    });
    const lastRequest = lastNavLoadSignatureRef.current || {};
    if (lastRequest.signature === requestSignature && Date.now() - Number(lastRequest.at || 0) < 5000) {
      return;
    }
    lastNavLoadSignatureRef.current = { signature: requestSignature, at: Date.now() };

    navLoadInFlightRef.current = true;
    beginHeaderRequest();

    try {
      await getPrices(false, true, null, false, null, shouldForceNavAfterRefreshElsewhere, 'SECTION_LOAD');
      if (shouldForceNavAfterRefreshElsewhere && typeof markPageSyncedPulse === 'function') {
        markPageSyncedPulse(currentPage, latestRefreshPulse);
        postTryCloseCoverageRef.current = {
          ...(postTryCloseCoverageRef.current || {}),
          pagePulses: {
            ...(postTryCloseCoverageRef.current?.pagePulses || {}),
            [currentPage]: latestRefreshPulse,
          },
        };
      }
    } catch (error) {
      console.log(`Error: ${error}`);
    } finally {
      navLoadInFlightRef.current = false;
      endHeaderRequest();
    }
  }, [
    dataSetFarm, dataSetFarmRef, ui, pageSectionRequirements, sectionPayloadKeys, sectionTablePaths,
    refreshInFlightRef, autoRefreshPulse, markPageSyncedPulse, getPageSyncedPulse, getTryitRequestPayload,
    getPrices, beginHeaderRequest, endHeaderRequest
  ]);

  // Auto-load sections when page/farm changes
  useEffect(() => {
    const suppressUntil = Number(suppressNavUntilRef.current || 0);
    const now = Date.now();
    
    if (now < suppressUntil) {
      const retryInMs = Math.max(40, suppressUntil - now + 10);
      const timer = setTimeout(() => {
        loadSectionsIfNeeded();
      }, retryInMs);
      return () => clearTimeout(timer);
    }
    
    loadSectionsIfNeeded();
    return () => {
      // Cleanup
    };
  }, [
    ui?.selectedInv, ui?.activityDisplay, ui?.fishView, ui?.petView,
    autoRefreshPulse, dataSetFarm, dataSetFarm?.frmid, pageSectionRequirements, sectionPayloadKeys, sectionTablePaths,
    loadSectionsIfNeeded
  ]);

  return {
    sectionsLoading,
    headerRequestLoading,
    loadSectionsIfNeeded,
    markPageSynced,
    navLoadInFlightRef,
    refreshInFlightRef,
    suppressNavUntilRef,
    postTryCloseCoverageRef,
  };
}

export default useSectionLoader;
