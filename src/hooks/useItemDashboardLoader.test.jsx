import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useItemDashboardLoader } from "./useItemDashboardLoader.js";
import { fetchJson } from "../services/apiClient.js";

jest.mock("../services/apiClient.js", () => ({ fetchJson: jest.fn() }));

test("retained loader stays stable across refreshes and uses current farm, settings and Try inputs", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  let loader;
  function Harness({ inputs }) {
    loader = useItemDashboardLoader(inputs);
    return null;
  }
  const inputs = {
    apiUrl: "http://test", farmState: { frmid: 1 }, farmRef: { current: { frmid: 1 } },
    options: { farmId: 1 }, selectedTrySeason: "all", tryitConfig: {},
    getTryitRequestPayload: () => ({ tryitMode: "active" }), deviceIdRef: { current: "device" },
  };
  fetchJson.mockReset().mockResolvedValue({ img: "/icon/res/wood.png" });
  try {
    await act(async () => root.render(<Harness inputs={inputs} />));
    const retained = loader;
    const first = await retained("Wood");
    expect(first.img).toBe("/icon/res/wood.png?v=v1");
    await retained("Wood");
    expect(fetchJson).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 200; i++) {
      inputs.farmState = { frmid: 2, updated: i };
      inputs.farmRef.current = inputs.farmState;
      inputs.options = { farmId: 2, coinsRatio: i };
      inputs.selectedTrySeason = "Winter";
      inputs.getTryitRequestPayload = () => ({ tryitMode: "snapshot", tryitarrays: { it: { Wood: i } } });
      await act(async () => root.render(<Harness inputs={{ ...inputs }} />));
      expect(loader).toBe(retained);
    }
    await retained("Wood");
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(fetchJson.mock.calls[1][2].body).toEqual({
      item: "Wood", frmid: 2, options: { farmId: 2, coinsRatio: 199 }, deviceId: "device",
      selectedTrySeason: "winter", tryitMode: "snapshot", tryitarrays: { it: { Wood: 199 } },
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
