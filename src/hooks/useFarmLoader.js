/**
 * useFarmLoader Hook - Farm data loading and management
 * Extracted from App.js handleButtonClick, getPrices initial load
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  formatUpdated,
  frmtNb,
  stripFarmMetadata,
} from '../fct.js';
import {
  resolveTryitSnapshot,
  isValidTryitConfig,
} from '../tryitStorage.js';
import {
  extractReceivedTableHashes,
  mergeTradeEntryHashesFromPayload,
  hasInventoryItemFields,
  selectCurrentProjection,
} from '../utils/farmState.js';
import { getBalanceValue } from '../utils/balance.js';
import { fetchJson, fetchJsonResponse } from '../services/apiClient.js';
import { LOAD_FARM_SPAM_WINDOW_MS, LOAD_FARM_SPAM_THRESHOLD } from '../constants/api.js';
import { imgsuspicious, versionImageUrl } from '../constants/images.js';
import { normalizeFarmResponseImages, prepareLoadedFarmResponse } from '../utils/farmResponse/prepareFarmResponse.js';
import { mergeFarmResponse } from '../utils/farmResponse/mergeFarmResponse.js';
import { getDailyCoinFlow } from '../utils/coinActivity.js';

function normalizeFarmLoadErrorMessage(message, response, endpointLabel = "") {
  const rawMessage = String(message || "").trim();
  const lowerMessage = rawMessage.toLowerCase();
  const endpoint = String(endpointLabel || "").toLowerCase();
  const isGetFarmRequest = endpoint.includes("getfarm");

  if (
    isGetFarmRequest &&
    (
      lowerMessage.includes("no farmdata found for") ||
      lowerMessage.includes("no farm for this username") ||
      response?.status === 404
    )
  ) {
    return "ID not found";
  }

  return rawMessage;
}

/**
 * Hook for farm data loading
 */
export function useFarmLoader(
  API_URL,
  curIDRef,
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
  setBumpkinData,
  farmIdentityIntentRef
) {
  const [bumpkinLoading, setBumpkinLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadGenerationRef = useRef(0);
  const getTryitPayloadRef = useRef(getTryitRequestPayload);
  getTryitPayloadRef.current = getTryitRequestPayload;
  useEffect(() => () => { loadGenerationRef.current += 1; }, []);

  /**
   * Register a load farm spam attempt
   */
  const registerLoadFarmSpamAttempt = useCallback(() => {
    const nowTs = Date.now();
    const recent = (loadFarmSpamClickTimesRef.current || []).filter((ts) => (nowTs - ts) <= LOAD_FARM_SPAM_WINDOW_MS);
    recent.push(nowTs);
    loadFarmSpamClickTimesRef.current = recent;
    
    if (recent.length < LOAD_FARM_SPAM_THRESHOLD) return;
    loadFarmSpamClickTimesRef.current = [];
    
    promptInfo(
      'No need to spam this button. The server can take up to 20 seconds to provide up-to-date farm data. You have a 20-second auto-refresh on page load, so just wait for the data to update.',
      'Please wait',
      'Got it',
      { closeOnBackdrop: false }
    );
  }, [promptInfo, loadFarmSpamClickTimesRef]);

  /**
   * Fetch bumpkin image
   */
  const fetchBumpkinImage = useCallback(async (curID, bumpkin, dataSet, uiState = null, forceRefresh = false) => {
    if (!bumpkin?.tkuri) return { success: false, skipped: true, reason: 'missing_bumpkin' };

    const currentFarmId = String(curID ?? '').trim();
    const currentPage = String(uiState?.selectedInv || 'home');
    const cachedFarmId = String(dataSet?.bumpkinImgFarmId || '').trim();
    const hasCurrentCachedImage = !!dataSet?.bumpkinImg && cachedFarmId === currentFarmId;

    if (!forceRefresh && currentPage !== 'home') {
      return { success: false, skipped: true, reason: 'not_home' };
    }
    if (!forceRefresh && hasCurrentCachedImage) {
      return { success: true, skipped: true, reason: 'cached' };
    }

    try {
      setBumpkinLoading(true);

      if (!forceRefresh) {
        try {
          const storedDataRaw = localStorage.getItem('SFLManData');
          if (storedDataRaw) {
            const storedData = JSON.parse(storedDataRaw);
            const storedFarmId = String(storedData?.dataSet?.options?.farmId ?? storedData?.lastID ?? '').trim();
            const cachedBumpkinImg = storedData?.dataSet?.bumpkinImg;
            if (cachedBumpkinImg && storedFarmId === currentFarmId) {
              dataSet.bumpkinImg = cachedBumpkinImg;
              dataSet.bumpkinImgFarmId = currentFarmId;
              return { success: true, skipped: true, reason: 'local_cache' };
            }
          }
        } catch {
          // Ignore stale/corrupt cache and fall through to the network fetch.
        }
      }

      const data = await fetchJson(API_URL, '/getbumpkin', {
        method: 'GET',
        headers: {
          frmid: currentFarmId,
          username: dataSet?.options?.username || '',
          tknuri: bumpkin.tkuri,
        },
      });
      dataSet.bumpkinImg = data.responseImage;
      dataSet.bumpkinImgFarmId = currentFarmId;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setBumpkinLoading(false);
    }
  }, [API_URL]);

  /**
   * Process farm response and update state
   */
  const processFarmResponse = useCallback((responseData, currentFarmState, dataSet, uiState = null) => {
    const normalizedResponseData = normalizeFarmResponseImages(responseData);
    const responseFrmData = normalizedResponseData?.farmMeta
      || normalizedResponseData?.frmData
      || currentFarmState?.farmMeta
      || currentFarmState?.frmData
      || {};
    const constants = normalizedResponseData?.constants || {};
    if (constants?.imgtkt) {
      constants.imgtkt = versionImageUrl(constants.imgtkt);
    }

    // Update price data
    if (Array.isArray(normalizedResponseData?.priceData) && normalizedResponseData.priceData.length > 0) {
      dataSet.options.usdSfl = normalizedResponseData.priceData[2];
    }

    dataSet.options.username = normalizedResponseData.username;
    dataSet.options.farmId = normalizedResponseData.frmid;
    getDailyCoinFlow(responseFrmData?.coinActivity, normalizedResponseData.frmid);
    dataSet.isBanned = responseFrmData.isbanned
      ? (
        <div style={{ color: 'red', margin: 0, padding: 0 }}>
          <img src={imgsuspicious} alt="" />
          <span>BANNED {responseFrmData.isbannedstatus}</span>
        </div>
      )
      : '';
    dataSet.options.isAbo = normalizedResponseData.isabo;
    dataSet.aboLifetime = normalizedResponseData.aboLifetime === true;
    dataSet.isVip = responseFrmData.vip;
    dataSet.dateVip = responseFrmData.datevip;
    dataSet.aboExpiresAt = normalizedResponseData.aboExpiresAt || 0;
    dataSet.dailychest = responseFrmData.dailychest;
    dataSet.taxFreeSFL = frmtNb(responseFrmData.taxFreeSFL);
    dataSet.bumpkin = normalizedResponseData.Bumpkin?.[0];
    dataSet.tktName = constants.tktName;
    dataSet.imgtkt = constants.imgtkt ? versionImageUrl(constants.imgtkt) : dataSet.imgtkt;

    if (!dataSet?.options?.tradeTax || dataSet?.options?.autoTradeTax) {
      dataSet.options.tradeTax = responseFrmData.tradeTax;
    }
    if (dataSet?.options?.autoCoinRatio) {
      dataSet.options.coinsRatio = responseData.bestCoinRatio?.ratio || dataSet.options.coinsRatio || 1000;
    }

    // Process farm payload
    const initialFarmPayload = prepareLoadedFarmResponse(currentFarmState, normalizedResponseData);
    const tryitSnapshot = resolveTryitSnapshot({
      farmState: currentFarmState,
      tryitConfig,
      responseSnapshot: null,
      farmId: String(responseData?.frmid || currentFarmState?.frmid || '').trim(),
    });

    // Update hashes
    if (initialFarmPayload?.sectionHashes) {
      farmSectionHashesRef.current = {
        ...(farmSectionHashesRef.current || {}),
        ...initialFarmPayload.sectionHashes,
      };
    }
    if (initialFarmPayload?.tableHashes) {
      const knownFromPayload = extractReceivedTableHashes(initialFarmPayload, initialFarmPayload.tableHashes);
      farmTableHashesRef.current = {
        ...(farmTableHashesRef.current || {}),
        ...knownFromPayload,
      };
    }
    mergeTradeEntryHashesFromPayload(normalizedResponseData, tradeEntryHashesRef);

    const mergedInitialFarm = mergeFarmResponse(currentFarmState, initialFarmPayload, tryitConfig, tryitSnapshot);
    const hasMutantsPayload = Object.prototype.hasOwnProperty.call(initialFarmPayload, 'mutantsHeader')
      || Object.prototype.hasOwnProperty.call(initialFarmPayload, 'mutantchickens');
    const mutantsData = hasMutantsPayload
      ? {
        ...mergedInitialFarm,
        mutantsHeader: Object.prototype.hasOwnProperty.call(initialFarmPayload, 'mutantsHeader')
          ? initialFarmPayload.mutantsHeader
          : [],
        mutantchickens: Object.prototype.hasOwnProperty.call(initialFarmPayload, 'mutantchickens')
          ? initialFarmPayload.mutantchickens
          : [],
      }
      : mergedInitialFarm;

    // Calculate financials
    const frmData = mergedInitialFarm?.farmMeta || mergedInitialFarm?.frmData || {};
    const Fish = mergedInitialFarm?.Fish;
    dataSet.balance = getBalanceValue(frmData?.balance, 'sfl');
    dataSet.coins = getBalanceValue(frmData?.balance, 'coins');

    const tryChecked = !!uiState?.TryChecked;
    const xfishcastmax = Fish && (tryChecked ? Fish.CastMaxtry : Fish.CastMax);
    const xfishcost = Fish && ((tryChecked ? Fish.CastCosttry : Fish.CastCost) / dataSet.options.coinsRatio);
    dataSet.fishcasts = Fish && (Fish.casts + '/' + xfishcastmax);
    dataSet.fishcosts = Fish && (parseFloat(Fish.casts * xfishcost).toFixed(3) + '/' + parseFloat(xfishcastmax * xfishcost).toFixed(3));

    dataSet.updated = formatUpdated(frmData?.updated);

    return {
      mergedFarm: mergedInitialFarm,
      expandData: selectCurrentProjection(mergedInitialFarm, "expandPageData")?.frmData?.expandData,
      frmData: frmData,
      Fish: Fish,
      hasMutants: !!(mergedInitialFarm.mutantsHeader || mergedInitialFarm.mutantchickens),
      mutantsData,
      orderstable: mergedInitialFarm.orderstable,
    };
    }, [farmSectionHashesRef, farmTableHashesRef, tradeEntryHashesRef, tryitConfig]);

  /**
   * Load a farm by ID
   */
  const loadFarm = useCallback(async (inputValue, includeSections = null, context = 'manualLoad', uiState = null, dataSetState = null, deviceId = '') => {
    const normalizedInputId = String(inputValue ?? '').trim();
    if (!normalizedInputId) return { success: false, error: 'No farm ID' };

    const loadGeneration = ++loadGenerationRef.current;
    let isCurrent = () => loadGenerationRef.current === loadGeneration;
    setLoading(true);
    setError('');

    let identityMarker = null;
    try {
      if (!isValidTryitConfig(tryitConfig)) {
        const message = 'Tryset config missing. Local selections are preserved; farm loading is paused until backend config reloads.';
        setError(message);
        setLoading(false);
        return { success: false, error: message };
      }
      const previousFarmState = dataSetFarmRef.current || {};
      const targetDataSet = dataSetState || dataSet;
      const optionsSignature = JSON.stringify(targetDataSet?.options || {});
      const requestOptions = JSON.parse(optionsSignature);
      const currentFarmId = String(previousFarmState?.frmid || targetDataSet?.options?.farmId || '').trim();
      const currentUsername = String(targetDataSet?.options?.username || previousFarmState?.username || '').trim().toLowerCase();
      const sameFarm = normalizedInputId === currentFarmId
        || (currentUsername && normalizedInputId.toLowerCase() === currentUsername);
      const isNewFarm = !sameFarm;
      if (isNewFarm && currentFarmId && farmIdentityIntentRef) {
        identityMarker = {
          revision: (farmIdentityIntentRef.current?.revision || 0) + 1,
          pending: true,
          sourceFarmId: currentFarmId,
        };
        farmIdentityIntentRef.current = identityMarker;
      } else if (sameFarm && farmIdentityIntentRef?.current?.pending) {
        // A later load of the published farm cancels an unresolved switch away.
        farmIdentityIntentRef.current = {
          revision: farmIdentityIntentRef.current.revision + 1,
          pending: false,
        };
      }
      const currentFarmState = isNewFarm ? {} : previousFarmState;
      curIDRef.current = inputValue;

      // Clear hashes for new farm
      if (isNewFarm) {
        farmSectionHashesRef.current = {};
        farmTableHashesRef.current = {};
        tradeEntryHashesRef.current = {};
      }

      // Compute includeSections if not provided
      const sectionsToInclude = includeSections || ['trades'];
      const requestedSections = new Set(
        (sectionsToInclude || []).map((section) => String(section || '').toLowerCase())
      );
      const knownTableHashesForRequest = { ...(farmTableHashesRef.current || {}) };
      if (
        (requestedSections.has('inv') || requestedSections.has('inventory')) &&
        !hasInventoryItemFields(currentFarmState)
      ) {
        delete knownTableHashesForRequest['itables.it'];
        if (farmTableHashesRef.current) {
          delete farmTableHashesRef.current['itables.it'];
        }
      }

      const requestTryit = JSON.stringify(getTryitPayloadRef.current(currentFarmState));
      const { tryitarrays: tryItArrays, tryitMode } = JSON.parse(requestTryit);
      isCurrent = () => loadGenerationRef.current === loadGeneration
        && dataSetFarmRef.current === previousFarmState
        && JSON.stringify(targetDataSet?.options || {}) === optionsSignature
        && JSON.stringify(getTryitPayloadRef.current(currentFarmState)) === requestTryit;
      const ignored = () => {
        if (loadGenerationRef.current === loadGeneration) setError('');
        return { success: false, stale: true, error: '' };
      };

      const farmRequestBody = {
        frmid: normalizedInputId,
        deviceId: deviceId || '',
        options: requestOptions,
        tryitarrays: tryItArrays,
        tryitMode,
        include: [...sectionsToInclude],
        knownTableHashes: knownTableHashesForRequest,
        page: String(uiState?.selectedInv || 'home'),
        context,
      };
      const requestFarm = () => fetchJsonResponse(API_URL, '/getfarm', {
        method: 'POST',
        body: farmRequestBody,
        timeoutMs: 30_000,
      });
      const initialResult = await requestFarm();
      const response = initialResult.response;
      if (!isCurrent()) return ignored();

      const handleSuccessResponse = async (responseData) => {
        if (!isCurrent()) return ignored();
        const responseId = String(responseData?.frmid ?? '').trim();
        if (/^\d+$/.test(normalizedInputId) && responseId
          && responseId.replace(/^0+(?=\d)/, '') !== normalizedInputId.replace(/^0+(?=\d)/, '')) {
          const message = 'Farm ID mismatch';
          setError(message);
          return { success: false, error: message };
        }
        const result = processFarmResponse(responseData, currentFarmState, targetDataSet, uiState || ui);
        
        const cleanFarmData = stripFarmMetadata(result.mergedFarm || {}, 'useFarmLoader');
        setFarmData(result.mergedFarm?.farmMeta || result.mergedFarm?.frmData || {});
        setdataSetFarm(cleanFarmData);
        setBumpkinData(result.mergedFarm?.Bumpkin || []);
        dataSetFarmRef.current = cleanFarmData;

        if (responseData?.account?.legacyPaidNeedsAccount === true) {
          window.dispatchEvent(new CustomEvent("sflman-account-dialog", {
            detail: { mode: "register", farmId: String(responseData?.frmid || normalizedInputId) },
          }));
        }

        return {
          success: true,
          mergedFarm: result.mergedFarm,
          farmData: result.mergedFarm,
          expandData: result.expandData,
          frmData: result.frmData,
          Fish: result.Fish,
          hasMutants: result.hasMutants,
          mutantsData: result.mutantsData,
          orderstable: result.orderstable,
        };
      };

      // Handle retry for 202
      if (response.status === 202) {
        const retryAfterHeader = Number(response.headers.get('x-retry-after-ms') || 0);
        const retryAfterMs = retryAfterHeader > 0 ? retryAfterHeader : 5000;
        setError('Farm data is coming. Please wait...');
        
        let retryCount = 0;
        while (retryCount < 5) {
          await new Promise(resolve => setTimeout(resolve, retryAfterMs));
          if (!isCurrent()) return ignored();
          const retryResult = await requestFarm();
          if (!isCurrent()) return ignored();
          if (retryResult.response.status === 200) {
            return await handleSuccessResponse(retryResult.data);
          }
          retryCount++;
        }
        const finalError = 'ID not found';
        setError(finalError);
        return { success: false, error: finalError };
      }

      if (response.status !== 200) {
        const displayError = normalizeFarmLoadErrorMessage(`Unexpected HTTP ${response.status}`, response, '/getfarm');
        setError(displayError);
        return { success: false, error: displayError };
      }

      return await handleSuccessResponse(initialResult.data);
    } catch (error) {
      if (error?.code === "FARM_LOGIN_REQUIRED") {
        window.dispatchEvent(new CustomEvent("sflman-account-dialog", {
          detail: { mode: "login", farmId: String(error?.payload?.farmId || normalizedInputId) },
        }));
      }
      if (!isCurrent()) {
        if (loadGenerationRef.current === loadGeneration) setError('');
        return { success: false, stale: true, error: '' };
      }
      const displayError = normalizeFarmLoadErrorMessage(error?.message, error, '/getfarm');
      setError(displayError);
      return { success: false, error: displayError };
    } finally {
      if (identityMarker && farmIdentityIntentRef?.current === identityMarker) {
        farmIdentityIntentRef.current = { ...identityMarker, pending: false };
      }
    }
    // NOTE: loadFarmRequestInFlightRef is managed by the caller (App.js handleButtonClick)
  }, [
    API_URL, curIDRef, dataSetFarmRef, farmSectionHashesRef, farmTableHashesRef, tradeEntryHashesRef,
    loadFarmRequestInFlightRef, loadFarmSpamClickTimesRef,
    processFarmResponse, fetchBumpkinImage, registerLoadFarmSpamAttempt, tryitConfig,
    farmIdentityIntentRef
  ]);

  return {
    bumpkinLoading,
    loading,
    error,
    loadFarm,
    setBumpkinLoading,
    setError,
  };
}

export default useFarmLoader;
