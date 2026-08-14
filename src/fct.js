import React, { useEffect, useState, useRef } from 'react';
import { isValidTryitConfig } from './tryitStorage.js';
import { imgrdy } from './constants/images.js';
const DEVICE_ID_STORAGE_KEY = "SFLManDeviceId";

export function getOrCreateDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && String(existing).length >= 8) {
      return String(existing);
    }
    let nextId = "";
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      nextId = crypto.randomUUID();
    } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      nextId = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    } else {
      nextId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, nextId);
    return nextId;
  } catch {
    return "device-unknown";
  }
}

export function frmtNb(nombre, decimal=2) {
  const nombreNumerique = parseFloat(nombre);
  const stripTrailingZeroDecimals = (value) => {
    const fixed = String(value);
    return fixed.includes(".") ? fixed.replace(/\.0+$/, "") : fixed;
  };
  var nombreStr = nombreNumerique.toString();
  const positionE = nombreStr.indexOf("e");
  if (positionE !== -1) {
    const nombreNumeriqueCorr = Number(nombreStr).toFixed(20);
    nombreStr = nombreNumeriqueCorr.toString();
  }
  if (isNaN(nombreNumerique)) {
    return "0";
  }
  const positionVirgule = nombreStr.indexOf(".");
  if (positionVirgule !== -1) {
    let chiffreSupZero = null;
    for (let i = positionVirgule + 1; i < nombreStr.length; i++) {
      if (nombreStr[i] !== '0') {
        chiffreSupZero = i;
        break;
      }
    }
    if (chiffreSupZero === null) { return stripTrailingZeroDecimals(nombreNumerique.toFixed(decimal)) }
    if (Math.abs(Math.floor(nombre)) > 0) {
      if (Math.abs(Math.floor(nombre)) < 5) {
        return stripTrailingZeroDecimals(nombreNumerique.toFixed(3));
      } else {
        return stripTrailingZeroDecimals(nombreNumerique.toFixed(decimal));
      }
    } else {
      return nombreStr.slice(0, chiffreSupZero + 3);
    }
  } else {
    return nombreStr;
  }
}

export function flattenCompoit(rawCompo) {
  const out = {};
  const walk = (tree, multiplier = 1) => {
    if (!tree || typeof tree !== "object") return;
    Object.entries(tree).forEach(([name, rawNode]) => {
      if (typeof rawNode === "number") {
        out[name] = (out[name] || 0) + (Number(rawNode || 0) * multiplier);
        return;
      }
      const qty = Number(rawNode?.qty ?? rawNode?.quant ?? rawNode?.q ?? 0) || 0;
      const children = rawNode?.compoit && typeof rawNode.compoit === "object" ? rawNode.compoit : null;
      if (children && Object.keys(children).length > 0) {
        walk(children, qty > 0 ? multiplier * qty : multiplier);
      } else {
        out[name] = (out[name] || 0) + (qty * multiplier);
      }
    });
  };
  walk(rawCompo || {});
  return out;
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function unpackPackedObjectTable(packedTable) {
  if (!isPlainObject(packedTable) || !Array.isArray(packedTable.c) || !Array.isArray(packedTable.r)) {
    return null;
  }
  const columns = packedTable.c;
  const out = {};
  packedTable.r.forEach((row) => {
    if (!Array.isArray(row) || row.length < 1) return;
    const rowKey = row[0];
    if (row.length === 2 && !Array.isArray(row[1])) {
      out[rowKey] = row[1];
      return;
    }
    const rowObj = {};
    const values = Array.isArray(row[1]) ? row[1] : [];
    values.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return;
      const idx = Number(entry[0]);
      const field = columns[idx];
      if (field !== undefined) rowObj[field] = entry[1];
    });
    out[rowKey] = rowObj;
  });
  return out;
}

export function unpackFarmPayloadTables(farmPayload) {
  if (!isPlainObject(farmPayload) || !isPlainObject(farmPayload._packedTables)) {
    return farmPayload;
  }
  const unpacked = { ...farmPayload };
  Object.entries(farmPayload._packedTables).forEach(([rootKey, rootTables]) => {
    if (!isPlainObject(rootTables)) return;
    unpacked[rootKey] = { ...(unpacked[rootKey] || {}) };
    Object.entries(rootTables).forEach(([subKey, packedTable]) => {
      const table = unpackPackedObjectTable(packedTable);
      if (table) unpacked[rootKey][subKey] = table;
    });
  });
  delete unpacked._packedTables;
  return unpacked;
}

export function applyFarmPayloadTableDeltas(currentFarm, responsePayload, knownTableHashes, tryitConfig = null) {
  const payload = isPlainObject(responsePayload) ? responsePayload : {};
  const deltaRoots = isPlainObject(payload._tableDeltas) ? payload._tableDeltas : null;
  if (!deltaRoots) return { payload, appliedPaths: [], rejectedPaths: [] };
  const current = isPlainObject(currentFarm) ? currentFarm : {};
  const known = isPlainObject(knownTableHashes) ? knownTableHashes : {};
  const nextPayload = { ...payload };
  delete nextPayload._tableDeltas;
  const replaceTables = new Set(Array.isArray(payload._replaceTables) ? payload._replaceTables : []);
  const appliedPaths = [];
  const rejectedPaths = [];
  const preservedFieldsByPath = {};

  if (isValidTryitConfig(tryitConfig)) {
    Object.values(tryitConfig.itemTables || {}).forEach((tableCfg) => {
      const field = String(tableCfg?.field || "").trim();
      if (!field) return;
      (Array.isArray(tableCfg?.sources) ? tableCfg.sources : []).forEach((path) => {
        const normalizedPath = String(path || "").trim();
        if (!normalizedPath) return;
        if (!preservedFieldsByPath[normalizedPath]) preservedFieldsByPath[normalizedPath] = new Set();
        preservedFieldsByPath[normalizedPath].add(field);
      });
    });
  }

  Object.entries(deltaRoots).forEach(([rootKey, rootDeltas]) => {
    if (!isPlainObject(rootDeltas)) return;
    Object.entries(rootDeltas).forEach(([subKey, delta]) => {
      const tablePath = `${rootKey}.${subKey}`;
      const baseTable = current?.[rootKey]?.[subKey];
      const baseHash = String(delta?.baseHash || "");
      const nextHash = String(delta?.nextHash || "");
      const upserts = isPlainObject(delta?.upserts) ? delta.upserts : null;
      const deletes = Array.isArray(delta?.deletes) ? delta.deletes : null;
      const valid = (
        isPlainObject(baseTable)
        && baseHash
        && nextHash
        && String(known?.[tablePath] || "") === baseHash
        && upserts
        && deletes
        && deletes.every((rowKey) => typeof rowKey === "string")
      );
      if (!valid) {
        rejectedPaths.push(tablePath);
        return;
      }

      const nextTable = { ...baseTable };
      deletes.forEach((rowKey) => delete nextTable[rowKey]);
      const preservedFields = preservedFieldsByPath[tablePath] || new Set();
      Object.entries(upserts).forEach(([rowKey, rawRow]) => {
        const row = isPlainObject(rawRow) ? { ...rawRow } : rawRow;
        if (isPlainObject(row) && isPlainObject(baseTable[rowKey])) {
          preservedFields.forEach((field) => {
            if (!Object.prototype.hasOwnProperty.call(row, field) && Object.prototype.hasOwnProperty.call(baseTable[rowKey], field)) {
              row[field] = baseTable[rowKey][field];
            }
          });
        }
        nextTable[rowKey] = row;
      });
      nextPayload[rootKey] = { ...(nextPayload[rootKey] || {}), [subKey]: nextTable };
      replaceTables.add(tablePath);
      appliedPaths.push(tablePath);
    });
  });
  nextPayload._replaceTables = [...replaceTables];
  return { payload: nextPayload, appliedPaths, rejectedPaths };
}

export function mergeFarmStateDeep(prevFarm, nextFarm, tryitConfig = null) {
  const prev = prevFarm || {};
  const next = nextFarm || {};
  const merged = { ...prev };
  const replaceTables = new Set(Array.isArray(next?._replaceTables) ? next._replaceTables : []);
  const cfg = isValidTryitConfig(tryitConfig) ? tryitConfig : null;
  const CLIENT_ONLY_TABLE_FIELDS = Object.entries(cfg?.itemTables || {}).reduce((acc, [, tableCfg]) => {
    const field = String(tableCfg?.field || "").trim();
    const sources = Array.isArray(tableCfg?.sources) ? tableCfg.sources : [];
    if (!field || sources.length < 1) return acc;
    sources.forEach((sourcePath) => {
      const parts = String(sourcePath || "").split(".");
      if (parts.length !== 2 || parts[0] !== "itables" || !parts[1]) return;
      const tablePath = `${parts[0]}.${parts[1]}`;
      if (!acc[tablePath]) acc[tablePath] = new Set();
      acc[tablePath].add(field);
    });
    return acc;
  }, {});
  const mergeNode = (prevNode, nextNode, path = []) => {
    if (path.length === 1 && path[0] === "_replaceTables") {
      return undefined;
    }
    if (path.length === 1 && path[0] === "ftrades") {
      return nextNode !== undefined ? nextNode : prevNode;
    }
    if (
      path.length === 2 &&
      (path[0] === "itables" || path[0] === "boostables") &&
      replaceTables.has(`${path[0]}.${path[1]}`)
    ) {
      return nextNode !== undefined ? nextNode : prevNode;
    }
    if (!isPlainObject(prevNode) || !isPlainObject(nextNode)) {
      return nextNode !== undefined ? nextNode : prevNode;
    }
    const output = { ...prevNode };
    Object.keys(nextNode).forEach((key) => {
      const nextVal = nextNode[key];
      const prevVal = prevNode[key];
      // Skip null/undefined values from server to preserve existing data
      if (nextVal === null || nextVal === undefined) {
        return;
      }
      output[key] = mergeNode(prevVal, nextVal, [...path, key]);
    });

    const itemTablePath = (
      path.length >= 2 && path[path.length - 2] === "itables"
        ? `${path[path.length - 2]}.${path[path.length - 1]}`
        : ""
    );
    const preservedFields = CLIENT_ONLY_TABLE_FIELDS[itemTablePath];
    if (preservedFields) {
      Object.keys(output).forEach((itemName) => {
        const item = output[itemName];
        const nextItem = nextNode[itemName];
        if (!isPlainObject(item) || !isPlainObject(nextItem)) return;
        const prevItem = prevNode?.[itemName];
        // Always preserve client-only fields from prev state (these are sent via tryitarrays, not from server)
        preservedFields.forEach((field) => {
          if (Object.prototype.hasOwnProperty.call(nextItem, field)) {
            item[field] = nextItem[field];
            return;
          }
          if (isPlainObject(prevItem) && Object.prototype.hasOwnProperty.call(prevItem, field)) {
            item[field] = prevItem[field];
            nextItem[field] = prevItem[field];
          }
        });
        // After preserving client-only fields, apply animal-specific logic
        if (!item.animal && !nextItem.animal) return;
        if (Object.prototype.hasOwnProperty.call(nextItem, "needlove")) {
          item.needlove = nextItem.needlove;
        } else {
          delete item.needlove;
        }
        if (Object.prototype.hasOwnProperty.call(nextItem, "issick")) {
          item.issick = nextItem.issick;
        } else {
          delete item.issick;
        }
        if (Object.prototype.hasOwnProperty.call(nextItem, "feedBuff")) {
          item.feedBuff = nextItem.feedBuff;
        } else {
          delete item.feedBuff;
        }
      });
    }
    return output;
  };
  Object.keys(next).forEach((key) => {
    if (key === "_replaceTables") return;
    const nextVal = next[key];
    // Skip undefined/null values to preserve existing data
    if (nextVal === undefined || nextVal === null) return;
    merged[key] = mergeNode(prev[key], nextVal, [key]);
  });
  const incomingTryRevision = Math.max(0, Math.floor(Number(next?.tryitRevision) || 0));
  const projectionHashes = isPlainObject(next?.projectionHashes) ? next.projectionHashes : {};
  if (incomingTryRevision > 0) {
    Object.keys(next).forEach((key) => {
      if (!key.endsWith("Data") || !isPlainObject(next[key]) || !isPlainObject(merged[key])) return;
      merged[key] = {
        ...merged[key],
        _source: {
          ...(isPlainObject(merged[key]?._source) ? merged[key]._source : {}),
          tryitRevision: incomingTryRevision,
        },
      };
    });
    const unchangedSections = new Set(
      Array.isArray(next?.unchangedSections) ? next.unchangedSections.map(String) : []
    );
    if (unchangedSections.size > 0) {
      Object.keys(merged).forEach((key) => {
        if (!key.endsWith("Data") || !isPlainObject(merged[key])) return;
        const sourceSection = String(merged[key]?._source?.section || "");
        if (!unchangedSections.has(sourceSection)) return;
        merged[key] = {
          ...merged[key],
          _source: {
            ...(isPlainObject(merged[key]?._source) ? merged[key]._source : {}),
            tryitRevision: incomingTryRevision,
          },
        };
      });
    }
  }
  if (Object.keys(projectionHashes).length > 0) {
    Object.keys(merged).forEach((key) => {
      if (!key.endsWith("Data") || !isPlainObject(merged[key])) return;
      const currentHash = String(projectionHashes[key] || "");
      const contentHash = String(merged[key]?._source?.contentHash || "");
      if (!currentHash || !contentHash) return;
      const hashMatches = currentHash === contentHash;
      merged[key] = {
        ...merged[key],
        _source: {
          ...(isPlainObject(merged[key]?._source) ? merged[key]._source : {}),
          stale: !hashMatches,
          ...(hashMatches && incomingTryRevision > 0 ? { tryitRevision: incomingTryRevision } : {}),
        },
      };
    });
  }
  return merged;
}

/**
 * Strip metadata keys from farm data objects.
 * These keys are added by the API for hash tracking but should never be stored
 * in React state or rendered as children.
 */
export function stripFarmMetadata(farmData, debugLabel = 'stripFarmMetadata') {
  if (!farmData || typeof farmData !== 'object') return {};
  const originalKeys = Object.keys(farmData);
  const {
    sectionHashes: _sh,
    projectionHashes: _ph,
    tableHashes: _th,
    unchangedSections: _ush,
    requestedSections: _rqs,
    returnedSections: _rs,
    priceData: _pd,
    ...cleanFarmData
  } = farmData;
  const strippedKeys = originalKeys.filter(k =>
    k === 'sectionHashes' || k === 'projectionHashes' || k === 'tableHashes' || k === 'unchangedSections' ||
    k === 'requestedSections' || k === 'returnedSections' || k === 'priceData'
  );
  return cleanFarmData;
}

export function convTime(nombre) {
  if (nombre > 0 && nombre !== Infinity) {
    //if (nombre === "-Infinity" || nombre === "Infinity" || nombre === 0 || nombre === NaN) { return "00:00:00" }
    const heures = Math.floor(nombre * 24);
    const minutes = Math.floor(nombre * 24 * 60) % 60;
    const secondes = Math.floor(nombre * 24 * 60 * 60) % 60;
    const jours = Math.floor(heures / 24);
    const heuresFormat = heures % 24;
    const jourStr = jours > 0 ? jours.toString().padStart(2, '0') + ':' : '';
    const heureStr = heuresFormat.toString().padStart(2, '0');
    const minuteStr = minutes.toString().padStart(2, '0');
    const secondeStr = secondes.toString().padStart(2, '0');
    return jourStr + heureStr + ':' + minuteStr + ':' + secondeStr;
  } else {
    return '00:00:00';
  }
}

export function convtimenbr(tempsFormat) {
  if (tempsFormat !== "" && tempsFormat !== 0) {
    const tempsArray = tempsFormat.split(':');
    let jours, heures, minutes, secondes;
    if (tempsArray.length === 3) {
      jours = 0;
      heures = parseInt(tempsArray[0], 10);
      minutes = parseInt(tempsArray[1], 10);
      secondes = parseInt(tempsArray[2], 10);
    } else if (tempsArray.length === 4) {
      jours = parseInt(tempsArray[0], 10);
      heures = parseInt(tempsArray[1], 10);
      minutes = parseInt(tempsArray[2], 10);
      secondes = parseInt(tempsArray[3], 10);
    } else {
      return 0;
    }
    var totalSecondes = (jours * 86400 + heures * 3600 + minutes * 60 + secondes);
    const nombre = totalSecondes / (24 * 60 * 60);
    return nombre;
  } else {
    return 0;
  }
}

export function formatUpdated(unixTime) {
  const tsNum = Number(unixTime);
  if (!Number.isFinite(tsNum) || tsNum <= 0) return "never updated";
  const ts = tsNum < 1e12 ? tsNum * 1000 : tsNum;
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "in the future";
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMinutes = minutes % 60;
    return `${hours} hour${hours !== 1 ? "s" : ""}${remMinutes ? ` ${remMinutes} min` : ""} ago`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const remMinutes = minutes % 60;
  return `${days} day${days !== 1 ? "s" : ""}` +
    (remHours ? ` ${remHours} hour${remHours !== 1 ? "s" : ""}` : "") +
    (remMinutes ? ` ${remMinutes} min` : "") +
    " ago";
}
export function UpdatedSince({ unixTime, intervalMs = 1000 }) {
  const textRef = useRef(null);
  useEffect(() => {
    const update = () => {
      if (!textRef.current) return;
      textRef.current.textContent = formatUpdated(unixTime);
    };
    update();
    const tsNum = Number(unixTime);
    if (!Number.isFinite(tsNum) || tsNum <= 0) return;
    const timer = setInterval(update, intervalMs);
    return () => clearInterval(timer);
  }, [unixTime, intervalMs]);
  return <span ref={textRef}>{formatUpdated(unixTime)}</span>;
}
export function timeToDays(time) {
  if(!time) return;
  const parts = time.split(":").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  if (parts.length === 4) {
    const [d, h, m, s] = parts;
    return d > 0
      ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
      : `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  if (parts.length === 3) {
    const [h, m, s] = parts;
    const d = Math.floor(h / 24);
    const hh = h % 24;
    return d > 0
      ? `${d}d ${pad(hh)}:${pad(m)}:${pad(s)}`
      : `${pad(hh)}:${pad(m)}:${pad(s)}`;
  }
  return time;
}
export function ColorValue(value, minValue = 1, maxValue = 10) {
  if (value <= minValue) {
    return "red";
  }
  if (!isFinite(value)) {
    return `rgb(${0}, ${255}, ${0})`;
  }
  /* if (value >= maxV) {
    return "green";
  } */
  //const normalizedValue = Math.min((value - 1) / (20 - 1), 1);
  //console.log(normalizedValue);
  //const red = Math.round((1 - normalizedValue) * 255);
  //const green = Math.round(255);
  const normalizedValue = (value - minValue) / (maxValue - minValue);
  const red = Math.round(255 * (1 - normalizedValue));
  const green = 255;
  const blue = 0;
  return `rgb(${red}, ${green}, ${blue})`;
}
export function ColorValueP(value, maxAbs = 50) {
  if (!Number.isFinite(value)) return "rgb(255,255,0)";
  const v = Math.max(-maxAbs, Math.min(maxAbs, value));
  const n = v / maxAbs;
  let r, g;
  if (n >= 0) {
    r = Math.round(255 * (1 - n));
    g = 255;
  } else {
    r = 255;
    g = Math.round(255 * (1 + n));
  }
  return `rgb(${r}, ${g}, 0)`;
}

export function formatdate(timestamp) {
    if (timestamp < 3600 * 1000 * 24) { timestamp -= 3600 * 1000 }
    if (timestamp <= 0) { return 0 }
    var dateActuelle = new Date(timestamp);
    //var jours = dateActuelle.getDate();
    var heures = dateActuelle.getHours();
    var minutes = dateActuelle.getMinutes();
    //var secondes = dateActuelle.getSeconds();
    var dateFormatee = (
        //(jours < 10 ? "0" : "") + jours + ":" +
        (heures < 10 ? "0" : "") + heures + ":" +
        (minutes < 10 ? "0" : "") + minutes //+ ":" +
        //(secondes < 10 ? "0" : "") + secondes
    );
    return dateFormatee;
}
export function Timer({ timestamp, index, onTimerFinish }) {
  const [timeLeft, setTimeLeft] = useState(timestamp - Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prevTimeLeft => prevTimeLeft - 1000);
      if (timeLeft <= 0) {
        clearInterval(timer);
        if (onTimerFinish) {
          onTimerFinish(index);
        }
      }
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [timeLeft, index, onTimerFinish]);
  const formatTime = (time) => {
    const hours = Math.floor(time / (1000 * 60 * 60));
    const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((time % (1000 * 60)) / 1000);
    return `${hours}:${minutes}:${seconds}`;
  };
  return (
    <span>
      {timeLeft > 0 ? (
        <span>{formatTime(timeLeft)}</span>
      ) : (
        <img src={imgrdy} alt="" />
      )}
    </span>
  );
}

export function filterTryit(dataSet, toArray, tryitConfig = null) {
  const cfg = isValidTryitConfig(tryitConfig) ? tryitConfig : null;
  if (!cfg) {
    console.error("TRYIT_CONFIG missing");
    return {};
  }
  const tableSources = (() => {
    const src = (dataSet && typeof dataSet === "object") ? dataSet : {};
    const out = [];
    const seen = new Set();
    const pushUnique = (candidate) => {
      if (!candidate || typeof candidate !== "object") return;
      if (seen.has(candidate)) return;
      seen.add(candidate);
      out.push(candidate);
    };
    pushUnique(src?.itables);
    Object.values(src).forEach((entry) => {
      if (entry && typeof entry === "object" && entry.itables && typeof entry.itables === "object") {
        pushUnique(entry.itables);
      }
    });
    return out;
  })();
  const mergeTable = (tableName) => {
    return tableSources.reduce((acc, src) => {
      const table = src?.[tableName];
      if (table && typeof table === "object") {
        Object.entries(table).forEach(([itemName, itemValue]) => {
          if (!Object.prototype.hasOwnProperty.call(acc, itemName)) {
            acc[itemName] = itemValue;
            return;
          }
          if (itemValue && typeof itemValue === "object" && !Array.isArray(itemValue)) {
            acc[itemName] = {
              ...(acc[itemName] || {}),
              ...itemValue,
            };
          } else {
            acc[itemName] = itemValue;
          }
        });
      }
      return acc;
    }, {});
  };
  const mergedTableCache = {};
  const mergedByPath = (path) => {
    const tableName = String(path || "").split(".")[1];
    if (!tableName) return {};
    if (!Object.prototype.hasOwnProperty.call(mergedTableCache, tableName)) {
      mergedTableCache[tableName] = mergeTable(tableName);
    }
    return mergedTableCache[tableName] || {};
  };
  const it = mergedByPath("itables.it");
  const food = mergedByPath("itables.food");
  const pfood = mergedByPath("itables.pfood");
  const result = {};
  const boostSources = (() => {
    const src = (dataSet && typeof dataSet === "object") ? dataSet : {};
    const out = [];
    const seen = new Set();
    const pushUnique = (candidate) => {
      if (!candidate || typeof candidate !== "object") return;
      if (seen.has(candidate)) return;
      seen.add(candidate);
      out.push(candidate);
    };
    pushUnique(src?.boostables);
    Object.values(src).forEach((entry) => {
      if (entry && typeof entry === "object" && entry.boostables && typeof entry.boostables === "object") {
        pushUnique(entry.boostables);
      }
    });
    return out;
  })();
  const boostables = boostSources.reduce((acc, src) => {
    Object.keys(src || {}).forEach((boostableName) => {
      acc[boostableName] = {
        ...(acc[boostableName] || {}),
        ...(src[boostableName] || {}),
      };
    });
    return acc;
  }, {});
  if (boostables) {
    const expectedBoostTables = Array.isArray(cfg?.boostTables) ? cfg.boostTables : [];
    expectedBoostTables.forEach((boostableName) => {
      let bTable = [];
      const boostable = boostables?.[boostableName] || {};
      Object.entries(boostable).forEach(([item]) => { bTable[item] = Number(boostable[item]?.tryit || 0); });
      const tableToArray = Object.entries(bTable)
        .filter(([key, value]) => Number(value || 0) !== 0)
        .map(([key, value]) => ({ name: key, value }))
        .reduce((acc, item) => { acc[item.name] = item.value; return acc; }, {});
      result[boostableName] = tableToArray;
    });
    const itemTables = (cfg?.itemTables && typeof cfg.itemTables === "object") ? cfg.itemTables : {};
    Object.entries(itemTables).forEach(([payloadKey, tableCfg]) => {
      const field = tableCfg?.field;
      const baseField = tableCfg?.baseField || field;
      const sources = Array.isArray(tableCfg?.sources) ? tableCfg.sources : [];
      if (!field || sources.length < 1) {
        result[payloadKey] = {};
        return;
      }
      const out = {};
      sources.forEach((sourcePath) => {
        const sourceTable = mergedByPath(sourcePath);
        Object.entries(sourceTable || {}).forEach(([itemName, itemValue]) => {
          out[itemName] = Number(itemValue?.[field] || 0);
        });
      });
      const keepZeros = (baseField === field) && (field === "farmit" || field === "buyit" || field === "cookit");
      result[payloadKey] = ConvToArray(out, keepZeros);
    });
  }
  (Array.isArray(cfg?.boostTables) ? cfg.boostTables : []).forEach((tableName) => {
    result[tableName] = result[tableName] || {};
  });
  Object.keys(cfg?.itemTables || {}).forEach((payloadKey) => {
    result[payloadKey] = result[payloadKey] || {};
  });
  return result;
  function ConvToArray(tableVar, keepZeros = false) {
    const table = Object.entries(tableVar)
      .filter(([key, value]) => keepZeros ? true : value !== 0)
      .map(([key, value]) => ({ name: key, value }))
      .reduce((acc, item) => { acc[item.name] = item.value; return acc; }, {});
    return table;
  }
}

export function getMaxValue(value1, value2, value3) {
  const positiveValues = [parseFloat(value1).toFixed(20), parseFloat(value2).toFixed(20), parseFloat(value3).toFixed(20)].filter(value => value > 0);
  return positiveValues.length > 0 ? parseFloat(Math.max(...positiveValues)).toFixed(20).toString() : null;
}

export function PBar(val, pval, max, left, width = 60) {
  const maxNum = Number(max);
  const maxh = Number.isFinite(maxNum) && maxNum > 0 ? maxNum : 0;
  const maxTxt = formatKNumber(maxh);
  const previousQuantityRaw = Number(pval);
  const previousQuantity = Number.isFinite(previousQuantityRaw) ? Math.ceil(previousQuantityRaw) : 0;
  const quantityRaw = Number(val);
  const Quantity = Number.isFinite(quantityRaw) ? Math.ceil(quantityRaw) : 0;
  const harvestLeftRaw = Number(left);
  const harvestLeft = Number.isFinite(harvestLeftRaw) ? harvestLeftRaw : 0;
  const harvestLeftTxt = formatKNumber(harvestLeft);
  const difference = Quantity - previousQuantity;
  const differenceTxt = formatKNumber(difference);
  const absDifference = (difference);
  const isNegativeDifference = difference < 0;
  const pctDivisor = maxh > 0 ? maxh : 1;
  const progressPct = Math.max(
    0,
    Math.floor((absDifference / pctDivisor) * 100)
  );
  const harvestPct = Math.max(
    0,
    Math.floor((harvestLeft / pctDivisor) * 100)
  );
  const safeHarvestPct = Math.min(harvestPct, 100 - progressPct) || 0;
  return (
    <div className={`progress-barb ${isNegativeDifference ? 'negative' : ''}`} style={{ width }}>
      <div
        className="progress"
        style={{ width: `${progressPct}%` }}
      >
        <span className="progress-text">
          {isNegativeDifference
            ? differenceTxt
            : `${differenceTxt}${harvestLeft ? ("+" + harvestLeftTxt) : ""}/${maxTxt}`}
        </span>
      </div>
      {safeHarvestPct > 0 && (
        <div
          className="progress-harvest"
          style={{ width: `${safeHarvestPct}%` }}
        >
          {/* <span className="progress-text">
            {frmtNb(harvestLeft)}
          </span> */}
        </div>
      )}
    </div>
  );
}
export function formatKNumber(n) {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(3).replace(/\.?0+$/, "") + "m";
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return String(n);
}

export function buildSeriesMeta(items, getGroupValue) {
  if (!Array.isArray(items) || typeof getGroupValue !== "function") return [];
  const groups = items.map((item, index) => String(getGroupValue(item, index) ?? ""));
  return groups.map((group, index) => ({
    isStart: index === 0 || groups[index - 1] !== group,
    isEnd: index === groups.length - 1 || groups[index + 1] !== group,
  }));
}
