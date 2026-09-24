import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { AppCtx } from "../context/AppCtx";
import { fetchJson } from "../services/apiClient.js";
import ListsSwitch from "./ListsSwitch";
import ListsModeSwitch from "./ListsModeSwitch";
import FarmHoldingsSearch from "./FarmHoldingsSearch";

jest.mock("../services/apiClient.js", () => ({ fetchJson: jest.fn() }));

const context = (isAbo) => ({
  data: { dataSetFarm: { frmid: "123", isabo: isAbo, username: "Tester" }, dataSet: { options: { farmId: "123" } } },
  config: { API_URL: "" },
  ui: { selectedInv: "toplists", listsMode: "classic" },
});

test("Lists defaults to classic content and header shows both modes", () => {
  const html = renderToStaticMarkup(<AppCtx.Provider value={context(false)}><ListsSwitch /></AppCtx.Provider>);
  expect(html).toContain("toplists-wrap");
  const switchHtml = renderToStaticMarkup(<ListsModeSwitch mode="classic" onChange={() => {}} />);
  expect(switchHtml).toContain("Classic");
  expect(switchHtml).toContain("Active farms");
  const notice = renderToStaticMarkup(<AppCtx.Provider value={context(false)}><FarmHoldingsSearch /></AppCtx.Provider>);
  expect(notice).toContain("available with a subscription");
});

test("subscriber search exposes category picker and quantity search controls", () => {
  const html = renderToStaticMarkup(<AppCtx.Provider value={context(true)}><FarmHoldingsSearch /></AppCtx.Provider>);
  expect(html).toContain("All items");
  expect(html).toContain("Any item");
  expect(html).toContain("Search an item by name");
  expect(html).toContain("Minimum quantity per item");
});

test("shows snapshot and match counts and returns to the previous result page", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fetchJson.mockImplementation((_, endpoint, options) => {
    if (endpoint.endsWith("/catalog")) return Promise.resolve({ snapshotDate: "2026-09-23", farmCount: 83, items: [{ name: "Carrot", holder_count: 51 }] });
    if (endpoint === "/getcatalogcategories") return Promise.resolve({ categories: [] });
    if (endpoint.endsWith("/search")) {
      const after = options.body.cursor;
      const ids = after ? ["51"] : Array.from({ length: 50 }, (_, index) => String(index + 1));
      return Promise.resolve({ snapshotDate: "2026-09-23", totalMatches: 51, rows: ids.map((farmId) => ({ farmId, username: `Farm ${farmId}`, quantities: { Carrot: 1 } })), nextCursor: after ? null : "after50" });
    }
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
  const container = document.createElement("div");
  const root = createRoot(container);
  const click = async (selector) => { await act(async () => { container.querySelector(selector).click(); }); };
  try {
    await act(async () => { root.render(<AppCtx.Provider value={context(true)}><FarmHoldingsSearch /></AppCtx.Provider>); });
    expect(container.textContent).toContain("83 farms");
    await click(".farm-holdings-candidates button");
    await click(".farm-holdings-picker-toggle");
    expect(container.querySelector(".farm-holdings-picker-toggle").getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("#farm-holdings-picker-body").hidden).toBe(true);
    expect(container.querySelector(".farm-holdings-picker-toggle").textContent).toContain("Carrot");
    await click(".farm-holdings-submit");
    expect(container.textContent).toContain("51 matching farms");
    expect(container.textContent).toContain("Showing 1–50");
    await click(".farm-holdings-picker-toggle");
    expect(container.querySelector("#farm-holdings-picker-body").hidden).toBe(false);
    await click(".farm-holdings-pagination button:last-child");
    expect(container.textContent).toContain("Showing 51–51");
    await click(".farm-holdings-pagination button:first-child");
    expect(container.textContent).toContain("Showing 1–50");
    expect(fetchJson.mock.calls.filter(([, endpoint]) => endpoint.endsWith("/search")).map(([, , options]) => options.body.cursor)).toEqual(["", "after50", ""]);
    expect(fetchJson.mock.calls.filter(([, endpoint]) => endpoint.endsWith("/catalog") || endpoint.endsWith("/search")).every(([, , options]) => options.body.username === "Tester")).toBe(true);
  } finally {
    await act(async () => { root.unmount(); });
    fetchJson.mockReset();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test("Bounty keeps SQLite items omitted by the classic category endpoint", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fetchJson.mockImplementation((_, endpoint) => {
    if (endpoint.endsWith("/catalog")) return Promise.resolve({ snapshotDate: "2026-09-23", farmCount: 2, items: [{ name: "Salt Dino Egg", holder_count: 2, category: "Bounty" }] });
    if (endpoint === "/getcatalogcategories") return Promise.resolve({ categories: [{ category: "Bounty" }] });
    if (endpoint === "/getcatalogcategory") return Promise.resolve({ items: [{ key: "Ammonite Shell" }] });
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(async () => { root.render(<AppCtx.Provider value={context(true)}><FarmHoldingsSearch /></AppCtx.Provider>); });
    await act(async () => { [...container.querySelectorAll(".farm-holdings-categories button")].find((button) => button.textContent === "Bounty").click(); });
    expect(container.querySelector(".farm-holdings-candidates").textContent).toContain("Salt Dino Egg");
  } finally {
    await act(async () => { root.unmount(); });
    fetchJson.mockReset();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});
