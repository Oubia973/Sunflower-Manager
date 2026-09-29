import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useSectionLoader } from "./useSectionLoader.js";
import { useAutoRefresh } from "./useAutoRefresh.js";

const requirements = { home: ["home"], craft: ["craft"], activity: ["activity"] };
const keys = { home: ["homeData"], craft: ["craftData"] };
const paths = {};
let root, container, api;
function Sections({ state }) {
  api = useSectionLoader(state.ui, state.farm, state.farmRef, requirements, keys, paths,
    state.busy, state.pulse, state.mark, state.synced, state.tryPayload, state.fetch);
  return null;
}
function Auto({ state }) {
  api = useAutoRefresh(state.options, state.ui, state.farm, true, state.farm.frmid, 0,
    state.tryOpen, !!state.graphOpen, state.delivery, requirements, state.fetch);
  return null;
}
function context() {
  const farm = { frmid: 901, isabo: false, homeData: { amount: 0 } };
  return { farm, farmRef: { current: farm }, ui: { selectedInv: "home" }, busy: { current: false },
    pulse: 0, mark: jest.fn(), synced: jest.fn(() => 0), tryPayload: () => ({}),
    fetch: jest.fn().mockImplementation((_prices, _full, include, _force, page) => Promise.resolve({
      status: "applied", farm, requestedFarmId: "901", requestedPage: page || "home",
      requestedSections: include || ["home"], confirmedSections: include || ["home"], rejectedTablePaths: [] })), options: {}, tryOpen: false, delivery: false };
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  jest.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove();
  jest.useRealTimers(); jest.restoreAllMocks();
});

test("complete page avoids fetching; incomplete response keeps a short retry debounce", async () => {
  const state = context();
  await act(async () => root.render(<Sections state={state} />));
  expect(state.fetch).not.toHaveBeenCalled();
  state.ui = { selectedInv: "craft" };
  await act(async () => root.render(<Sections state={state} />));
  expect(state.fetch).toHaveBeenCalledWith(false, true, null, false, null, false, "SECTION_LOAD");
  await act(async () => api.loadSectionsIfNeeded());
  expect(state.fetch).toHaveBeenCalledTimes(1);
  expect(api.headerRequestLoading).toBe(false);
  await act(async () => jest.advanceTimersByTime(501));
  await act(async () => api.loadSectionsIfNeeded());
  expect(state.fetch).toHaveBeenCalledTimes(2);
});

test("navigation waits for refresh and suppresses a duplicate while its request is pending", async () => {
  const state = context(); state.farm = { frmid: 901 }; state.busy.current = true;
  let complete;
  state.fetch.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<Sections state={state} />));
  expect(state.fetch).not.toHaveBeenCalled();
  state.busy.current = false;
  await act(async () => jest.advanceTimersByTime(150));
  expect(api.headerRequestLoading).toBe(true);
  await act(async () => api.loadSectionsIfNeeded());
  expect(state.fetch).toHaveBeenCalledTimes(1);
  await act(async () => complete({}));
  expect(api.headerRequestLoading).toBe(false);
});

test("refresh elsewhere forces a complete page and records its pulse", async () => {
  const state = context(); state.pulse = 3;
  await act(async () => root.render(<Sections state={state} />));
  expect(state.fetch).toHaveBeenCalledWith(false, true, null, false, null, true, "SECTION_LOAD");
  expect(state.mark).toHaveBeenCalledWith("home", 3);
});

test("a null fetch result does not mark the page as synchronized", async () => {
  const state = context(); state.pulse = 3; state.fetch.mockResolvedValue(null);
  await act(async () => root.render(<Sections state={state} />));
  expect(state.mark).not.toHaveBeenCalled();
});

test.each(["ignored", "unavailable", "prices", "cached"])("outcome %s never marks a new page pulse", async status => {
  const state = context(); state.pulse = 3;
  state.fetch.mockResolvedValue({ status, farm: state.farm });
  await act(async () => root.render(<Sections state={state} />));
  expect(state.mark).not.toHaveBeenCalled();
  expect(api.headerRequestLoading).toBe(false);
});

test("a page transition during the request prevents the old page pulse being marked", async () => {
  const state = context(); state.pulse = 3; let complete;
  state.fetch.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<Sections state={state} />));
  state.ui = { selectedInv: "craft" };
  await act(async () => root.render(<Sections state={state} />));
  await act(async () => complete({ status: "applied", farm: state.farm,
    requestedFarmId: "901", requestedPage: "home", requestedSections: ["home"], confirmedSections: ["home"], rejectedTablePaths: [] }));
  expect(state.mark).not.toHaveBeenCalled();
});

test("rejected section request clears loading without recording synchronization", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(); state.pulse = 3; state.fetch.mockRejectedValue(new Error("synthetic failure"));
  await act(async () => root.render(<Sections state={state} />));
  expect(state.mark).not.toHaveBeenCalled();
  expect(api.navLoadInFlightRef.current).toBe(false);
  expect(api.headerRequestLoading).toBe(false);
});

test("non-subscriber first refresh is at 20 seconds, then 60, using latest page and delivery sections", async () => {
  const state = context();
  await act(async () => root.render(<Auto state={state} />));
  expect(api.autoRefreshDurationMs).toBe(20000);
  await act(async () => jest.advanceTimersByTime(19999));
  expect(state.fetch).not.toHaveBeenCalled();
  state.ui = { selectedInv: "craft" }; state.delivery = true;
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(1));
  expect(state.fetch).toHaveBeenLastCalledWith(false, true, ["craft", "trades", "orders", "deliverypage"], false, "craft", true, "AUTO_REFRESH");
  expect(api.getPageSyncedPulse("craft")).toBe(1);
  expect(api.getPageSyncedPulse("home")).toBe(-1);
  expect(api.autoRefreshDurationMs).toBe(60000);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(state.fetch).toHaveBeenCalledTimes(2);
});

test("subscriber activity refresh requests trades only and modal pauses timers", async () => {
  const state = context(); state.farm.isabo = true; state.ui = { selectedInv: "activity" };
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(60000));
  expect(state.fetch).toHaveBeenCalledWith(false, true, ["trades"], false, "activity", true, "AUTO_REFRESH");
  expect(api.autoRefreshPulse).toBe(1);
  expect(api.getPageSyncedPulse("activity")).toBe(-1);
  state.tryOpen = true;
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(120000));
  expect(state.fetch).toHaveBeenCalledTimes(1);
  expect(api.autoRefreshNextAt).toBe(0);
});

test("visibility pause and disabled preference prevent refresh calls", async () => {
  const state = context();
  await act(async () => root.render(<Auto state={state} />));
  jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  await act(async () => jest.advanceTimersByTime(120000));
  expect(state.fetch).not.toHaveBeenCalled();
  state.options = { autoRefresh: false };
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(120000));
  expect(state.fetch).not.toHaveBeenCalled();
});

test("first-cycle completion cannot reinstall a timer after opening a modal", async () => {
  const state = context(); let complete;
  state.fetch.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(20000));
  state.tryOpen = true;
  await act(async () => root.render(<Auto state={state} />));
  expect(jest.getTimerCount()).toBe(0);
  await act(async () => complete({}));
  expect(jest.getTimerCount()).toBe(0);
  expect(api.autoRefreshNextAt).toBe(0);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(state.fetch).toHaveBeenCalledTimes(1);
});

test.each(["ignored", "unavailable", "cached", "prices"])("auto outcome %s preserves pulse and next cycle", async status => {
  const state = context(); state.fetch.mockResolvedValue({ status });
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(20000));
  expect(api.autoRefreshPulse).toBe(0);
  expect(api.getPageSyncedPulse("home")).toBe(-1);
  expect(api.autoRefreshDurationMs).toBe(60000);
  expect(api.autoRefreshNextAt).toBe(Date.now() + 60000);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(state.fetch).toHaveBeenCalledTimes(2);
});

test.each(["unconfirmed", "delta", "farm", "page", "scope"])("auto applied outcome with %s does not confirm refresh", async fault => {
  const state = context();
  const result = { status: "applied", requestedFarmId: "901", requestedPage: "home",
    requestedSections: ["home", "trades"], confirmedSections: ["home", "trades"], rejectedTablePaths: [] };
  if (fault === "unconfirmed") result.confirmedSections = ["home"];
  if (fault === "delta") result.rejectedTablePaths = ["itables.items"];
  if (fault === "farm") result.requestedFarmId = "902";
  if (fault === "page") result.requestedPage = "craft";
  if (fault === "scope") result.requestedSections = ["home"];
  state.fetch.mockResolvedValue(result);
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(20000));
  expect(api.autoRefreshPulse).toBe(0);
  expect(api.getPageSyncedPulse("home")).toBe(-1);
});

test.each(["page", "farm", "modal", "options", "page-roundtrip", "farm-roundtrip", "modal-roundtrip", "disabled", "hidden", "visibility-roundtrip"])("auto pending response after %s transition cannot mark sync", async transition => {
  const state = context(); let complete;
  state.fetch.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(20000));
  if (transition === "page" || transition === "page-roundtrip") state.ui = { selectedInv: "craft" };
  if (transition === "farm" || transition === "farm-roundtrip") state.farm = { ...state.farm, frmid: 902 };
  if (transition === "modal" || transition === "modal-roundtrip") state.tryOpen = true;
  if (transition === "options") state.options = { tax: 8 };
  if (transition === "disabled") state.options = { autoRefresh: false };
  if (transition === "hidden") jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  if (transition === "visibility-roundtrip") {
    jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    jest.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  }
  await act(async () => root.render(<Auto state={state} />));
  if (transition === "page-roundtrip") {
    state.ui = { selectedInv: "home" };
    await act(async () => root.render(<Auto state={state} />));
  }
  if (transition === "farm-roundtrip" || transition === "modal-roundtrip") {
    state.farm = { ...state.farm, frmid: 901 }; state.tryOpen = false;
    await act(async () => root.render(<Auto state={state} />));
  }
  await act(async () => complete({ status: "applied", requestedFarmId: "901", requestedPage: "home",
    requestedSections: ["home", "trades"], confirmedSections: ["home", "trades"], rejectedTablePaths: [] }));
  expect(api.autoRefreshPulse).toBe(0);
  expect(api.getPageSyncedPulse("home")).toBe(-1);
  api.clearAllTimers();
});

test("auto network exception preserves pulse and first-cycle scheduling", async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const state = context(); state.fetch.mockRejectedValue(new Error("offline"));
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => jest.advanceTimersByTime(20000));
  expect(api.autoRefreshPulse).toBe(0);
  expect(api.getPageSyncedPulse("home")).toBe(-1);
  expect(api.autoRefreshDurationMs).toBe(60000);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(state.fetch).toHaveBeenCalledTimes(2);
});

describe.each(["start", "reset"])("timer ownership through %s", launch => {
  test.each(["modal", "graph", "disabled", "hidden", "stop", "unmount"])("late first-cycle completion after %s cannot revive timers", async transition => {
    const state = context(); let complete;
    state.fetch.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    await act(async () => root.render(<Auto state={state} />));
    if (launch === "reset") await act(async () => api.resetAutoRefreshTimer());
    await act(async () => jest.advanceTimersByTime(20000));
    const oldApi = api;
    if (transition === "modal") state.tryOpen = true;
    if (transition === "graph") state.graphOpen = true;
    if (transition === "disabled") state.options = { autoRefresh: false };
    if (transition === "hidden") {
      jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    }
    if (transition === "stop") await act(async () => api.stopAutoRefresh());
    await act(async () => root.render(transition === "unmount" ? null : <Auto state={state} />));
    expect(jest.getTimerCount()).toBe(0);
    await act(async () => complete({ status: "applied", requestedFarmId: "901", requestedPage: "home",
      requestedSections: ["home", "trades"], confirmedSections: ["home", "trades"], rejectedTablePaths: [] }));
    expect(jest.getTimerCount()).toBe(0);
    expect(oldApi.getPageSyncedPulse("home")).toBe(-1);
    if (transition !== "unmount") expect(api.autoRefreshNextAt).toBe(0);
    await act(async () => jest.advanceTimersByTime(120000));
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });

  test.each(["reset", "farm", "visibility", "modal"])("old completion preserves the new timer after %s restart", async restart => {
    const state = context(); let complete;
    state.fetch.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    await act(async () => root.render(<Auto state={state} />));
    if (launch === "reset") await act(async () => api.resetAutoRefreshTimer());
    await act(async () => jest.advanceTimersByTime(20000));
    if (restart === "reset") await act(async () => api.resetAutoRefreshTimer());
    if (restart === "farm") {
      state.farm = { ...state.farm, frmid: 902 };
      await act(async () => root.render(<Auto state={state} />));
    }
    if (restart === "modal") {
      state.tryOpen = true; await act(async () => root.render(<Auto state={state} />));
      state.tryOpen = false; await act(async () => root.render(<Auto state={state} />));
    }
    if (restart === "visibility") {
      jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
      await act(async () => document.dispatchEvent(new Event("visibilitychange")));
      jest.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
      await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    }
    const nextAt = api.autoRefreshNextAt;
    await act(async () => complete({}));
    expect(jest.getTimerCount()).toBe(1);
    expect(api.autoRefreshNextAt).toBe(nextAt);
    expect(api.autoRefreshDurationMs).toBe(20000);
    await act(async () => jest.advanceTimersByTime(19999));
    expect(state.fetch).toHaveBeenCalledTimes(1);
    await act(async () => jest.advanceTimersByTime(1));
    expect(state.fetch).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);
    await act(async () => jest.advanceTimersByTime(60000));
    expect(state.fetch).toHaveBeenCalledTimes(3);
  });
});

test("scheduled cycles use the current fetch callback without resetting their deadline", async () => {
  const state = context(); state.farm.isabo = true;
  await act(async () => root.render(<Auto state={state} />));
  const original = state.fetch;
  const nextAt = api.autoRefreshNextAt;
  state.fetch = jest.fn().mockResolvedValue({ status: "ignored" });
  await act(async () => root.render(<Auto state={state} />));
  expect(api.autoRefreshNextAt).toBe(nextAt);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(original).not.toHaveBeenCalled();
  expect(state.fetch).toHaveBeenCalledTimes(1);
});

test("hidden start/reset schedule nothing and force-normal reset waits sixty seconds", async () => {
  const state = context();
  jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => root.render(<Auto state={state} />));
  await act(async () => api.resetAutoRefreshTimer());
  expect(jest.getTimerCount()).toBe(0);
  expect(api.autoRefreshNextAt).toBe(0);
  jest.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  api.autoRefreshForceNormalFirstCycleRef.current = true;
  await act(async () => api.resetAutoRefreshTimer());
  expect(api.autoRefreshDurationMs).toBe(60000);
  await act(async () => jest.advanceTimersByTime(59999));
  expect(state.fetch).not.toHaveBeenCalled();
  await act(async () => jest.advanceTimersByTime(1));
  expect(state.fetch).toHaveBeenCalledTimes(1);
});
