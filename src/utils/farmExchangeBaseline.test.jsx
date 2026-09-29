import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useFarmLoader } from "../hooks/useFarmLoader.js";
import { useDataFetcher } from "../hooks/useDataFetcher.js";
import { useSectionLoader } from "../hooks/useSectionLoader.js";
import { createOptionHandlers } from "../handlers/optionHandlers.js";
import { hasPathData, hasSectionData } from "./farmState.js";
import { fetchJson, fetchJsonResponse } from "../services/apiClient.js";

jest.mock("../services/apiClient.js", () => ({ fetchJson: jest.fn(), fetchJsonResponse: jest.fn() }));

const config = { boostTables: ["nft"], itemTables: { xfarmit: { sources: ["itables.it"], field: "farmit", baseField: "farmit" } } };
const copy = (value) => JSON.parse(JSON.stringify(value));
const packet = () => ({
  frmid: 901, username: "Synthetic 901", isabo: true, aboLifetime: false, tryitRevision: 1,
  farmMeta: { updated: 1790500000000, balance: { sfl: 12, coins: 250 }, tradeTax: 10, vip: false },
  Bumpkin: [{ lvl: 1 }], constants: {},
  itables: { it: { Sunflower: { instock: 0, yield: 1, pcost: 0, dailysfl: 0, farmit: 1 } } },
  boostables: { nft: { A: { isactive: 0, tryit: 0 } } },
  homeData: { amount: 0, _source: { section: "home", contentHash: "home-v1" } },
  sectionHashes: { home: "section-v1" }, tableHashes: { "itables.it": "table-v1" },
});

function context(initialFarm = {}) {
  const state = { farm: copy(initialFarm), ui: { selectedInv: "home", TryChecked: false },
    dataSet: { options: { farmId: 901, tradeTax: 10, coinsRatio: 1000, gemsRatio: 0.07, usdSfl: 0.1 } },
    farmRef: { current: copy(initialFarm) }, sections: { current: {} }, tables: { current: {} }, trades: { current: {} },
    busy: { current: false }, intentRef: { current: 0 },
    farmIdentityIntentRef: { current: { revision: 0, pending: false } }, setters: {} };
  for (const name of ["prices", "meta", "bumpkin", "request", "options", "loading", "mutants", "deliveries", "cookie"]) state.setters[name] = jest.fn();
  state.setters.farm = jest.fn((next) => {
    state.farm = typeof next === "function" ? next(state.farm) : next;
    state.farmRef.current = state.farm;
  });
  state.synced = () => state.syncedPulse || 0;
  state.trySelection = { tryitMode: "active", tryitarrays: {} };
  state.tryPayload = () => state.trySelection;
  return state;
}

let root, container, api;
function Loader({ state }) {
  api = useFarmLoader("", { current: "901" }, state.farmRef, state.sections, state.tables, state.trades,
    { current: 0 }, { current: false }, { current: [] }, state.tryPayload, config, jest.fn(), state.dataSet, state.ui,
    state.setters.farm, state.setters.meta, state.setters.bumpkin, state.farmIdentityIntentRef);
  state.loader = api;
  return null;
}
function Fetcher({ state }) {
  api = useDataFetcher("", state.ui, state.dataSet, state.farmRef, state.sections, state.tables, state.trades,
    { current: "baseline-device" }, state.busy, state.setters.prices, state.setters.meta, state.setters.bumpkin,
    state.setters.farm, state.setters.request, state.setters.options, state.setters.loading, state.setters.mutants,
    state.setters.deliveries, state.setters.cookie, {}, "", { home: ["home"] },
    state.sectionPayloadKeys || { home: ["homeData"], core: ["farmMeta"] }, state.sectionTablePaths || {},
    state.tryConfig === undefined ? config : state.tryConfig, state.tryPayload, hasSectionData, hasPathData, false,
    state.intentRef, state.farmIdentityIntentRef);
  state.fetcher = api;
  return null;
}

function SectionCaller({ state }) {
  state.sectionCaller = useSectionLoader(state.ui, state.farm, state.farmRef,
    { home: ["home"] }, { home: ["homeData"] }, {}, state.busy,
    3, state.mark, state.synced, state.tryPayload, state.fetcher.getPricesWithOutcome);
  return null;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  fetchJson.mockReset(); fetchJsonResponse.mockReset();
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.useRealTimers(); jest.restoreAllMocks(); });

test("initial load and refresh preserve the same received farm values with their distinct HTTP envelopes", async () => {
  const loaded = context();
  fetchJsonResponse.mockResolvedValue({ response: { status: 200 }, data: packet() });
  await act(async () => root.render(<Loader state={loaded} />));
  await act(async () => api.loadFarm("901", ["home"], "manualLoad", loaded.ui, loaded.dataSet, "baseline-device"));
  expect(fetchJsonResponse.mock.calls[0][1]).toBe("/getfarm");
  expect(fetchJsonResponse.mock.calls[0][2].body).toMatchObject({ frmid: "901", include: ["home"], context: "manualLoad" });

  const refreshed = context();
  fetchJson.mockResolvedValue({ priceData: [0, 0, 0.1], allData: packet() });
  await act(async () => root.render(<Fetcher state={refreshed} />));
  await act(async () => api.getPrices(false));
  expect(fetchJson.mock.calls[0][1]).toBe("/getdatacrypto");
  expect(fetchJson.mock.calls[0][2].body).toMatchObject({ frmid: 901, mode: "refresh", capabilities: { tableEntryDeltas: 1 } });
  for (const state of [loaded, refreshed]) {
    expect(state.farm.frmid).toBe(901);
    expect(state.farm.itables.it.Sunflower).toMatchObject({ instock: 0, yield: 1, pcost: 0, dailysfl: 0 });
    expect(state.farm.homeData.amount).toBe(0);
    expect(state.tables.current["itables.it"]).toBe("table-v1");
    expect(state.sections.current.home).toBe("section-v1");
    expect(state.dataSet.balance).toBe(12);
    expect(state.dataSet.coins).toBe(250);
  }
  expect(refreshed.farm.homeData).toEqual(loaded.farm.homeData);
});

test("navigation with a current local projection does not request the server", async () => {
  const state = context(packet());
  await act(async () => root.render(<Fetcher state={state} />));
  await act(async () => api.getPrices(false, true));
  expect(fetchJson).not.toHaveBeenCalled();
});

test("initial load retries HTTP 202 using the server delay before publishing", async () => {
  jest.useFakeTimers();
  const state = context();
  fetchJsonResponse.mockResolvedValueOnce({ response: { status: 202, headers: { get: () => "1000" } }, data: {} })
    .mockResolvedValueOnce({ response: { status: 200 }, data: packet() });
  await act(async () => root.render(<Loader state={state} />));
  let pending;
  await act(async () => { pending = api.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  expect(state.setters.farm).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1000); await pending; });
  expect(fetchJsonResponse).toHaveBeenCalledTimes(2);
  expect(state.farm.frmid).toBe(901);
});

test("202 retries send the same captured options and Tryset body", async () => {
  jest.useFakeTimers();
  const state = context(packet()); const bodies = [];
  state.trySelection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  fetchJsonResponse.mockImplementation(async (_url, _path, request) => {
    bodies.push(copy(request.body));
    return bodies.length === 1
      ? { response: { status: 202, headers: { get: () => "1000" } }, data: {} }
      : { response: { status: 200 }, data: packet() };
  });
  await act(async () => root.render(<Loader state={state} />));
  let pending;
  await act(async () => { pending = api.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  await act(async () => { jest.advanceTimersByTime(1000); await pending; });
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
});

test("initial load preserves the not-found error contract without publishing", async () => {
  const state = context();
  fetchJsonResponse.mockRejectedValue({ status: 404, message: "No farmData found for input" });
  await act(async () => root.render(<Loader state={state} />));
  let result;
  await act(async () => { result = await api.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  expect(result).toMatchObject({ success: false, error: "ID not found" });
  expect(state.setters.farm).not.toHaveBeenCalled();
});

test.each(["replace", "mutate"])("202 retries stop when calculation options change (%s)", async change => {
  jest.useFakeTimers();
  const state = context(packet()); const bodies = [];
  fetchJsonResponse.mockImplementation(async (_url, _path, request) => {
    bodies.push(copy(request.body));
    return bodies.length === 1
      ? { response: { status: 202, headers: { get: () => "1000" } }, data: {} }
      : { response: { status: 200 }, data: packet() };
  });
  await act(async () => root.render(<Loader state={state} />));
  let pending;
  await act(async () => { pending = api.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  if (change === "replace") state.dataSet.options = { ...state.dataSet.options, tradeTax: 20 };
  else state.dataSet.options.tradeTax = 20;
  await act(async () => { jest.advanceTimersByTime(1000); await pending; });
  expect(bodies.map(body => body.options.tradeTax)).toEqual([10]);
  expect(state.setters.farm).not.toHaveBeenCalled();
});

test("a loader's 202 retry does not overwrite a refresh published during the wait", async () => {
  jest.useFakeTimers();
  const state = context(packet());
  fetchJsonResponse.mockResolvedValueOnce({ response: { status: 202, headers: { get: () => "1000" } }, data: {} })
    .mockResolvedValueOnce({ response: { status: 200 }, data: packet() });
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  let pending;
  await act(async () => { pending = state.loader.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  const fresh = packet(); fresh.itables.it.Sunflower.instock = 7;
  fetchJson.mockResolvedValue({ priceData: [], allData: fresh });
  await act(async () => state.fetcher.getPrices(false));
  expect(state.farm.itables.it.Sunflower.instock).toBe(7);
  await act(async () => { jest.advanceTimersByTime(1000); await pending; });
  expect(state.farm.itables.it.Sunflower.instock).toBe(7);
  expect(fetchJsonResponse).toHaveBeenCalledTimes(1);
});

test.each(["901", "Synthetic 901"])("loader accepts ID/username input %s resolving to the same numeric farm", async input => {
  const state = context(packet());
  fetchJsonResponse.mockResolvedValue({ response: { status: 200 }, data: packet() });
  await act(async () => root.render(<Loader state={state} />));
  let result;
  await act(async () => { result = await api.loadFarm(input, ["home"], "manualLoad", state.ui, state.dataSet); });
  expect(fetchJsonResponse.mock.calls[0][2].body.frmid).toBe(input);
  expect(result).toMatchObject({ success: true, mergedFarm: { frmid: 901 } });
  expect(state.dataSet.options.farmId).toBe(901);
});

test("numeric loader rejects a response for a different numeric farm", async () => {
  const state = context(packet()); const wrong = packet(); wrong.frmid = 902;
  fetchJsonResponse.mockResolvedValue({ response: { status: 200 }, data: wrong });
  await act(async () => root.render(<Loader state={state} />));
  let result;
  await act(async () => { result = await api.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  expect(result).toMatchObject({ success: false, error: "Farm ID mismatch" });
  expect(state.setters.farm).not.toHaveBeenCalled();
  expect(state.dataSet.options.farmId).toBe(901);
});

test("202 retries stop after five additional attempts without publishing", async () => {
  jest.useFakeTimers();
  const state = context();
  fetchJsonResponse.mockResolvedValue({ response: { status: 202, headers: { get: () => "1000" } }, data: {} });
  await act(async () => root.render(<Loader state={state} />));
  let pending;
  await act(async () => { pending = api.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  for (let retry = 0; retry < 5; retry++) await act(async () => { jest.advanceTimersByTime(1000); });
  let result;
  await act(async () => { result = await pending; });
  expect(fetchJsonResponse).toHaveBeenCalledTimes(6);
  expect(result).toMatchObject({ success: false, error: "ID not found" });
  expect(state.setters.farm).not.toHaveBeenCalled();
});

test("a real rejected Try refresh does not mark the section caller synchronized", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); state.mark = jest.fn(); let complete;
  fetchJson.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<><Fetcher state={state} /><SectionCaller state={state} /></>));
  expect(fetchJson).toHaveBeenCalledTimes(1);
  state.trySelection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  await act(async () => complete({ priceData: [], allData: packet() }));
  expect(state.setters.farm).not.toHaveBeenCalled();
  expect(state.mark).not.toHaveBeenCalled();
});

test("two refreshes resolving out of order only publish the newest request", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet());
  const resolvers = [];
  fetchJson.mockImplementation(() => new Promise((done) => { resolvers.push(done); }));
  await act(async () => root.render(<Fetcher state={state} />));
  const older = api.getPrices(false);
  const newer = api.getPrices(false);
  const newestPacket = packet(); newestPacket.itables.it.Sunflower.instock = 7;
  await act(async () => { resolvers[1]({ priceData: [0, 0, 0.1], allData: newestPacket }); await newer; });
  await act(async () => { resolvers[0]({ priceData: [0, 0, 0.1], allData: packet() }); await older; });
  expect(state.farm.itables.it.Sunflower.instock).toBe(7);
  expect(state.setters.farm).toHaveBeenCalledTimes(1);
  expect(state.busy.current).toBe(false);
});

test("refresh response for a previous farm cannot publish into the current farm", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet());
  let resolve;
  fetchJson.mockImplementation(() => new Promise((done) => { resolve = done; }));
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = api.getPrices(false);
  state.farmRef.current = { frmid: 902 };
  await act(async () => { resolve({ priceData: [0, 0, 0.1], allData: packet() }); await pending; });
  expect(state.setters.farm).not.toHaveBeenCalled();
  expect(state.setters.meta).not.toHaveBeenCalled();
  expect(state.busy.current).toBe(false);
});

test("refresh response for an older Tryset cannot publish after the selection changes", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet());
  let resolve;
  fetchJson.mockImplementation(() => new Promise((done) => { resolve = done; }));
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = api.getPrices(false);
  state.trySelection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  await act(async () => { resolve({ priceData: [0, 0, 0.1], allData: packet() }); await pending; });
  expect(state.setters.farm).not.toHaveBeenCalled();
  expect(state.setters.meta).not.toHaveBeenCalled();
  expect(state.busy.current).toBe(false);
});

test("refresh for the previous farm is rejected after the loader publishes a new farm", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let complete;
  fetchJson.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  const pending = state.fetcher.getPrices(false);
  const nextFarm = packet(); nextFarm.frmid = 902;
  fetchJsonResponse.mockResolvedValue({ response: { status: 200 }, data: nextFarm });
  await act(async () => state.loader.loadFarm("902", ["home"], "manualLoad", state.ui, state.dataSet));
  await act(async () => { complete({ priceData: [0, 0, 0.1], allData: packet() }); await pending; });
  expect(state.farm.frmid).toBe(902);
  expect(state.setters.farm).toHaveBeenCalledTimes(1);
});

test("late loader for the same farm does not overwrite a newer refresh", async () => {
  const state = context(packet()); let complete;
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  let pending;
  await act(async () => { pending = state.loader.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  const fresh = packet(); fresh.itables.it.Sunflower.instock = 7;
  fetchJson.mockResolvedValue({ priceData: [0, 0, 0.1], allData: fresh });
  await act(async () => state.fetcher.getPrices(false));
  expect(state.farm.itables.it.Sunflower.instock).toBe(7);
  await act(async () => { complete({ response: { status: 200 }, data: packet() }); await pending; });
  expect(state.farm.itables.it.Sunflower.instock).toBe(7);
});

test("a newer farm load supersedes an older response before metadata or hashes publish", async () => {
  const state = context(packet()); const pendingResponses = [];
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => pendingResponses.push(resolve)));
  await act(async () => root.render(<Loader state={state} />));
  let older, newer;
  await act(async () => { older = api.loadFarm("Synthetic 901", ["home"], "manualLoad", state.ui, state.dataSet); });
  await act(async () => { newer = api.loadFarm("902", ["home"], "manualLoad", state.ui, state.dataSet); });
  const nextFarm = packet(); nextFarm.frmid = 902;
  await act(async () => { pendingResponses[1]({ response: { status: 200 }, data: nextFarm }); await newer; });
  let stale;
  await act(async () => { pendingResponses[0]({ response: { status: 200 }, data: packet() }); stale = await older; });
  expect(stale).toMatchObject({ success: false, stale: true });
  expect(state.farm.frmid).toBe(902);
  expect(state.setters.farm).toHaveBeenCalledTimes(1);
  expect(state.setters.meta).toHaveBeenCalledTimes(1);
});

test("legacy facade returns the current farm when an old option response is ignored", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let complete;
  fetchJson.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = state.fetcher.getPrices(false);
  const handlers = createOptionHandlers(state.dataSet, state.setters.options, jest.fn(),
    () => { state.intentRef.current += 1; });
  handlers.handleOptionChange({ target: { name: "tradeTax", value: 20 } });
  await act(async () => root.render(<Fetcher state={state} />));
  let result;
  await act(async () => { complete({ priceData: [0, 0, 0.1], allData: packet() }); result = await pending; });
  expect(result).toBe(state.farmRef.current);
  expect(state.setters.farm).not.toHaveBeenCalled();
  expect(state.farm.itables.it.Sunflower.instock).toBe(0);
});

test.each(["replace", "mutate"])("old serialized refresh is ignored after intentional option %s", async change => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const bodies = []; let complete;
  fetchJson.mockImplementation((_url, _path, request) => {
    bodies.push(copy(request.body));
    return new Promise(resolve => { complete = resolve; });
  });
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = state.fetcher.getPricesWithOutcome(false);
  const handlers = createOptionHandlers(state.dataSet, state.setters.options, jest.fn(),
    () => { state.intentRef.current += 1; });
  if (change === "replace") handlers.handleOptionChange({ target: { name: "animalLvl_Chicken", value: 8 } });
  else handlers.handleOptionChange({ target: { name: "tradeTax", value: 20 } });
  await act(async () => root.render(<Fetcher state={state} />));
  expect(bodies[0].options.tradeTax).toBe(10);
  expect(bodies[0].options.animalLvl).toBeUndefined();
  expect(state.intentRef.current).toBe(1);
  let result;
  await act(async () => { complete({ priceData: [0, 0, 0.1], allData: packet() }); result = await pending; });
  expect(result).toMatchObject({ status: "ignored", reason: "options" });
  expect(state.setters.farm).not.toHaveBeenCalled();
  expect(state.setters.prices).not.toHaveBeenCalled();
  expect(state.dataSet.options[change === "replace" ? "animalLvl" : "tradeTax"])
    .toEqual(change === "replace" ? { Chicken: 8 } : 20);
});

test("characterization: refresh may update derived price and ratio options on reception", async () => {
  const state = context(packet()); const bodies = [];
  state.dataSet.options.autoCoinRatio = true;
  fetchJson.mockImplementation(async (_url, _path, request) => {
    bodies.push(copy(request.body));
    return { priceData: [0, 0, 0.2], allData: { ...packet(), bestCoinRatio: { ratio: 1200 } } };
  });
  await act(async () => root.render(<Fetcher state={state} />));
  let result;
  await act(async () => { result = await state.fetcher.getPricesWithOutcome(false); });
  expect(result.status).toBe("applied");
  expect(bodies[0].options).toMatchObject({ usdSfl: 0.1, coinsRatio: 1000 });
  expect(state.dataSet.options).toMatchObject({ usdSfl: 0.2, coinsRatio: 1200 });
  expect(state.setters.options).toHaveBeenCalled();
  expect(state.setters.farm).toHaveBeenCalledTimes(1);
});

test("UI notification choices do not invalidate a pending calculation", async () => {
  const state = context(packet()); const bodies = []; let complete;
  fetchJson.mockImplementation((_url, _path, request) => {
    bodies.push(copy(request.body));
    return new Promise(resolve => { complete = resolve; });
  });
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = state.fetcher.getPricesWithOutcome(false);
  const handlers = createOptionHandlers(state.dataSet, state.setters.options, jest.fn(),
    () => { state.intentRef.current += 1; });
  handlers.handleOptionChange([["Sunflower", true]]);
  let result;
  await act(async () => { complete({ priceData: [0, 0, 0.1], allData: packet() }); result = await pending; });
  expect(bodies[0].options.notifList).toBeUndefined();
  expect(state.intentRef.current).toBe(0);
  expect(result.status).toBe("applied");
  expect(state.setters.farm).toHaveBeenCalledTimes(1);
});

test("old Try season response is ignored after season changes", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const bodies = []; let complete;
  state.ui.selectedTrySeason = "spring";
  fetchJson.mockImplementation((_url, _path, request) => {
    bodies.push(copy(request.body));
    return new Promise(resolve => { complete = resolve; });
  });
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = state.fetcher.getPricesWithOutcome(false);
  state.ui.selectedTrySeason = "summer";
  let result;
  await act(async () => { complete({ priceData: [0, 0, 0.1], allData: packet() }); result = await pending; });
  expect(bodies[0].selectedTrySeason).toBe("spring");
  expect(result).toMatchObject({ status: "ignored", reason: "options" });
  expect(state.setters.farm).not.toHaveBeenCalled();
});

test("replaced UI season rejects old response and a new request can publish", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const completes = [];
  state.ui.selectedTrySeason = "spring";
  fetchJson.mockImplementation(() => new Promise(resolve => completes.push(resolve)));
  await act(async () => root.render(<Fetcher state={state} />));
  const oldRequest = state.fetcher.getPricesWithOutcome(false);
  state.ui = { ...state.ui, selectedTrySeason: "summer" };
  state.intentRef.current += 1;
  await act(async () => root.render(<Fetcher state={state} />));
  let oldResult;
  await act(async () => { completes[0]({ priceData: [0, 0, 0.1], allData: packet() }); oldResult = await oldRequest; });
  expect(oldResult).toMatchObject({ status: "ignored", reason: "options" });
  const newRequest = state.fetcher.getPricesWithOutcome(false);
  let newResult;
  await act(async () => { completes[1]({ priceData: [0, 0, 0.1], allData: packet() }); newResult = await newRequest; });
  expect(fetchJson.mock.calls.map(([, , request]) => request.body.selectedTrySeason)).toEqual(["spring", "summer"]);
  expect(newResult.status).toBe("applied");
  expect(state.setters.farm).toHaveBeenCalledTimes(1);
});

test("new option request wins when old and new responses overlap", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const completes = []; const bodies = [];
  fetchJson.mockImplementation((_url, _path, request) => {
    bodies.push(copy(request.body));
    return new Promise(resolve => completes.push(resolve));
  });
  await act(async () => root.render(<Fetcher state={state} />));
  const oldRequest = state.fetcher.getPricesWithOutcome(false);
  const handlers = createOptionHandlers(state.dataSet, state.setters.options, jest.fn(),
    () => { state.intentRef.current += 1; });
  handlers.handleOptionChange({ target: { name: "tradeTax", value: 20 } });
  await act(async () => root.render(<Fetcher state={state} />));
  const newRequest = state.fetcher.getPricesWithOutcome(false);
  const newPacket = packet(); newPacket.itables.it.Sunflower.instock = 7;
  let newResult, oldResult;
  await act(async () => { completes[1]({ priceData: [0, 0, 0.1], allData: newPacket }); newResult = await newRequest; });
  await act(async () => { completes[0]({ priceData: [0, 0, 0.1], allData: packet() }); oldResult = await oldRequest; });
  expect(bodies.map(body => body.options.tradeTax)).toEqual([10, 20]);
  expect(newResult.status).toBe("applied");
  expect(oldResult.status).toBe("ignored");
  expect(state.farm.itables.it.Sunflower.instock).toBe(7);
  expect(state.setters.farm).toHaveBeenCalledTimes(1);
});

test("old option request error does not replace current request state", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let reject;
  fetchJson.mockImplementation(() => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }));
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = state.fetcher.getPricesWithOutcome(false);
  const handlers = createOptionHandlers(state.dataSet, state.setters.options, jest.fn(),
    () => { state.intentRef.current += 1; });
  handlers.handleOptionChange({ target: { name: "tradeTax", value: 20 } });
  let result;
  await act(async () => { reject(new Error("old request failed")); result = await pending; });
  expect(result).toMatchObject({ status: "ignored", reason: "options-error" });
  expect(state.setters.request).not.toHaveBeenCalledWith("Error : old request failed");
  expect(state.setters.farm).not.toHaveBeenCalled();
});

test("older Home and newer Trades both publish without losing either section", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const pendingResponses = [];
  fetchJson.mockImplementation(() => new Promise(resolve => pendingResponses.push(resolve)));
  await act(async () => root.render(<Fetcher state={state} />));
  const home = api.getPrices(false, true, ["home"], false, "home", true);
  const trades = api.getPrices(false, true, ["trades"], false, "activity", true);
  await act(async () => { pendingResponses[1]({ priceData: [], allData: { frmid: 901, ftrades: { sale: { item: "Wood" } } } }); await trades; });
  await act(async () => { pendingResponses[0]({ priceData: [], allData: { frmid: 901, homeData: { amount: 99 } } }); await home; });
  expect(state.farm.ftrades.sale.item).toBe("Wood");
  expect(state.farm.homeData.amount).toBe(99);
  expect(state.setters.farm).toHaveBeenCalledTimes(2);
});

test("older Inventory delta still applies after unrelated Trades", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const pendingResponses = [];
  state.sectionPayloadKeys = { inventory: ["itables"], trades: ["ftrades", "ftradesHeader"] };
  state.sectionTablePaths = { inventory: ["itables.it"] };
  state.tables.current = { "itables.it": "table-v1" };
  fetchJson.mockImplementation(() => new Promise(resolve => pendingResponses.push(resolve)));
  await act(async () => root.render(<Fetcher state={state} />));
  const inventory = api.getPricesWithOutcome(false, true, ["inventory"], false, "inv", true);
  const trades = api.getPricesWithOutcome(false, true, ["trades"], false, "activity", true);
  await act(async () => { pendingResponses[1]({ priceData: [], allData: { frmid: 901, ftrades: { sale: { item: "Wood" } } } }); await trades; });
  let oldResult;
  await act(async () => {
    pendingResponses[0]({ priceData: [], allData: {
      frmid: 901,
      _tableDeltas: { itables: { it: { baseHash: "table-v1", nextHash: "table-v2", upserts: { Sunflower: { instock: 7 } }, deletes: [] } } },
      tableHashes: { "itables.it": "table-v2" },
    } });
    oldResult = await inventory;
  });
  expect(oldResult.status).toBe("applied");
  expect(oldResult.rejectedTablePaths).toEqual([]);
  expect(state.farm.itables.it.Sunflower.instock).toBe(7);
  expect(state.tables.current["itables.it"]).toBe("table-v2");
  expect(state.farm.ftrades.sale.item).toBe("Wood");
});

test("partly superseded Home and Trades response publishes Home only", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const pendingResponses = [];
  state.sectionPayloadKeys = { home: ["homeData"], trades: ["ftrades", "ftradesHeader"] };
  fetchJson.mockImplementation(() => new Promise(resolve => pendingResponses.push(resolve)));
  await act(async () => root.render(<Fetcher state={state} />));
  const older = api.getPricesWithOutcome(false, true, ["home", "trades"], false, "home", true);
  const newer = api.getPricesWithOutcome(false, true, ["trades"], false, "activity", true);
  await act(async () => { pendingResponses[1]({ priceData: [], allData: { frmid: 901, ftrades: { sale: { item: "New" } } } }); await newer; });
  let result;
  await act(async () => {
    pendingResponses[0]({ priceData: [0, 0, 0.9], allData: {
      frmid: 901, homeData: { amount: 99 }, ftrades: { sale: { item: "Old" } },
      sectionHashes: { home: "home-v2", trades: "trades-old" },
      returnedSections: ["home", "trades"],
    } });
    result = await older;
  });
  expect(result.status).toBe("applied");
  expect(result.requestedSections).toEqual(["home", "trades"]);
  expect(result.confirmedSections).toEqual(["home"]);
  expect(state.farm.homeData.amount).toBe(99);
  expect(state.farm.ftrades.sale.item).toBe("New");
  expect(state.sections.current).toEqual({ home: "home-v2" });
  expect(state.setters.prices).toHaveBeenCalledTimes(1);
});

test("different section names sharing itables.it cannot publish an older table", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const pendingResponses = [];
  state.sectionPayloadKeys = { inventory: ["itables"], inv: ["invData", "itables"] };
  state.sectionTablePaths = { inventory: ["itables.it"], inv: ["itables.it"] };
  state.tables.current = { "itables.it": "table-v1" };
  fetchJson.mockImplementation(() => new Promise(resolve => pendingResponses.push(resolve)));
  await act(async () => root.render(<Fetcher state={state} />));
  const older = api.getPricesWithOutcome(false, true, ["inventory"], false, "inv", true);
  const newer = api.getPricesWithOutcome(false, true, ["inv"], false, "inv", true);
  const current = packet(); current.itables.it.Sunflower.instock = 9;
  current.tableHashes = { "itables.it": "table-v3" };
  await act(async () => { pendingResponses[1]({ priceData: [], allData: current }); await newer; });
  let result;
  await act(async () => {
    pendingResponses[0]({ priceData: [], allData: {
      frmid: 901, _tableDeltas: { itables: { it: { baseHash: "table-v1", nextHash: "table-v2",
        upserts: { Sunflower: { instock: 7 } }, deletes: [] } } },
      tableHashes: { "itables.it": "table-v2" },
    } });
    result = await older;
  });
  expect(result).toMatchObject({ status: "ignored", reason: "sequence" });
  expect(state.farm.itables.it.Sunflower.instock).toBe(9);
  expect(state.tables.current["itables.it"]).toBe("table-v3");
});

test("characterization: an older delta cannot replace a newer full version of the same table", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const pendingResponses = [];
  state.tables.current = { "itables.it": "table-v1" };
  fetchJson.mockImplementation(() => new Promise(resolve => pendingResponses.push(resolve)));
  await act(async () => root.render(<Fetcher state={state} />));
  const older = api.getPricesWithOutcome(false, true, ["inventory"], false, "inv", true);
  const newer = api.getPricesWithOutcome(false, true, ["inventory"], false, "inv", true);
  const current = packet(); current.itables.it.Sunflower.instock = 9;
  current.tableHashes = { "itables.it": "table-v3" };
  await act(async () => { pendingResponses[1]({ priceData: [], allData: current }); await newer; });
  let oldResult;
  await act(async () => {
    pendingResponses[0]({ priceData: [], allData: {
      frmid: 901,
      _tableDeltas: { itables: { it: { baseHash: "table-v1", nextHash: "table-v2", upserts: { Sunflower: { instock: 7 } }, deletes: [] } } },
      tableHashes: { "itables.it": "table-v2" },
    } });
    oldResult = await older;
  });
  expect(oldResult).toMatchObject({ status: "ignored", reason: "sequence" });
  expect(state.farm.itables.it.Sunflower.instock).toBe(9);
  expect(state.tables.current["itables.it"]).toBe("table-v3");
});

test.each(["902", "Synthetic 902"])("new farm intent %s rejects an old refresh before loader publication", async input => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let complete, completeLoad;
  fetchJson.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => { completeLoad = resolve; }));
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  const oldRefresh = state.fetcher.getPricesWithOutcome(false);
  let load;
  await act(async () => { load = state.loader.loadFarm(input, ["home"], "manualLoad", state.ui, state.dataSet); });
  let result;
  await act(async () => { complete({ priceData: [], allData: packet() }); result = await oldRefresh; });
  expect(result).toMatchObject({ status: "ignored", reason: "farm-intent" });
  expect(state.setters.farm).not.toHaveBeenCalled();
  expect(state.farm.frmid).toBe(901);
  await act(async () => { completeLoad({ response: { status: 404 }, data: {} }); await load; });
});

test.each(["901", "Synthetic 901"])("same farm load %s keeps an in-flight refresh valid", async input => {
  const state = context(packet());
  state.dataSet.options.username = "Synthetic 901";
  let complete, completeLoad;
  fetchJson.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => { completeLoad = resolve; }));
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  const refresh = state.fetcher.getPricesWithOutcome(false);
  let load;
  await act(async () => { load = state.loader.loadFarm(input, ["home"], "manualLoad", state.ui, state.dataSet); });
  const fresh = packet(); fresh.homeData.amount = 7;
  let result;
  await act(async () => { complete({ priceData: [], allData: fresh }); result = await refresh; });
  expect(result.status).toBe("applied");
  expect(state.farm.homeData.amount).toBe(7);
  expect(state.farmIdentityIntentRef.current.revision).toBe(0);
  await act(async () => { completeLoad({ response: { status: 404 }, data: {} }); await load; });
});

test("old farm network error is ignored while another farm loads", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let fail, completeLoad;
  fetchJson.mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => { completeLoad = resolve; }));
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  const refresh = state.fetcher.getPricesWithOutcome(false);
  let load;
  await act(async () => { load = state.loader.loadFarm("902", ["home"], "manualLoad", state.ui, state.dataSet); });
  let result;
  await act(async () => { fail(new Error("old farm offline")); result = await refresh; });
  expect(result).toMatchObject({ status: "ignored", reason: "farm-intent-error" });
  expect(state.setters.request).not.toHaveBeenCalledWith("Error : old farm offline");
  await act(async () => { completeLoad({ response: { status: 404 }, data: {} }); await load; });
});

test("failed new farm load releases the previous farm for a fresh refresh", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet());
  fetchJsonResponse.mockResolvedValue({ response: { status: 404 }, data: {} });
  fetchJson.mockResolvedValue({ priceData: [], allData: packet() });
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  let loadResult;
  await act(async () => { loadResult = await state.loader.loadFarm("Synthetic 902", ["home"], "manualLoad", state.ui, state.dataSet); });
  expect(loadResult.success).toBe(false);
  expect(state.farmIdentityIntentRef.current).toMatchObject({ revision: 1, pending: false });
  let refreshResult;
  await act(async () => { refreshResult = await state.fetcher.getPricesWithOutcome(false); });
  expect(refreshResult.status).toBe("applied");
  expect(state.farm.frmid).toBe(901);
});

test("refresh started during a new farm load cannot publish the old farm", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let completeLoad;
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => { completeLoad = resolve; }));
  fetchJson.mockResolvedValue({ priceData: [], allData: packet() });
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  let load;
  await act(async () => { load = state.loader.loadFarm("902", ["home"], "manualLoad", state.ui, state.dataSet); });
  let result;
  await act(async () => { result = await state.fetcher.getPricesWithOutcome(false); });
  expect(result).toMatchObject({ status: "ignored", reason: "farm-intent" });
  expect(state.setters.farm).not.toHaveBeenCalled();
  await act(async () => { completeLoad({ response: { status: 404 }, data: {} }); await load; });
});

test("section request during a new farm load cannot confirm old-farm coverage", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let completeLoad;
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => { completeLoad = resolve; }));
  fetchJson.mockResolvedValue({ priceData: [], allData: packet() });
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  let load;
  await act(async () => { load = state.loader.loadFarm("902", ["home"], "manualLoad", state.ui, state.dataSet); });
  let result;
  await act(async () => { result = await state.fetcher.getPricesWithOutcome(false, true, ["home"], false, "home", true, "SECTION_LOAD"); });
  expect(result).toMatchObject({ status: "ignored", reason: "farm-intent", requestedFarmId: "901", confirmedSections: [] });
  expect(state.setters.farm).not.toHaveBeenCalled();
  await act(async () => { completeLoad({ response: { status: 404 }, data: {} }); await load; });
});

test("returning to the current farm supersedes a pending different-farm intent", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const completeLoads = [];
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => completeLoads.push(resolve)));
  fetchJson.mockResolvedValue({ priceData: [], allData: packet() });
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  let oldLoad, currentLoad;
  await act(async () => { oldLoad = state.loader.loadFarm("902", ["home"], "manualLoad", state.ui, state.dataSet); });
  await act(async () => { currentLoad = state.loader.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  let refresh;
  await act(async () => { refresh = await state.fetcher.getPricesWithOutcome(false); });
  expect(refresh.status).toBe("applied");
  expect(state.farmIdentityIntentRef.current.pending).toBe(false);
  await act(async () => {
    completeLoads[0]({ response: { status: 404 }, data: {} });
    completeLoads[1]({ response: { status: 404 }, data: {} });
    await Promise.all([oldLoad, currentLoad]);
  });
});

test("a newer different-farm intent keeps an older loader from clearing its pending marker", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); const completeLoads = [];
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => completeLoads.push(resolve)));
  fetchJson.mockResolvedValue({ priceData: [], allData: packet() });
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  let oldLoad, newLoad;
  await act(async () => { oldLoad = state.loader.loadFarm("902", ["home"], "manualLoad", state.ui, state.dataSet); });
  await act(async () => { newLoad = state.loader.loadFarm("903", ["home"], "manualLoad", state.ui, state.dataSet); });
  await act(async () => { completeLoads[0]({ response: { status: 404 }, data: {} }); await oldLoad; });
  expect(state.farmIdentityIntentRef.current).toMatchObject({ revision: 2, pending: true, sourceFarmId: "901" });
  let refresh;
  await act(async () => { refresh = await state.fetcher.getPricesWithOutcome(false); });
  expect(refresh).toMatchObject({ status: "ignored", reason: "farm-intent" });
  await act(async () => { completeLoads[1]({ response: { status: 404 }, data: {} }); await newLoad; });
  expect(state.farmIdentityIntentRef.current.pending).toBe(false);
});

test("username load resolves to its numeric farm before an old refresh can publish", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let completeRefresh, completeLoad;
  fetchJson.mockImplementation(() => new Promise(resolve => { completeRefresh = resolve; }));
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => { completeLoad = resolve; }));
  await act(async () => root.render(<><Loader state={state} /><Fetcher state={state} /></>));
  const refresh = state.fetcher.getPricesWithOutcome(false);
  let load;
  await act(async () => { load = state.loader.loadFarm("Synthetic 902", ["home"], "manualLoad", state.ui, state.dataSet); });
  const nextFarm = packet(); nextFarm.frmid = 902; nextFarm.username = "Synthetic 902";
  await act(async () => { completeLoad({ response: { status: 200 }, data: nextFarm }); await load; });
  let result;
  await act(async () => { completeRefresh({ priceData: [], allData: packet() }); result = await refresh; });
  expect(result.status).toBe("ignored");
  expect(state.farm.frmid).toBe(902);
  expect(state.dataSet.options.username).toBe("Synthetic 902");
});

test("changing Tryset while a loader is pending rejects its calculated payload", async () => {
  const state = context(packet()); let complete;
  fetchJsonResponse.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<Loader state={state} />));
  let pending;
  await act(async () => { pending = api.loadFarm("901", ["home"], "manualLoad", state.ui, state.dataSet); });
  state.trySelection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  await act(async () => { complete({ response: { status: 200 }, data: packet() }); await pending; });
  expect(state.setters.farm).not.toHaveBeenCalled();
  expect(state.farm.itables.it.Sunflower.yield).toBe(1);
});

test("partial Home refresh preserves root tables, local choices and unrelated hashes", async () => {
  const state = context(packet()); state.farm.itables.it.Sunflower.farmit = 1;
  state.farmRef.current = state.farm;
  state.tables.current = { "itables.it": "table-v1" };
  state.sections.current = { home: "old-home", inventory: "old-inventory" };
  fetchJson.mockResolvedValue({ priceData: [0, 0, 0.1], allData: {
    frmid: 901, homeData: { amount: 0, _source: { contentHash: "home-v2" } },
    sectionHashes: { home: "section-v2" }, tableHashes: { "itables.food": "not-received" },
  } });
  await act(async () => root.render(<Fetcher state={state} />));
  await act(async () => api.getPrices(false));
  expect(state.farm.itables.it.Sunflower).toMatchObject({ farmit: 1, yield: 1 });
  expect(state.sections.current).toEqual({ home: "section-v2", inventory: "old-inventory" });
  expect(state.tables.current).toEqual({ "itables.it": "table-v1" });
  expect(state.farm.homeData._source.contentHash).toBe("home-v2");
});

test("rejected table delta clears relevant hashes so the following request can recover", async () => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
  const state = context(packet());
  state.tables.current = { "itables.it": "table-v1" };
  state.sections.current = { inventory: "inventory-v1" };
  fetchJson.mockResolvedValue({ priceData: [0, 0, 0.1], allData: {
    _tableDeltas: { itables: { it: { baseHash: "wrong", nextHash: "v2", upserts: { Sunflower: { yield: 99 } }, deletes: [] } } },
    sectionHashes: { inventory: "inventory-v2" }, tableHashes: { "itables.it": "v2" },
  } });
  // Same hook, with the actual section/table relationship needed for invalidation.
  function DeltaFetcher() {
    api = useDataFetcher("", state.ui, state.dataSet, state.farmRef, state.sections, state.tables, state.trades,
      { current: "baseline-device" }, state.busy, state.setters.prices, state.setters.meta, state.setters.bumpkin,
      state.setters.farm, state.setters.request, state.setters.options, state.setters.loading, state.setters.mutants,
      state.setters.deliveries, state.setters.cookie, {}, "", { home: ["home"] }, { home: ["homeData"], inventory: ["itables"] },
      { inventory: ["itables.it"] }, config, state.tryPayload, hasSectionData, hasPathData, false);
    return null;
  }
  await act(async () => root.render(<DeltaFetcher />));
  await act(async () => api.getPrices(false));
  expect(state.farm.itables.it.Sunflower.yield).toBe(1);
  expect(state.tables.current["itables.it"]).toBeUndefined();
  expect(state.sections.current.inventory).toBeUndefined();
  fetchJson.mockResolvedValue({ priceData: [0, 0, 0.1], allData: packet() });
  await act(async () => api.getPrices(false));
  expect(fetchJson.mock.calls[1][2].body.knownTableHashes["itables.it"]).toBeUndefined();
});

test("network failure preserves farm and hashes and clears refresh busy state", async () => {
  const state = context(packet()); const before = JSON.stringify(state.farm);
  state.tables.current = { "itables.it": "table-v1" };
  fetchJson.mockRejectedValue(new Error("offline"));
  await act(async () => root.render(<Fetcher state={state} />));
  await act(async () => { await expect(api.getPrices(false)).rejects.toThrow("offline"); });
  expect(JSON.stringify(state.farm)).toBe(before);
  expect(state.tables.current).toEqual({ "itables.it": "table-v1" });
  expect(state.setters.cookie).not.toHaveBeenCalled();
  expect(state.busy.current).toBe(false);
});

test("price-only request sends minimal body and preserves existing farm data", async () => {
  const state = context(packet()); const before = JSON.stringify(state.farm.itables);
  fetchJson.mockResolvedValue({ priceData: [0, 0, 0.2], allData: "" });
  await act(async () => root.render(<Fetcher state={state} />));
  await act(async () => api.getPrices(true));
  expect(fetchJson.mock.calls[0][2].body).toEqual({ onlyprices: "true" });
  expect(state.setters.prices).toHaveBeenCalledWith([0, 0, 0.2]);
  expect(state.dataSet.options.usdSfl).toBe(0.2);
  expect(JSON.stringify(state.farm.itables)).toBe(before);
  expect(state.busy.current).toBe(false);
});

test.each([undefined, null, {}, "unexpected"])("detailed outcome distinguishes absent farm payload %# while facade keeps its result", async payload => {
  const state = context(packet());
  fetchJson.mockResolvedValue({ priceData: [], allData: payload });
  await act(async () => root.render(<Fetcher state={state} />));
  let result;
  await act(async () => { result = await api.getPricesWithOutcome(false); });
  expect(result.status).toBe("unavailable");
  expect(result.legacyValue.itables.it.Sunflower.yield).toBe(1);
  expect(result.confirmedSections).toEqual([]);
  state.farm = copy(packet()); state.farmRef.current = state.farm;
  let legacy;
  await act(async () => { legacy = await api.getPrices(false); });
  expect(legacy).toEqual(result.legacyValue);
  expect(legacy.status).toBeUndefined();
});

test("detailed cached and price outcomes preserve facade undefined and farm returns", async () => {
  const state = context(packet());
  await act(async () => root.render(<Fetcher state={state} />));
  const cached = await api.getPricesWithOutcome(false, true);
  expect(cached).toMatchObject({ status: "cached", legacyValue: undefined });
  expect(await api.getPrices(false, true)).toBeUndefined();
  expect(fetchJson).not.toHaveBeenCalled();
  fetchJson.mockResolvedValue({ priceData: [0, 0, 0.2] });
  let prices;
  await act(async () => { prices = await api.getPricesWithOutcome(true); });
  expect(prices.status).toBe("prices");
  expect(prices.confirmedSections).toEqual([]);
  expect(prices.legacyValue.frmid).toBe(901);
});

test("detailed invalid config reports unavailable while facade still returns null", async () => {
  const state = context(packet()); state.tryConfig = null;
  await act(async () => root.render(<Fetcher state={state} />));
  expect(await api.getPricesWithOutcome(false)).toMatchObject({ status: "unavailable", reason: "tryit-config", legacyValue: null });
  expect(await api.getPrices(false)).toBeNull();
  expect(fetchJson).not.toHaveBeenCalled();
});

test("detailed stale results retain the facade's current-state value without publication", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let complete;
  fetchJson.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = api.getPricesWithOutcome(false);
  state.trySelection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  let result;
  await act(async () => { complete({ priceData: [], allData: packet() }); result = await pending; });
  expect(result).toMatchObject({ status: "ignored", reason: "tryset" });
  expect(result.legacyValue).toBe(state.farmRef.current);
  expect(state.setters.farm).not.toHaveBeenCalled();
});

test("legacy getPrices resolves to the existing farm when a Tryset change ignores the response", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(packet()); let complete;
  fetchJson.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<Fetcher state={state} />));
  const pending = api.getPrices(false);
  state.trySelection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  let legacy;
  await act(async () => { complete({ priceData: [], allData: packet() }); legacy = await pending; });
  expect(legacy).toBe(state.farmRef.current);
  expect(state.setters.farm).not.toHaveBeenCalled();
});

test("both detailed and facade requests retain network rejection", async () => {
  const state = context(packet()); fetchJson.mockRejectedValue(new Error("offline"));
  await act(async () => root.render(<Fetcher state={state} />));
  await act(async () => { await expect(api.getPricesWithOutcome(false)).rejects.toThrow("offline"); });
  await act(async () => { await expect(api.getPrices(false)).rejects.toThrow("offline"); });
  expect(state.busy.current).toBe(false);
  expect(state.setters.farm).not.toHaveBeenCalled();
});

test.each(["full", "unchanged", "unconfirmed", "rejected-delta"])("section caller verifies fresh coverage (%s)", async kind => {
  jest.spyOn(console, "warn").mockImplementation(() => {});
  const state = context(packet()); state.mark = jest.fn((_page, pulse) => { state.syncedPulse = pulse; });
  const payload = kind === "full" ? packet()
    : kind === "unchanged" ? { frmid: 901, unchangedSections: ["home"] }
    : kind === "rejected-delta" ? { ...packet(), _tableDeltas: { itables: { it: { baseHash: "wrong", nextHash: "new", upserts: {}, deletes: [] } } } }
    : { frmid: 901 };
  fetchJson.mockResolvedValue({ priceData: [], allData: payload });
  await act(async () => root.render(<><Fetcher state={state} /><SectionCaller state={state} /></>));
  if (kind === "full" || kind === "unchanged") expect(state.mark).toHaveBeenCalledWith("home", 3);
  else expect(state.mark).not.toHaveBeenCalled();
  expect(state.sectionCaller.navLoadInFlightRef.current).toBe(false);
  expect(state.sectionCaller.headerRequestLoading).toBe(false);
});
