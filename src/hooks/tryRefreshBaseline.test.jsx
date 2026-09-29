import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useModalHandlers } from "./useModalHandlers.js";
import { writeTryitSnapshot, readTryitSnapshot } from "../tryitStorage.js";

const config = { boostTables: ["nft"], itemTables: { xspottry: { sources: ["itables.it"], field: "spottry", baseField: "spot" } } };
let root, container, api;
function context() {
  const farm = { frmid: 901, boostables: { nft: { A: { isactive: 0, tryit: 1 } } },
    itables: { it: { Sunflower: { spot: 2, spottry: 7, yield: 1 } } },
    ftrades: { sale: { item: "Wood" } }, ftradesHeader: { count: 1 } };
  return { data: { options: { farmId: 901 } }, farm: { current: farm }, publish: jest.fn(),
    cookie: jest.fn(), deliveries: jest.fn(), show: jest.fn(), sections: { current: {} },
    tables: { current: {} }, coverage: { current: null }, deliverySync: { current: null },
    prices: jest.fn().mockResolvedValue({}), outcome: jest.fn(), bumpPulse: jest.fn().mockReturnValue(5),
    tryPayload: () => ({ tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } }) };
}
function Harness({ state, tryConfig = config }) {
  api = useModalHandlers(state.data, state.farm, state.publish, state.cookie, state.deliveries,
    state.show, state.show, state.tryPayload, tryConfig, state.sectionKeys || {}, state.sectionPaths || {}, state.sections, state.tables,
    state.coverage, state.deliverySync, 0, state.bumpPulse, { selectedInv: "home" }, { home: ["core", "home"] }, "901", state.prices, state.outcome);
  return null;
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear();
  writeTryitSnapshot({ nft: { A: 1 }, xspottry: { Sunflower: 7 } }, "901");
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.restoreAllMocks(); });

test("Try refresh keeps saved selection and trades while applying calculated values and received hashes", async () => {
  const state = context(); const before = readTryitSnapshot("901");
  const oldTrades = state.farm.current.ftrades;
  await act(async () => root.render(<Harness state={state} />));
  await act(async () => api.handleRefreshfTNFT(state.data, {
    frmid: 901, ftrades: { stale: {} }, ftradesHeader: { count: 0 },
    itables: { it: { Sunflower: { yield: 2, spottry: 0 } } },
    boostables: { nft: { A: { isactive: 0, tryit: 0 } } },
    sectionHashes: { inventory: "s2" }, tableHashes: { "itables.it": "t2", "itables.food": "not-received" },
  }, { markTryitSynced: true }));
  expect(state.farm.current.itables.it.Sunflower).toMatchObject({ yield: 2, spottry: 7 });
  expect(state.farm.current.boostables.nft.A.tryit).toBe(1);
  expect(state.farm.current.ftrades).toEqual(oldTrades);
  expect(state.sections.current.inventory).toBe("s2");
  expect(state.tables.current).toEqual({ "itables.it": "t2" });
  expect(readTryitSnapshot("901")).toEqual(before);
  expect(state.cookie).toHaveBeenCalledTimes(1);
  expect(state.coverage.current.farmId).toBe("901");
  expect(state.prices).not.toHaveBeenCalled();
});

test("missing trades schedules a supplemental request; invalid Try config blocks publication and persistence", async () => {
  const state = context(); delete state.farm.current.ftrades; delete state.farm.current.ftradesHeader;
  await act(async () => root.render(<Harness state={state} />));
  await act(async () => api.handleRefreshfTNFT(state.data, { frmid: 901, homeData: { amount: 0 } }));
  expect(state.prices).toHaveBeenCalledWith(false, true, ["trades"]);
  state.publish.mockClear(); state.cookie.mockClear();
  jest.spyOn(console, "error").mockImplementation(() => {});
  await act(async () => root.render(<Harness state={state} tryConfig={{}} />));
  await act(async () => api.handleRefreshfTNFT(state.data, { frmid: 902 }));
  expect(state.publish).not.toHaveBeenCalled(); expect(state.cookie).not.toHaveBeenCalled();
  expect(state.farm.current.frmid).toBe(901);
});

test.each(["ignored", "error"])("supplemental Trades %s return does not mark modal sync", async kind => {
  const state = context();
  delete state.farm.current.ftrades;
  delete state.farm.current.ftradesHeader;
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  state.prices.mockImplementation(() => kind === "error"
    ? Promise.reject(new Error("offline"))
    : Promise.resolve(state.farm.current));
  try {
    await act(async () => root.render(<Harness state={state} />));
    await act(async () => {
      api.handleRefreshfTNFT(state.data, { frmid: 901, homeData: { amount: 3 } });
      await Promise.resolve();
    });
    expect(state.prices).toHaveBeenCalledWith(false, true, ["trades"]);
    expect(state.coverage.current).toBeNull();
    expect(state.deliverySync.current).toBeNull();
    expect(state.farm.current.homeData.amount).toBe(3);
    expect(state.cookie).toHaveBeenCalledTimes(1);
  } finally {
    log.mockRestore();
  }
});

test("TryNFT close requests missing Trades without treating their legacy return as sync", async () => {
  const state = context();
  delete state.farm.current.ftrades;
  delete state.farm.current.ftradesHeader;
  state.outcome.mockResolvedValue({ status: "ignored", requestedFarmId: "901", requestedPage: "home" });
  state.prices.mockResolvedValue(state.farm.current);
  await act(async () => root.render(<Harness state={state} />));
  await act(async () => api.handleClosefTNFT(state.data, { frmid: 901, homeData: { amount: 4 } }));
  expect(state.prices).toHaveBeenCalledWith(false, true, ["trades"]);
  expect(state.coverage.current).toBeNull();
  expect(state.deliverySync.current).toBeNull();
  expect(state.farm.current.homeData.amount).toBe(4);
  expect(state.show).toHaveBeenCalledWith(false);
});

test.each(["ignored", "unavailable", "incomplete", "rejected-delta", "applied"])(
  "TryNFT open marks coverage only for a complete current outcome (%s)", async kind => {
    const state = context();
    state.farm.current.farmMeta = {};
    state.farm.current.homeData = {};
    state.farm.current.itables.it.Sunflower.pcost = 0;
    state.farm.current.itables.it.Sunflower.dailysfl = 0;
    state.sectionKeys = { core: ["farmMeta"], home: ["homeData"], boosts: ["boostables"], inventory: ["itables"] };
    state.sectionPaths = { boosts: ["boostables.nft"], inventory: ["itables.it"] };
    const requestedSections = ["boosts", "inventory", "core", "home"];
    state.outcome.mockResolvedValue({
      status: kind === "ignored" ? "ignored" : kind === "unavailable" ? "unavailable" : "applied",
      requestedFarmId: "901", requestedPage: "home", requestedSections,
      confirmedSections: kind === "incomplete" ? ["boosts", "core", "home"] : requestedSections,
      rejectedTablePaths: kind === "rejected-delta" ? ["itables.it"] : [],
      farm: state.farm.current,
    });
    await act(async () => root.render(<Harness state={state} />));
    await act(async () => api.handleButtonfTNFTClick());
    expect(state.outcome).toHaveBeenCalledWith(false, true, requestedSections, true, "home", true, "TRYNFT_OPEN_TRY_SYNC");
    expect(state.prices).not.toHaveBeenCalled();
    expect(state.coverage.current?.farmId === "901").toBe(kind === "applied");
    expect(state.show).toHaveBeenCalledWith(true);
  }
);

test.each(["ignored", "unavailable", "incomplete", "rejected-delta", "applied"])(
  "TryNFT close marks Delivery only after a complete current refresh (%s)", async kind => {
    const state = context(); const beforeSnapshot = readTryitSnapshot("901");
    state.farm.current.farmMeta = {};
    state.farm.current.homeData = {};
    state.farm.current.orderstable = { orders: {}, chores: {}, bounties: {} };
    state.farm.current.deliveryData = {};
    state.sectionKeys = { core: ["farmMeta"], home: ["homeData"], orders: ["orderstable"], deliverypage: ["deliveryData"] };
    const requestedSections = ["core", "home", "orders", "deliverypage"];
    state.outcome.mockResolvedValue({
      status: kind === "ignored" ? "ignored" : kind === "unavailable" ? "unavailable" : "applied",
      requestedFarmId: "901", requestedPage: "home", requestedSections,
      confirmedSections: kind === "incomplete" ? ["core", "home", "orders"] : requestedSections,
      rejectedTablePaths: kind === "rejected-delta" ? ["itables.it"] : [],
    });
    await act(async () => root.render(<Harness state={state} />));
    await act(async () => api.handleClosefTNFT(state.data, { frmid: 901, homeData: { amount: 2 } }));
    expect(state.outcome).toHaveBeenCalledWith(false, false, requestedSections, true, "home", true, "TRYNFT_CLOSE");
    expect(state.prices).not.toHaveBeenCalled();
    expect(state.deliverySync.current).toEqual(kind === "applied" ? { farmId: "901", pulse: 5 } : null);
    expect(state.farm.current.homeData.amount).toBe(2);
    expect(state.cookie).toHaveBeenCalledTimes(1);
    expect(readTryitSnapshot("901")).toEqual(beforeSnapshot);
    expect(state.show).toHaveBeenCalledWith(false);
  }
);

test.each(["farm", "tryset"])("TryNFT close does not mark Delivery after a pending %s change", async change => {
  const state = context(); let resolveOutcome;
  state.farm.current.farmMeta = {};
  state.farm.current.homeData = {};
  state.farm.current.orderstable = { orders: {}, chores: {}, bounties: {} };
  state.farm.current.deliveryData = {};
  state.sectionKeys = { core: ["farmMeta"], home: ["homeData"], orders: ["orderstable"], deliverypage: ["deliveryData"] };
  state.selection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  state.tryPayload = () => state.selection;
  state.outcome.mockImplementation(() => new Promise(resolve => { resolveOutcome = resolve; }));
  await act(async () => root.render(<Harness state={state} />));
  let pending;
  await act(async () => { pending = api.handleClosefTNFT(state.data, { frmid: 901, homeData: { amount: 2 } }); });
  const nextFarm = change === "farm" ? { ...state.farm.current, frmid: 902 } : state.farm.current;
  if (change === "farm") state.farm.current = nextFarm;
  else state.selection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 2 } } };
  await act(async () => {
    resolveOutcome({ status: "applied", requestedFarmId: "901", requestedPage: "home",
      requestedSections: ["core", "home", "orders", "deliverypage"],
      confirmedSections: ["core", "home", "orders", "deliverypage"], rejectedTablePaths: [] });
    await pending;
  });
  expect(state.deliverySync.current).toBeNull();
  expect(state.farm.current).toBe(nextFarm);
  expect(state.show).toHaveBeenCalledWith(false);
});

test("TryNFT close keeps its local save and closes after a refresh error", async () => {
  const state = context();
  jest.spyOn(console, "log").mockImplementation(() => {});
  state.outcome.mockRejectedValue(new Error("offline"));
  await act(async () => root.render(<Harness state={state} />));
  await act(async () => api.handleClosefTNFT(state.data, { frmid: 901, homeData: { amount: 2 } }));
  expect(state.cookie).toHaveBeenCalledTimes(1);
  expect(state.farm.current.homeData.amount).toBe(2);
  expect(state.deliverySync.current).toBeNull();
  expect(state.show).toHaveBeenCalledWith(false);
});

test("TryNFT preload cannot mark a farm or Tryset changed while its request was pending", async () => {
  const state = context(); let resolveOutcome;
  state.farm.current.farmMeta = {};
  state.farm.current.homeData = {};
  state.farm.current.itables.it.Sunflower.pcost = 0;
  state.farm.current.itables.it.Sunflower.dailysfl = 0;
  state.sectionKeys = { core: ["farmMeta"], home: ["homeData"], boosts: ["boostables"], inventory: ["itables"] };
  state.sectionPaths = { boosts: ["boostables.nft"], inventory: ["itables.it"] };
  state.selection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  state.tryPayload = () => state.selection;
  state.outcome.mockImplementation(() => new Promise(resolve => { resolveOutcome = resolve; }));
  await act(async () => root.render(<Harness state={state} />));
  let pending;
  await act(async () => { pending = api.handleButtonfTNFTClick(); });
  const originalFarm = state.farm.current;
  state.selection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 2 } } };
  await act(async () => {
    resolveOutcome({ status: "applied", requestedFarmId: "901", requestedPage: "home",
      requestedSections: ["boosts", "inventory", "core", "home"],
      confirmedSections: ["boosts", "inventory", "core", "home"], rejectedTablePaths: [], farm: originalFarm });
    await pending;
  });
  expect(state.coverage.current).toBeNull();
  expect(state.show).toHaveBeenCalledWith(true);

  state.selection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  await act(async () => { pending = api.handleButtonfTNFTClick(); });
  const nextFarm = { ...originalFarm, frmid: 902 };
  state.farm.current = nextFarm;
  await act(async () => {
    resolveOutcome({ status: "applied", requestedFarmId: "901", requestedPage: "home",
      requestedSections: ["boosts", "inventory", "core", "home"],
      confirmedSections: ["boosts", "inventory", "core", "home"], rejectedTablePaths: [], farm: originalFarm });
    await pending;
  });
  expect(state.coverage.current).toBeNull();
  expect(state.farm.current).toBe(nextFarm);
});

test.each(["ignored", "unavailable", "incomplete", "rejected-delta", "applied"])(
  "Delivery open marks sync only for a complete current outcome (%s)", async kind => {
    const state = context();
    state.farm.current.orderstable = { orders: {}, chores: {}, bounties: {} };
    state.farm.current.deliveryData = {};
    state.sectionKeys = { orders: ["orderstable"], deliverypage: ["deliveryData"] };
    const requestedSections = ["orders", "deliverypage"];
    state.outcome.mockResolvedValue({
      status: kind === "ignored" ? "ignored" : kind === "unavailable" ? "unavailable" : "applied",
      requestedFarmId: "901", requestedPage: "delivery", requestedSections,
      confirmedSections: kind === "incomplete" ? ["orders"] : requestedSections,
      rejectedTablePaths: kind === "rejected-delta" ? ["itables.it"] : [],
      farm: state.farm.current,
    });
    await act(async () => root.render(<Harness state={state} />));
    await act(async () => api.handleButtonfDlvrClick());
    expect(state.outcome).toHaveBeenCalledWith(false, true, requestedSections, false, "delivery", true);
    expect(state.prices).not.toHaveBeenCalled();
    expect(state.deliverySync.current?.farmId === "901").toBe(kind === "applied");
    expect(state.show).toHaveBeenCalledWith(true);
  }
);
