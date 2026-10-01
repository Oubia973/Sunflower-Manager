import React, { act } from "react";
import { createRoot } from "react-dom/client";
import useCookStock from "./useCookStock.js";
import { fetchJson } from "../../services/apiClient.js";
jest.mock("../../services/apiClient.js", () => ({ fetchJson: jest.fn() }));
jest.mock("../../fct.js", () => ({ getOrCreateDeviceId: () => "test-device" }));

test("debounces small server requests, ignores old results and skips other modes", async () => {
    jest.useFakeTimers();
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    const root = createRoot(host);
    let state;
    let resolveOld;
    const source = {};
    const props = { enabled: true, apiUrl: "", farmId: 1972, tryMode: false, priority: "xph", dishes: ["Soup"], source };
    function Probe(input) { state = useCookStock(input); return null; }
    fetchJson.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
        .mockResolvedValueOnce({ quantities: { Soup: 2 } });
    try {
        await act(async () => root.render(<Probe {...props} />));
        expect(fetchJson).not.toHaveBeenCalled();
        await act(async () => jest.advanceTimersByTime(300));
        await act(async () => root.render(<Probe {...props} priority="xpsfl" />));
        await act(async () => jest.advanceTimersByTime(300));
        expect(JSON.parse(fetchJson.mock.calls[1][2].body)).toEqual({ farmId: 1972, deviceId: "test-device", tryMode: false, priority: "xpsfl", dishes: ["Soup"] });
        expect(state.quantities).toEqual({ Soup: 2 });
        await act(async () => resolveOld({ quantities: { Soup: 99 } }));
        expect(state.quantities).toEqual({ Soup: 2 });
        await act(async () => root.render(<Probe {...props} enabled={false} />));
        await act(async () => jest.advanceTimersByTime(1000));
        expect(fetchJson).toHaveBeenCalledTimes(2);
        await act(async () => root.render(<Probe {...props} farmId={undefined} />));
        await act(async () => jest.advanceTimersByTime(1000));
        expect(fetchJson).toHaveBeenCalledTimes(2);
        expect(state.error).toBe("Load a farm to calculate stock");
    } finally {
        await act(async () => root.unmount());
        jest.useRealTimers();
        delete global.IS_REACT_ACT_ENVIRONMENT;
    }
});
