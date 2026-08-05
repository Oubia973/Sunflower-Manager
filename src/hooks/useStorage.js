/**
 * useStorage Hook - Cookie/Storage functions
 * Extracted from App.js setCookie, DefaultOptions, loadCookie
 */

import { useState, useCallback } from 'react';
import { uiDefaults, normalizeUI } from '../state/uiDefaults.js';
import { vversion } from '../constants/api.js';
import { stripFarmMetadata } from '../fct';
import { normalizeServerImagesDeep, versionImageUrl } from '../constants/images.js';
import {
  applyTryitSnapshotToFarmState,
  hasTryitPayloadContent,
  isValidTryitConfig,
  purgeLegacyTryitSnapshots,
  readTryitSnapshot,
  stripTryitFieldsFromFarmState,
} from '../tryitStorage.js';

/**
 * Hook for storage/cookie management
 */
export function useStorage(dataSet, dataSetFarm, dataSetFarmRef, setdataSetFarm, setOptions, setUI, tryitConfig = null) {
  const [lastID, setLastIDState] = useState("");

  const setLastID = useCallback((value) => {
    setLastIDState(value);
  }, []);

  const getLastID = useCallback(() => {
    return lastID;
  }, [lastID]);

  /**
   * Set cookie/localStorage
   */
  const setCookie = useCallback((xdataSetFarm = dataSetFarmRef.current, xdataSetValue = dataSet, xlastID = lastID) => {
    try {
      const bvversion = vversion;
      const rawFarmState = xdataSetFarm || {};
      const cleanFarmState = stripFarmMetadata(rawFarmState, 'useStorage/setCookie');
      const storedFarmState = isValidTryitConfig(tryitConfig)
        ? stripTryitFieldsFromFarmState(cleanFarmState, tryitConfig)
        : JSON.parse(JSON.stringify(cleanFarmState));
      var dataToStore = {
        dataSetFarm: storedFarmState,
        dataSet: xdataSetValue,
        vversion: bvversion,
        lastID: xlastID,
      };
      localStorage.setItem("SFLManData", JSON.stringify(dataToStore));
    } catch {
      localStorage.removeItem("SFLManData");
      console.log("Error, cleared local data");
    }
  }, [dataSet, dataSetFarmRef, lastID, tryitConfig]);

  /**
   * Set default options
   */
  const defaultOptions = useCallback(() => {
    if (!dataSet.options?.inputFarmTime) { dataSet.options.inputFarmTime = 15 }
    if (!dataSet.options?.inputMaxBB) { dataSet.options.inputMaxBB = 1 }
    if (!dataSet.options?.inputKeep) { dataSet.options.inputKeep = 3 }
    if (dataSet.options?.autoTradeTax === undefined) { dataSet.options.autoTradeTax = 1 }
    if (dataSet.options?.autoRefresh === undefined) { dataSet.options.autoRefresh = true }
    if (!dataSet.options?.gemsRatio) { dataSet.options.gemsRatio = 0.07 }
    if (!dataSet.options?.gemsPack) { dataSet.options.gemsPack = 7400 }
    if (!dataSet.options?.coinsRatio) { dataSet.options.coinsRatio = 1000 }
    if (!dataSet.options?.inputMaxBB) { dataSet.options.inputMaxBB = 1 }
    if (!dataSet.options?.animalLvl) { dataSet.options.animalLvl = {} }
    if (!dataSet.options?.animalLvl?.Chicken) { dataSet.options.animalLvl.Chicken = 7 }
    if (!dataSet.options?.animalLvl?.Cow) { dataSet.options.animalLvl.Cow = 7 }
    if (!dataSet.options?.animalLvl?.Sheep) { dataSet.options.animalLvl.Sheep = 7 }
    if (!dataSet.options?.auctionNotifSelection || typeof dataSet.options.auctionNotifSelection !== "object") { dataSet.options.auctionNotifSelection = {} }
    if (!dataSet.options?.usePriceFood) { dataSet.options.usePriceFood = 1 }
    if (!dataSet.options?.oilFood) { dataSet.options.oilFood = 0 }
    if (dataSet.options?.chumFishCost === undefined) { dataSet.options.chumFishCost = 0 }
    if (dataSet.options?.turtleAllocationMode === undefined) { dataSet.options.turtleAllocationMode = 0 }
    setOptions(dataSet.options);
  }, [dataSet, setOptions]);

  /**
   * Load cookie from localStorage
   */
  const loadCookie = useCallback(() => {
    try {
      purgeLegacyTryitSnapshots();
      const cookieValue = localStorage.getItem("SFLManData");
      if (!cookieValue) {
        dataSet.options.firstLoad = true;
      }
      if (cookieValue) {
        var loadedData = JSON.parse(cookieValue);
        let validCookie = true;
        if ((loadedData.vversion !== vversion) || !validCookie) {
          defaultOptions();
          localStorage.removeItem("SFLManData");
          console.log("Cleared local data to fit newer version");
          return;
        }
        vversion; // update version
        const rawLoadedFarm = loadedData.dataSetFarm || {};
        const cleanLoadedFarm = normalizeServerImagesDeep(stripFarmMetadata(rawLoadedFarm, 'useStorage/loadCookie'));
        if (cleanLoadedFarm?.constants?.imgtkt) {
          cleanLoadedFarm.constants.imgtkt = versionImageUrl(cleanLoadedFarm.constants.imgtkt);
        }
        const canHydrateTryit = isValidTryitConfig(tryitConfig);
        const storedSnapshot = canHydrateTryit
          ? readTryitSnapshot(cleanLoadedFarm?.frmid || loadedData?.lastID || "")
          : null;
        const hydratedLoadedFarm = canHydrateTryit && hasTryitPayloadContent(storedSnapshot)
          ? applyTryitSnapshotToFarmState(cleanLoadedFarm, storedSnapshot, tryitConfig)
          : cleanLoadedFarm;
        dataSetFarmRef.current = hydratedLoadedFarm;
        setdataSetFarm(hydratedLoadedFarm);
        if (hydratedLoadedFarm?.frmid) {
          dataSet.options.firstLoad = false;
        }
        Object.assign(dataSet, normalizeServerImagesDeep(loadedData.dataSet || {}));
        if (dataSet?.imgtkt) {
          dataSet.imgtkt = versionImageUrl(dataSet.imgtkt);
        }
        dataSet.updated = 0;
        setLastID(loadedData.lastID || 0);
        defaultOptions();
        try {
          const storedUI = JSON.parse(localStorage.getItem("ui"));
          setUI({ ...uiDefaults, ...normalizeUI(storedUI) });
        } catch {
          setUI(uiDefaults);
        }
      } else {
        defaultOptions();
      }
    } catch (error) {
      localStorage.removeItem("SFLManData");
      console.log("Load Error, cleared local data");
      console.log(error);
    }
  }, [dataSet, dataSetFarmRef, setdataSetFarm, defaultOptions, setUI, setLastID, tryitConfig]);

  return { setCookie, defaultOptions, loadCookie, lastID, setLastID, getLastID };
}
