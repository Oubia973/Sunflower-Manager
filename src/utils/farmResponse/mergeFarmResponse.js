import { mergeFarmStateDeep } from "../../fct.js";
import { syncTryitStateAcrossFarmState } from "../../tryitStorage.js";

// The caller resolves the snapshot and owns publication and persistence.
// An explicit null retains the historical canonical-state fallback.
export function mergeFarmResponse(currentFarm, payload, tryitConfig, tryitSnapshot) {
  const merged = mergeFarmStateDeep(currentFarm, payload, tryitConfig);
  return syncTryitStateAcrossFarmState(merged, tryitConfig, tryitSnapshot);
}
