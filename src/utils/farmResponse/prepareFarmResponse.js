import { unpackFarmPayloadTables, applyFarmPayloadTableDeltas } from "../../fct.js";
import { normalizeServerImagesDeep, versionImageUrl } from "../../constants/images.js";
import { applyTradesDeltaToPayload } from "../farmState.js";

export function normalizeFarmResponseImages(rawPayload) {
  return normalizeServerImagesDeep(rawPayload || {});
}

// Initial loading historically normalizes before unpacking and does not apply
// table deltas. Keep this adapter separate from refresh preparation.
export function prepareLoadedFarmResponse(currentFarm, normalizedPayload) {
  return applyTradesDeltaToPayload(currentFarm, unpackFarmPayloadTables(normalizedPayload));
}

// Modal refresh/close keeps the current trades, independently of Try response data.
export function prepareTryModalResponse(currentFarm, rawPayload) {
  const payload = { ...(unpackFarmPayloadTables(rawPayload) || {}) };
  payload.ftrades = currentFarm?.ftrades;
  payload.ftradesHeader = currentFarm?.ftradesHeader;
  return payload;
}

// Two stages let callers invalidate rejected hashes before final normalization,
// preserving the existing order of effects in useDataFetcher.
export function prepareFarmTableResponse(currentFarm, rawPayload, knownTableHashes, tryitConfig) {
  return applyFarmPayloadTableDeltas(
    currentFarm, unpackFarmPayloadTables(rawPayload), knownTableHashes, tryitConfig
  );
}

export function finalizeFarmResponse(currentFarm, rawPayload) {
  const normalized = normalizeFarmResponseImages(rawPayload);
  if (normalized?.constants?.imgtkt) {
    normalized.constants.imgtkt = versionImageUrl(normalized.constants.imgtkt);
  }
  return {
    rawPayload,
    payload: rawPayload && typeof rawPayload === "object"
      ? applyTradesDeltaToPayload(currentFarm, normalized)
      : normalized,
  };
}
