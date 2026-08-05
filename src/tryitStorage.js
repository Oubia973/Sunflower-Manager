const TRYIT_STORAGE_KEY = "SFLManTryit";
const TRYIT_STORAGE_VERSION = 4;

export function isValidTryitConfig(tryitConfig) {
  return !!(
    tryitConfig &&
    Array.isArray(tryitConfig?.boostTables) &&
    tryitConfig.boostTables.length > 0 &&
    tryitConfig?.itemTables &&
    typeof tryitConfig.itemTables === "object" &&
    !Array.isArray(tryitConfig.itemTables) &&
    Object.keys(tryitConfig.itemTables).length > 0
  );
}

export function normalizeTryitPayload(raw) {
  const src = (raw && typeof raw === "object") ? raw : {};
  const out = {};
  Object.keys(src).forEach((key) => {
    const val = src[key];
    out[key] = (val && typeof val === "object") ? val : {};
  });
  return out;
}

export function hasTryitPayloadContent(tryitPayload) {
  const payload = normalizeTryitPayload(tryitPayload);
  return Object.values(payload).some((table) => Object.keys(table || {}).length > 0);
}

function isAllZeroTryitTable(table) {
  if (!table || typeof table !== "object") return false;
  const values = Object.values(table);
  return values.length > 0 && values.every((value) => Number(value || 0) === 0);
}

function sanitizeLegacyTryitPayload(payload) {
  const normalized = normalizeTryitPayload(payload);
  const sanitized = {};
  const skippedTables = [];

  Object.entries(normalized).forEach(([tableName, table]) => {
    if (isAllZeroTryitTable(table)) {
      skippedTables.push(tableName);
      return;
    }
    sanitized[tableName] = table;
  });

  if (skippedTables.length > 0) {
    console.error(
      `TRYIT snapshot partially ignored: legacy all-zero table(s) skipped instead of applying suspected corrupted values: ${skippedTables.join(", ")}.`
    );
  }

  return hasTryitPayloadContent(sanitized) ? sanitized : null;
}

function mergeTryitPayloads(basePayload, nextPayload) {
  const base = normalizeTryitPayload(basePayload);
  const next = normalizeTryitPayload(nextPayload);
  const out = { ...base };

  Object.entries(next).forEach(([tableName, nextTable]) => {
    if (!nextTable || typeof nextTable !== "object" || Object.keys(nextTable).length < 1) {
      return;
    }
    const baseTable = (base?.[tableName] && typeof base[tableName] === "object") ? base[tableName] : {};
    out[tableName] = {
      ...baseTable,
      ...nextTable,
    };
  });

  return normalizeTryitPayload(out);
}

function getByPath(obj, path) {
  return String(path || "").split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function walkObjectTree(root, visitor) {
  const seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    visitor(node);
    Object.values(node).forEach((value) => {
      if (value && typeof value === "object") walk(value);
    });
  };
  walk(root);
}

function stableSerialize(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  if (typeof value !== "object") return JSON.stringify(value);
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
}

function getItableNamesFromSources(sources) {
  return (Array.isArray(sources) ? sources : [])
    .map((sourcePath) => {
      const parts = String(sourcePath || "").split(".");
      return parts.length === 2 && parts[0] === "itables" ? parts[1] : "";
    })
    .filter(Boolean);
}

function collectItemTableSnapshot(state, sources, field) {
  const tableNames = getItableNamesFromSources(sources);
  if (!field || tableNames.length < 1) return {};

  const out = {};
  const addTableValues = (sourceTable) => {
    if (!sourceTable || typeof sourceTable !== "object") return;
    Object.entries(sourceTable).forEach(([itemName, itemValue]) => {
      if (!itemValue || typeof itemValue !== "object") return;
      if (!Object.prototype.hasOwnProperty.call(itemValue, field)) return;
      if (Object.prototype.hasOwnProperty.call(out, itemName)) return;
      out[itemName] = Number(itemValue?.[field] || 0);
    });
  };

  (Array.isArray(sources) ? sources : []).forEach((sourcePath) => {
    addTableValues(getByPath(state, sourcePath));
  });

  walkObjectTree(state, (node) => {
    const itables = node?.itables;
    if (!itables || typeof itables !== "object") return;
    tableNames.forEach((tableName) => {
      addTableValues(itables?.[tableName]);
    });
  });
  return out;
}

export function buildCanonicalTryitSnapshot(farmState, tryitConfig) {
  const cfg = isValidTryitConfig(tryitConfig) ? tryitConfig : null;
  if (!cfg) return null;

  const state = (farmState && typeof farmState === "object") ? farmState : {};
  const out = {};

  (cfg.boostTables || []).forEach((tableName) => {
    const table = state?.boostables?.[tableName] || {};
    if (tableName === "skill") {
      out[tableName] = Object.fromEntries(
        Object.entries(table)
          .map(([itemName, value]) => [
            itemName,
            Number(value?.leveltry ?? value?.level ?? 0),
            Number(value?.level ?? 0),
          ])
          .filter(([, tryLevel, activeLevel]) => tryLevel !== activeLevel)
          .map(([itemName, tryLevel]) => [itemName, tryLevel])
      );
      return;
    }
    out[tableName] = Object.fromEntries(
      Object.entries(table)
        .filter(([, value]) => value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "tryit"))
        .map(([itemName, value]) => [
          itemName,
          Number(value?.tryit || 0),
        ])
    );
  });

  Object.entries(cfg.itemTables || {}).forEach(([payloadKey, tableCfg]) => {
    const field = tableCfg?.field;
    const sources = Array.isArray(tableCfg?.sources) ? tableCfg.sources : [];
    if (!field || sources.length < 1) {
      out[payloadKey] = {};
      return;
    }
    out[payloadKey] = collectItemTableSnapshot(state, sources, field);
  });

  return normalizeTryitPayload(out);
}

export function resolveTryitSnapshot({
  farmState = {},
  tryitConfig = null,
  responseSnapshot = null,
  allowStoredFallback = true,
  farmId = "",
} = {}) {
  if (allowStoredFallback) {
    const storedSnapshot = readTryitSnapshot(farmId);
    if (hasTryitPayloadContent(storedSnapshot)) {
      return storedSnapshot;
    }
  }

  const explicitSnapshot = normalizeTryitPayload(responseSnapshot);
  if (hasTryitPayloadContent(explicitSnapshot)) {
    return explicitSnapshot;
  }

  return {};
}

export function syncTryitStateAcrossFarmState(farmState, tryitConfig, tryitSnapshot = null) {
  const baseState = JSON.parse(JSON.stringify(farmState || {}));
  const cfg = isValidTryitConfig(tryitConfig) ? tryitConfig : null;
  if (!cfg) return baseState;

  const snapshot = normalizeTryitPayload(
    tryitSnapshot || buildCanonicalTryitSnapshot(baseState, cfg) || {}
  );
  const itemTableSync = Object.entries(cfg.itemTables || {})
    .map(([payloadKey, tableCfg]) => ({
      payloadKey,
      field: tableCfg?.field,
      tableNames: (Array.isArray(tableCfg?.sources) ? tableCfg.sources : [])
        .map((sourcePath) => {
          const parts = String(sourcePath || "").split(".");
          return parts[0] === "itables" ? parts[1] : "";
        })
        .filter(Boolean),
    }))
    .filter((entry) => entry.field && entry.tableNames.length > 0);

  walkObjectTree(baseState, (node) => {
    const boostables = node?.boostables;
    if (boostables && typeof boostables === "object") {
      (cfg.boostTables || []).forEach((tableName) => {
        const snapshotTable = snapshot?.[tableName];
        const targetTable = boostables?.[tableName];
        if (!snapshotTable || !targetTable || typeof targetTable !== "object") return;
        Object.entries(snapshotTable).forEach(([itemName, value]) => {
          if (!Object.prototype.hasOwnProperty.call(targetTable, itemName)) return;
          const nextValue = Number(value || 0);
          targetTable[itemName] = tableName === "skill"
            ? { ...(targetTable[itemName] || {}), leveltry: nextValue, tryit: nextValue }
            : { ...(targetTable[itemName] || {}), tryit: nextValue };
        });
      });
    }

    const itables = node?.itables;
    if (!itables || typeof itables !== "object") return;
    itemTableSync.forEach(({ payloadKey, field, tableNames }) => {
      const snapshotTable = snapshot?.[payloadKey];
      if (!snapshotTable || typeof snapshotTable !== "object") return;
      tableNames.forEach((tableName) => {
        const targetTable = itables?.[tableName];
        if (!targetTable || typeof targetTable !== "object") return;
        Object.entries(snapshotTable).forEach(([itemName, value]) => {
          if (!Object.prototype.hasOwnProperty.call(targetTable, itemName)) return;
          targetTable[itemName] = {
            ...(targetTable[itemName] || {}),
            [field]: Number(value || 0),
          };
        });
      });
    });
  });

  return baseState;
}

export function stripTryitFieldsFromFarmState(farmState, tryitConfig) {
  const baseState = JSON.parse(JSON.stringify(farmState || {}));
  const cfg = isValidTryitConfig(tryitConfig) ? tryitConfig : null;
  if (!cfg) return baseState;

  walkObjectTree(baseState, (node) => {
    const boostables = node?.boostables;
    if (boostables && typeof boostables === "object") {
      (cfg.boostTables || []).forEach((tableName) => {
        const targetTable = boostables?.[tableName];
        if (!targetTable || typeof targetTable !== "object") return;
        Object.keys(targetTable).forEach((itemName) => {
          const targetItem = targetTable[itemName];
          if (!targetItem || typeof targetItem !== "object") return;
          delete targetItem.tryit;
        });
      });
    }

    const itables = node?.itables;
    if (!itables || typeof itables !== "object") return;
    Object.entries(cfg.itemTables || {}).forEach(([payloadKey, tableCfg]) => {
      const field = tableCfg?.field;
      const sources = Array.isArray(tableCfg?.sources) ? tableCfg.sources : [];
      if (!field || sources.length < 1) return;
      sources.forEach((sourcePath) => {
        const parts = String(sourcePath || "").split(".");
        if (parts.length !== 2 || parts[0] !== "itables") return;
        const targetTable = itables?.[parts[1]];
        if (!targetTable || typeof targetTable !== "object") return;
        Object.keys(targetTable).forEach((itemName) => {
          const targetItem = targetTable[itemName];
          if (!targetItem || typeof targetItem !== "object") return;
          delete targetItem[field];
        });
      });
    });
  });

  return baseState;
}

export function applyTryitSnapshotToFarmState(farmState, tryitSnapshot, tryitConfig) {
  const baseState = JSON.parse(JSON.stringify(farmState || {}));
  const snapshot = normalizeTryitPayload(tryitSnapshot || {});
  const cfg = isValidTryitConfig(tryitConfig) ? tryitConfig : null;
  if (!cfg) return baseState;

  (cfg.boostTables || []).forEach((tableName) => {
    const snapshotTable = snapshot?.[tableName];
    if (!snapshotTable || typeof snapshotTable !== "object") return;
    const targetTable = baseState?.boostables?.[tableName];
    if (!targetTable || typeof targetTable !== "object") return;
    Object.entries(snapshotTable).forEach(([itemName, value]) => {
      if (!Object.prototype.hasOwnProperty.call(targetTable, itemName)) return;
      const nextValue = Number(value || 0);
      targetTable[itemName] = tableName === "skill"
        ? { ...(targetTable[itemName] || {}), leveltry: nextValue, tryit: nextValue }
        : { ...(targetTable[itemName] || {}), tryit: nextValue };
    });
  });

  Object.entries(cfg.itemTables || {}).forEach(([payloadKey, tableCfg]) => {
    const field = tableCfg?.field;
    const sources = Array.isArray(tableCfg?.sources) ? tableCfg.sources : [];
    const snapshotTable = snapshot?.[payloadKey];
    if (!field || sources.length < 1 || !snapshotTable || typeof snapshotTable !== "object") return;
    sources.forEach((sourcePath) => {
      const targetTable = getByPath(baseState, sourcePath);
      if (!targetTable || typeof targetTable !== "object") return;
      Object.entries(snapshotTable).forEach(([itemName, value]) => {
        if (!Object.prototype.hasOwnProperty.call(targetTable, itemName)) return;
        targetTable[itemName] = {
          ...(targetTable[itemName] || {}),
          [field]: Number(value || 0),
        };
      });
    });
  });

  return syncTryitStateAcrossFarmState(baseState, cfg, snapshot);
}

export function readTryitSnapshot(farmId = "") {
  try {
    const raw = localStorage.getItem(TRYIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.payload) {
        const payload = normalizeTryitPayload(parsed.payload);
        const version = Number(parsed.version || 0);
        if (version < TRYIT_STORAGE_VERSION) {
          return sanitizeLegacyTryitPayload(payload);
        }
        return payload;
      }
      const legacyPayload = normalizeTryitPayload(parsed);
      return sanitizeLegacyTryitPayload(legacyPayload);
    }
    return null;
  } catch (error) {
    console.error("TRYIT snapshot read failed: invalid SFLManTryit localStorage payload.", error);
    return null;
  }
}

export function purgeLegacyTryitSnapshots() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (/^tryit_snapshot[_:-]/i.test(key)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
    return keysToRemove;
  } catch {
    return [];
  }
}

export function writeTryitSnapshot(tryitPayload, farmId = "") {
  try {
    const normalized = normalizeTryitPayload(tryitPayload);
    if (!hasTryitPayloadContent(normalized)) {
      console.error("TRYIT snapshot write skipped: empty payload would erase local client configuration.");
      return null;
    }
    const merged = normalized;
    if (!hasTryitPayloadContent(merged)) {
      console.error("TRYIT snapshot write skipped: empty payload would erase local client configuration.");
      return null;
    }
    const serialized = JSON.stringify({
      version: TRYIT_STORAGE_VERSION,
      frmid: "",
      payload: merged,
      source: "client-local",
      updatedAt: Date.now(),
    });
    localStorage.setItem(TRYIT_STORAGE_KEY, serialized);
    return merged;
  } catch {
    return null;
  }
}

export function tryitPayloadSignature(tryitPayload) {
  return stableSerialize(normalizeTryitPayload(tryitPayload || {}));
}
