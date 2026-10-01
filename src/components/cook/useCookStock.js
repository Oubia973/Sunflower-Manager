import { useEffect, useState } from "react";
import { fetchJson } from "../../services/apiClient.js";
import { getOrCreateDeviceId } from "../../fct.js";

export default function useCookStock({ enabled, apiUrl, farmId, tryMode, priority, dishes, source }) {
    const [state, setState] = useState({ quantities: {}, loading: false, error: "" });
    const selection = JSON.stringify(dishes);
    useEffect(() => {
        if (!enabled) return;
        const controller = new AbortController();
        let active = true;
        if (!/^\d{1,12}$/.test(String(farmId || ""))) {
            setState({ quantities: {}, loading: false, error: "Load a farm to calculate stock" });
            return;
        }
        setState({ quantities: {}, loading: true, error: "" });
        const timer = setTimeout(async () => {
            try {
                const result = await fetchJson(apiUrl, "/cook/stock", {
                    method: "POST",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ farmId, deviceId: getOrCreateDeviceId(), tryMode: !!tryMode, priority, dishes: JSON.parse(selection) }),
                });
                if (active) setState({ quantities: result.quantities || {}, loading: false, error: "" });
            } catch (error) {
                if (active) setState({ quantities: {}, loading: false, error: error.message || "Stock calculation failed" });
            }
        }, 300);
        return () => { active = false; clearTimeout(timer); controller.abort(); };
    }, [enabled, apiUrl, farmId, tryMode, priority, selection, source]);
    return state;
}
