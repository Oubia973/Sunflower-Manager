/**
 * useExpandHelpers Hook - XP and Expand helpers
 * Extracted from App.js getxpFromToLvl, getFromToExpand
 */

import { useState, useRef, useCallback } from 'react';

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
    const responseLVL = await fetch(API_URL + "/getfromtolvl", {
      method: 'GET',
      headers: { frmid: farmId, from: xfrom, to: xto, xdxp: xdxp }
    });
    if (responseLVL.ok) {
      const responseDataLVL = await responseLVL.json();
      setFromtolvltime(responseDataLVL.time);
      setFromtolvlxp(responseDataLVL.xp);
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
    const monument = dataSetFarm?.boostables?.nft?.["Ascension Monument"];
    const monumentActive = Number(tryChecked ? monument?.tryit : monument?.isactive) === 1;
    const timeMultiplier = monumentActive ? 0.8 : 1;
    const grinxHammer = dataSetFarm?.boostables?.nft?.["Grinx's Hammer"];
    const grinxHammerActive = Number(tryChecked ? grinxHammer?.tryit : grinxHammer?.isactive) === 1;
    const resourceMultiplier = grinxHammerActive ? 0.5 : 1;
    const requestSignature = `${farmId}|${spot}|${xfrom}|${xto}|${xtype}|${xascension}|${timeMultiplier}|${resourceMultiplier}`;
    if (requestSignature === expandRequestSignatureRef.current) {
      return;
    }
    expandRequestSignatureRef.current = requestSignature;

    const reqSeq = ++expandRequestSeqRef.current;
    setExpandLoading(true);
    try {
      const responseExpand = await fetch(API_URL + "/getfromtoexpand", {
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
        }
      });
      if (responseExpand.ok) {
        const responseDataExp = await responseExpand.json();
        if (reqSeq === expandRequestSeqRef.current) {
          dataSet.fromtoexpand = responseDataExp;
        }
      }
    } catch (error) { console.log("getFromToExpand error", error); }
    finally {
      if (reqSeq === expandRequestSeqRef.current) setExpandLoading(false);
    }
  }, [API_URL, dataSet?.options?.farmId, dataSet?.farmId, dataSetFarm?.spot, dataSetFarm?.boostables?.nft, tryChecked]);

  return {
    fromtolvltime,
    fromtolvlxp,
    expandLoading,
    getxpFromToLvl,
    getFromToExpand,
  };
}
