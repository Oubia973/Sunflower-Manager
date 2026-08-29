/**
 * Farm state management utilities.
 * Handles farm state merging, hash tracking, and trade delta application.
 */

export function buildTryitCoverageSignature(farmState) {
  const payload = (farmState && typeof farmState === "object") ? farmState : {};
  const tryitMode = String(payload?.tryitMode || "");
  const tryitarrays = (payload?.tryitarrays && typeof payload.tryitarrays === "object")
    ? payload.tryitarrays
    : {};
  return JSON.stringify({ tryitMode, tryitarrays });
}

export function hasPathData(payload, path) {
  const src = (payload && typeof payload === "object") ? payload : {};
  const parts = String(path || "").split(".").filter(Boolean);
  if (parts.length < 1) return false;
  let cur = src;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!cur || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, part)) {
      return false;
    }
    cur = cur[part];
  }
  return true;
}

export function collectKnownProjectionHashes(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  return Object.fromEntries(
    Object.entries(src)
      .filter(([key, value]) => (
        key.endsWith("Data")
        && value
        && typeof value === "object"
        && typeof value?._source?.contentHash === "string"
        && value._source.contentHash.length > 0
      ))
      .map(([key, value]) => [key, value._source.contentHash])
  );
}


export function isProjectionCurrent(payload, projection) {
  if (!projection || typeof projection !== "object") return false;
  if (projection?._source?.stale === true) return false;
  const currentRevision = Math.max(0, Math.floor(Number(payload?.tryitRevision) || 0));
  const sourceRevision = Math.max(0, Math.floor(Number(projection?._source?.tryitRevision) || 0));
  // Cached payloads created before revision stamping remain readable until
  // their section is refreshed by the server.
  if (currentRevision < 1 || sourceRevision < 1) return true;
  return currentRevision === sourceRevision;
}

export function selectCurrentProjection(payload, key) {
  const projection = payload?.[key];
  if (!projection || typeof projection !== "object") return null;
  return isProjectionCurrent(payload, projection) ? projection : null;
}

export function hasSectionData(
  payload,
  section,
  sectionPayloadKeys,
  sectionTablePaths
) {
  const keys = Array.isArray(sectionPayloadKeys?.[section]) ? sectionPayloadKeys[section] : [];
  const nonRootKeys = keys.filter((key) => key !== "itables" && key !== "boostables");
  const hasCurrentNonRootKey = (key) => {
    if (!Object.prototype.hasOwnProperty.call(payload || {}, key)) return false;
    return !key.endsWith("Data") || isProjectionCurrent(payload, payload?.[key]);
  };
  const tablePaths = sectionTablePaths?.[section];
  if (Array.isArray(tablePaths) && tablePaths.length > 0) {
    // SECTION_TABLE_PATHS is also used by the backend to compose aggregate
    // sections such as inventory. A sparse page projection (for example
    // craftData or bountyData) can therefore list source table paths without
    // transporting their root table. Only validate paths whose root is part
    // of this section's payload contract, matching the backend serializer.
    const applicableTablePaths = tablePaths.filter((path) => {
      const [rootKey] = String(path || "").split(".");
      return rootKey && keys.includes(rootKey);
    });
    const hasAllPaths = applicableTablePaths.every((path) => hasPathData(payload, path));
    if (!hasAllPaths) return false;
    if (
      (section === "inv" || section === "inventory") &&
      applicableTablePaths.includes("itables.it") &&
      !hasInventoryItemFields(payload)
    ) {
      return false;
    }
    if (nonRootKeys.length < 1) return true;
    return nonRootKeys.some(hasCurrentNonRootKey);
  }
  if (keys.length < 1) return false;
  return keys.some(hasCurrentNonRootKey);
}

export function hasInventoryItemFields(payload) {
  const it = payload?.itables?.it;
  if (!it || typeof it !== "object") return false;
  const preferred = it.Sunflower || it.Potato || Object.values(it).find((item) => item && typeof item === "object");
  if (!preferred || typeof preferred !== "object") return false;
  return (
    Object.prototype.hasOwnProperty.call(preferred, "pcost") &&
    Object.prototype.hasOwnProperty.call(preferred, "dailysfl")
  );
}

export function extractReceivedTableHashes(responsePayload, tableHashes) {
  const payload = (responsePayload && typeof responsePayload === "object") ? responsePayload : {};
  const hashes = (tableHashes && typeof tableHashes === "object") ? tableHashes : {};
  const picked = {};
  ["itables", "boostables"].forEach((rootKey) => {
    const rootObj = payload?.[rootKey];
    if (!rootObj || typeof rootObj !== "object") return;
    Object.keys(rootObj).forEach((subKey) => {
      const path = `${rootKey}.${subKey}`;
      if (Object.prototype.hasOwnProperty.call(hashes, path)) {
        picked[path] = hashes[path];
      }
    });
  });
  return picked;
}

export function mergeKnownHashesFromPayload(responsePayload, farmSectionHashesRef, farmTableHashesRef) {
  const payload = (responsePayload && typeof responsePayload === "object") ? responsePayload : {};
  if (payload?.sectionHashes && typeof payload.sectionHashes === "object") {
    farmSectionHashesRef.current = {
      ...(farmSectionHashesRef.current || {}),
      ...payload.sectionHashes,
    };
  }
  if (payload?.tableHashes && typeof payload.tableHashes === "object") {
    const knownFromPayload = extractReceivedTableHashes(payload, payload.tableHashes);
    farmTableHashesRef.current = {
      ...(farmTableHashesRef.current || {}),
      ...knownFromPayload,
    };
  }
}

export function mergeTradeEntryHashesFromPayload(responsePayload, tradeEntryHashesRef) {
  const payload = (responsePayload && typeof responsePayload === "object") ? responsePayload : {};
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
}

export function applyTradesDeltaToPayload(prevFarmState, responsePayload) {
  const payload = (responsePayload && typeof responsePayload === "object") ? responsePayload : {};
  const delta = payload?.ftradesDelta;
  if (!delta || typeof delta !== "object") {
    if (Object.prototype.hasOwnProperty.call(payload, "ftradesEntryHashes")) {
      const withoutEntryHashes = { ...payload };
      delete withoutEntryHashes.ftradesEntryHashes;
      return withoutEntryHashes;
    }
    return payload;
  }
  const prevTrades = (prevFarmState?.ftrades && typeof prevFarmState.ftrades === "object" && !Array.isArray(prevFarmState.ftrades))
    ? prevFarmState.ftrades
    : null;
  if (!prevTrades) {
    const withoutDelta = { ...payload };
    delete withoutDelta.ftradesDelta;
    delete withoutDelta.ftradesEntryHashes;
    return withoutDelta;
  }
  const nextTrades = { ...prevTrades };
  (Array.isArray(delta.deletes) ? delta.deletes : []).forEach((tradeId) => {
    delete nextTrades[tradeId];
  });
  const upserts = (delta.upserts && typeof delta.upserts === "object") ? delta.upserts : {};
  Object.keys(upserts).forEach((tradeId) => {
    nextTrades[tradeId] = upserts[tradeId];
  });
  const withoutDelta = { ...payload };
  delete withoutDelta.ftradesDelta;
  delete withoutDelta.ftradesEntryHashes;
  return {
    ...withoutDelta,
    ftrades: nextTrades,
  };
}

/**
 * Check if hash flow debugging is enabled.
 */
export function shouldDebugHashFlow() {
  try {
    if (typeof window !== "undefined" && window.__SFL_DEBUG_HASH_FLOW === true) return true;
    return localStorage.getItem("SFL_DEBUG_HASH_FLOW") === "1";
  } catch {
    return false;
  }
}

/**
 * Sample keys from a hash object.
 */
export function sampleHashKeys(hashObj, limit = 5) {
  const keys = Object.keys((hashObj && typeof hashObj === "object") ? hashObj : {});
  return keys.slice(0, Math.max(1, Number(limit) || 5)).join(",");
}
