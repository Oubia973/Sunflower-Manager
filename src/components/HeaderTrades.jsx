import React, { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateDeviceId } from "../fct.js";
import { imgna, imgexchng, imgconfirm } from "../constants/images.js";
import { fetchJson } from "../services/apiClient.js";
import { buildTradesTooltipContract } from "../tooltip/tradesTooltipContract.js";

export default function HeaderTrades({
  API_URL,
  farmId,
  options,
  currentPage,
  dataSetFarm,
  onTooltip,
  onTradesUpdate,
}) {
  const [ftradesData, setftradesData] = useState(null);
  const stableFarmId = String(farmId || "");
  const deviceIdRef = useRef(getOrCreateDeviceId());
  const lastFarmIdRef = useRef(stableFarmId);
  const tradesSectionHashRef = useRef("");
  const optionsRef = useRef(options || {});
  const farmDataRef = useRef(dataSetFarm || {});
  const onTradesUpdateRef = useRef(onTradesUpdate);
  const currentTradesRef = useRef(null);
  const currentTradesHeaderRef = useRef(null);
  const tradeEntryHashesRef = useRef({});

  const applyTradesDelta = useCallback((payload) => {
    const delta = payload?.ftradesDelta;
    if (!delta || typeof delta !== "object") return payload;
    const nextTrades = { ...(currentTradesRef.current || {}) };
    (Array.isArray(delta.deletes) ? delta.deletes : []).forEach((tradeId) => {
      delete nextTrades[tradeId];
    });
    const upserts = (delta.upserts && typeof delta.upserts === "object") ? delta.upserts : {};
    Object.keys(upserts).forEach((tradeId) => {
      nextTrades[tradeId] = upserts[tradeId];
    });
    const withoutDelta = { ...payload };
    delete withoutDelta.ftradesDelta;
    return {
      ...withoutDelta,
      ftrades: nextTrades,
    };
  }, []);

  const mergeTradeEntryHashes = useCallback((payload) => {
    if (payload?.ftradesEntryHashes && typeof payload.ftradesEntryHashes === "object" && !Array.isArray(payload.ftradesEntryHashes)) {
      tradeEntryHashesRef.current = { ...payload.ftradesEntryHashes };
      return;
    }
    const delta = payload?.ftradesDelta;
    if (!delta || typeof delta !== "object") return;
    const next = { ...(tradeEntryHashesRef.current || {}) };
    (Array.isArray(delta.deletes) ? delta.deletes : []).forEach((tradeId) => {
      delete next[tradeId];
    });
    const upsertHashes = (delta.upsertHashes && typeof delta.upsertHashes === "object") ? delta.upsertHashes : {};
    Object.keys(upsertHashes).forEach((tradeId) => {
      next[tradeId] = upsertHashes[tradeId];
    });
    tradeEntryHashesRef.current = next;
  }, []);

  useEffect(() => {
    optionsRef.current = options || {};
  }, [options]);
  useEffect(() => {
    farmDataRef.current = dataSetFarm || {};
  }, [dataSetFarm]);
  useEffect(() => {
    onTradesUpdateRef.current = onTradesUpdate;
  }, [onTradesUpdate]);

  const buildEntriesFromTrades = useCallback((ftrades) => {
    if (!ftrades) return [];
    const entries = Object.values(ftrades).sort(
      (a, b) => Number(Boolean(b?.fulfilledAt)) - Number(Boolean(a?.fulfilledAt))
    );
    return entries.map((entry) => {
      const name = Object.keys(entry?.items || {})[0];
      if (!name) return null;
      return {
        name,
        img: imgna,
        fulfilledAt: entry?.fulfilledAt,
      };
    }).filter(Boolean);
  }, []);

  const renderTrades = useCallback((ftrades, ftradesHeader) => {
    const incomingHeaderEntries = Array.isArray(ftradesHeader)
      ? ftradesHeader.filter((entry) => entry?.name)
      : [];
    const hasIncomingTrades = !!(ftrades && typeof ftrades === "object" && !Array.isArray(ftrades));
    const hasIncomingHeader = incomingHeaderEntries.length > 0;
    if (hasIncomingTrades) {
      currentTradesRef.current = ftrades;
    }
    if (Array.isArray(ftradesHeader)) {
      currentTradesHeaderRef.current = incomingHeaderEntries;
    }
    const headerEntries = hasIncomingHeader ? incomingHeaderEntries : [];
    const cachedHeaderEntries = Array.isArray(currentTradesHeaderRef.current)
      ? currentTradesHeaderRef.current.filter((entry) => entry?.name)
      : [];
    const sourceTrades = hasIncomingTrades ? ftrades : currentTradesRef.current;
    const entries = headerEntries.length > 0
      ? headerEntries
      : (cachedHeaderEntries.length > 0 ? cachedHeaderEntries : buildEntriesFromTrades(sourceTrades));
    if (!entries.length) {
      if (hasIncomingTrades || Array.isArray(ftradesHeader)) {
        setftradesData(null);
      }
      return;
    }
    setftradesData(
      <div className="table-container">
        <table className="tabletradesTable">
          <tbody>
            <tr>
              <td>
                <img src={imgexchng} alt="" className="itico" title="Listings" />
              </td>
              {entries.map((entry, index) => (
                <td key={`${entry.name}-${index}`} style={{ textAlign: "center", position: "relative" }}>
                  <img
                    src={entry?.img || imgna}
                    alt=""
                    className="itico"
                    title={entry?.name || ""}
                  />
                  {entry?.fulfilledAt ? (
                    <img
                      src={imgconfirm}
                      alt=""
                      title="Sold"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "15px",
                        height: "15px",
                        zIndex: 1,
                        opacity: 0.6,
                      }}
                    />
                  ) : null}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }, [buildEntriesFromTrades]);

  const getTrades = useCallback(async () => {
    if (!stableFarmId) return;
    try {
      const responseData = await fetchJson(API_URL, "/getdatacrypto", {
        method: "POST",
        body: {
          frmid: stableFarmId,
          deviceId: deviceIdRef.current,
          options: optionsRef.current,
          include: ["trades"],
          page: String(currentPage || "home"),
          mode: "nav",
          knownHashes: tradesSectionHashRef.current ? { trades: tradesSectionHashRef.current } : {},
          ...(currentTradesRef.current && Object.keys(tradeEntryHashesRef.current || {}).length > 0
            ? { knownTradeHashes: tradeEntryHashesRef.current || {} }
            : {}),
        },
        timeoutMs: 30_000,
      });
      const rawRespData = responseData?.allData || {};
      const respData = applyTradesDelta(rawRespData);
      if (rawRespData?.sectionHashes?.trades) {
        tradesSectionHashRef.current = rawRespData.sectionHashes.trades;
      }
      const hasTrades = Object.prototype.hasOwnProperty.call(respData || {}, "ftrades");
      const hasHeader = Object.prototype.hasOwnProperty.call(respData || {}, "ftradesHeader");
      if (!hasTrades && !hasHeader) return;
      mergeTradeEntryHashes(rawRespData);
      if (onTradesUpdateRef.current) {
        onTradesUpdateRef.current({
          ...(hasTrades ? { ftrades: respData.ftrades } : {}),
          ...(hasHeader ? { ftradesHeader: respData.ftradesHeader } : {}),
          ...(rawRespData?.ftradesEntryHashes ? { ftradesEntryHashes: rawRespData.ftradesEntryHashes } : {}),
          ...(rawRespData?.ftradesDelta ? { ftradesDelta: rawRespData.ftradesDelta } : {}),
        });
      }
      renderTrades(respData?.ftrades, respData?.ftradesHeader);
    } catch (error) {
      console.log("getTrades error", error);
    }
  }, [API_URL, stableFarmId, currentPage, renderTrades, applyTradesDelta, mergeTradeEntryHashes]);

  useEffect(() => {
    if (lastFarmIdRef.current === stableFarmId) return;
    lastFarmIdRef.current = stableFarmId;
    tradesSectionHashRef.current = "";
    currentTradesRef.current = null;
    currentTradesHeaderRef.current = null;
    tradeEntryHashesRef.current = {};
    setftradesData(null);
  }, [stableFarmId]);

  useEffect(() => {
    const hasTrades = !!(dataSetFarm?.ftrades && typeof dataSetFarm.ftrades === "object" && !Array.isArray(dataSetFarm.ftrades));
    const hasHeader = Array.isArray(dataSetFarm?.ftradesHeader);
    if (hasTrades || hasHeader) {
      renderTrades(dataSetFarm?.ftrades, dataSetFarm?.ftradesHeader);
    }
  }, [dataSetFarm?.ftrades, dataSetFarm?.ftradesHeader, renderTrades]);

  useEffect(() => {
    if (!stableFarmId) return;
    const hasSeedTrades = Object.prototype.hasOwnProperty.call(farmDataRef.current || {}, "ftrades")
      || Object.prototype.hasOwnProperty.call(farmDataRef.current || {}, "ftradesHeader");
    if (hasSeedTrades) return;
    if (document.visibilityState !== "visible") return;
    getTrades().catch((error) => {
      console.log("Trades preload error", error);
    });
  }, [stableFarmId, getTrades]);

  return (
    <div
      className="tabletrades"
      onClick={(e) => onTooltip?.(e, buildTradesTooltipContract(
        currentTradesRef.current,
        currentTradesHeaderRef.current,
      ))}
      style={{ margin: "0", padding: "0" }}
    >
      {ftradesData ? ftradesData : ""}
    </div>
  );
}
