/**
 * useExpandHelpers Hook - XP and Expand helpers
 * Extracted from App.js getxpFromToLvl, getFromToExpand
 */

import { useState, useRef, useCallback } from 'react';
import { fetchJson } from '../services/apiClient.js';
import { selectCurrentProjection } from '../utils/farmState.js';

const EXPAND_TRYSET_BOOSTS = {
  monument: "Ascension Monument",
  hammer: "Grinx's Hammer",
};

function findBoostItem(farmState, tableName, itemName) {
  // Expand/Quick Tryset responses carry current selections even when cached
  // root tables still contain the previous Try revision.
  for (const pageKey of ['expandPageData', 'tryNftData']) {
    const projected = selectCurrentProjection(farmState, pageKey)?.boostables?.[tableName]?.[itemName];
    if (projected && typeof projected === 'object') return projected;
  }
  const direct = farmState?.boostables?.[tableName]?.[itemName];
  if (direct && typeof direct === 'object') return direct;
  return null;
}

export function getExpandTrysetModifiers(farmState, tryChecked = false) {
  const activeField = tryChecked ? 'tryit' : 'isactive';
  const monument = findBoostItem(farmState, 'nft', EXPAND_TRYSET_BOOSTS.monument);
  const hammer = findBoostItem(farmState, 'nft', EXPAND_TRYSET_BOOSTS.hammer);
  return {
    timeMultiplier: Number(monument?.[activeField]) === 1 ? 0.8 : 1,
    resourceMultiplier: Number(hammer?.[activeField]) === 1 ? 0.5 : 1,
  };
}

export function getExpandChapterBoostHeaders(farmState, tryChecked = false) {
  const activeField = tryChecked ? 'tryit' : 'isactive';
  return Object.fromEntries([
    ['duende-monument', 'nft', 'Duende Monument'],
    ['stick-house', 'nft', 'Stick House'],
    ['brick-house', 'nft', 'Brick House'],
    ['hercules-beetle-hat', 'nftw', 'Hercules Beetle Hat'],
  ].map(([header, table, name]) => [header, Number(findBoostItem(farmState, table, name)?.[activeField]) === 1 ? '1' : '0']));
}

/**
 * Hook for XP and Expand helpers
 */
export function useExpandHelpers(API_URL, dataSet, dataSetFarm, tryChecked = false) {
  const [fromtolvltime, setFromtolvltime] = useState(null);
  const [fromtolvlxp, setFromtolvlxp] = useState(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const expandRequestSeqRef = useRef(0);
  const expandRequestSignatureRef = useRef("");

  /**
   * Get XP from level to level
   */
  const getxpFromToLvl = useCallback(async (xfrom, xto, xdxp) => {
    const farmId = dataSet?.options?.farmId || dataSet?.farmId || '';
    try {
      const responseDataLVL = await fetchJson(API_URL, "/getfromtolvl", {
        method: 'GET',
        headers: { frmid: farmId, from: xfrom, to: xto, xdxp: xdxp },
      });
      setFromtolvltime(responseDataLVL.time);
      setFromtolvlxp(responseDataLVL.xp);
    } catch (error) {
      console.log("getxpFromToLvl error", error);
    }
  }, [API_URL, dataSet?.options?.farmId, dataSet?.farmId]);

  /**
   * Get expand data from to level
   */
  const getFromToExpand = useCallback(async (xfrom, xto, xtype, xascension = 0) => {
    const farmId = String(dataSet?.options?.farmId || dataSet?.farmId || "");
    if (!farmId) {
      return;
    }
    const spot = Number(dataSetFarm?.spot || 0);
    const { timeMultiplier, resourceMultiplier } = getExpandTrysetModifiers(
      dataSetFarm,
      tryChecked,
    );
    const chapterBoostHeaders = getExpandChapterBoostHeaders(dataSetFarm, tryChecked);
    const requestSignature = `${farmId}|${spot}|${xfrom}|${xto}|${xtype}|${xascension}|${timeMultiplier}|${resourceMultiplier}|${JSON.stringify(chapterBoostHeaders)}`;
    if (requestSignature === expandRequestSignatureRef.current) {
      return;
    }
    expandRequestSignatureRef.current = requestSignature;

    const reqSeq = ++expandRequestSeqRef.current;
    setExpandLoading(true);
    try {
      const responseDataExp = await fetchJson(API_URL, "/getfromtoexpand", {
        method: 'GET',
        headers: {
          frmid: farmId,
          from: xfrom,
          to: xto,
          type: xtype,
          spot,
          ascension: xascension,
          "time-multiplier": timeMultiplier,
          "resource-multiplier": resourceMultiplier,
          ...chapterBoostHeaders,
        },
      });
      if (reqSeq === expandRequestSeqRef.current) {
        dataSet.fromtoexpand = responseDataExp;
      }
    } catch (error) {
      // Do not permanently deduplicate a failed calculation. A subsequent
      // Quick Tryset/server update must be allowed to request it again.
      if (requestSignature === expandRequestSignatureRef.current) {
        expandRequestSignatureRef.current = "";
      }
      console.log("getFromToExpand error", error);
    }
    finally {
      if (reqSeq === expandRequestSeqRef.current) setExpandLoading(false);
    }
  }, [API_URL, dataSet?.options?.farmId, dataSet?.farmId, dataSetFarm, tryChecked]);

  return {
    fromtolvltime,
    fromtolvlxp,
    expandLoading,
    getxpFromToLvl,
    getFromToExpand,
  };
}
