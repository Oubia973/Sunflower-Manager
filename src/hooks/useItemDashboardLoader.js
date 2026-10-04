import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { createItemDashboardCache } from "../components/inventory/itemDashboardCache.js";
import { normalizeServerImagesDeep } from "../constants/images.js";
import { fetchJson } from "../services/apiClient.js";

export function useItemDashboardLoader({ apiUrl, farmState, farmRef, options, selectedTrySeason, tryitConfig, getTryitRequestPayload, deviceIdRef }) {
  const cacheRef = useRef(null);
  if (!cacheRef.current) cacheRef.current = createItemDashboardCache();
  const scope = useMemo(() => ({}), [farmState, options, selectedTrySeason, tryitConfig]);
  const latestRef = useRef(null);
  useLayoutEffect(() => {
    latestRef.current = { scope, apiUrl, farmRef, options, selectedTrySeason, getTryitRequestPayload, deviceIdRef };
  }, [scope, apiUrl, farmRef, options, selectedTrySeason, getTryitRequestPayload, deviceIdRef]);

  // A changing callback in App can link memoized modal callbacks across renders
  // in the production bundle, retaining each old farm. Keep only current inputs.
  return useCallback((name) => {
    const current = latestRef.current;
    return cacheRef.current(current.scope, name, async () => {
      const farm = current.farmRef.current || {};
      const payload = await fetchJson(current.apiUrl, "/getItemDashboard", {
        method: "POST",
        body: {
          item: name,
          frmid: farm.frmid || current.options.farmId,
          options: current.options,
          deviceId: current.deviceIdRef.current,
          selectedTrySeason: String(current.selectedTrySeason || "all").toLowerCase(),
          ...current.getTryitRequestPayload(farm),
        },
      });
      return normalizeServerImagesDeep(payload);
    });
  }, []);
}
