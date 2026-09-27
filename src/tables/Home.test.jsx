import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react";
import HomeTable from "./Home";
import { useAppCtx } from "../context/AppCtx";

jest.mock("../context/AppCtx", () => ({ useAppCtx: jest.fn() }));
jest.mock("../fct.js", () => ({ frmtNb: (n) => String(n), ColorValue: () => "green" }));

function context(mode = "current", tryset = false) {
  const set = (cost, profit) => ({ planted: 3, harvest: 12, cycles: 2, cost, profit, market: cost + profit });
  return {
    data: { dataSet: {}, dataSetFarm: { homeData: {
      blocks: [{ key: "minerals", label: "Minerals", itemToggle: true, rows: [
        { name: "Gold", active: set(2, 7), daily: set(4, 14), tryset: set(3, 9), dailytryset: set(6, 18) },
        { name: "Iron", active: set(100, 100), daily: set(100, 100), tryset: set(100, 100), dailytryset: set(100, 100) },
      ] }],
      dailyChest: { collectedAt: Date.now(), streak: 4 },
      deliveries: { done: 1, count: 3 },
      powerSkills: [{ name: "Test power", isactive: 1, cooldown: 1, lastUsedAt: 0 }],
    } } },
    ui: { selectedInv: "home", xListeColBounty: Array.from({ length: 6 }, () => [0, 1]),
      TryChecked: tryset, isOpen: { 0: true }, selectedHomeItems: { Iron: false }, selectedHomeMode: mode },
    img: {}, config: { API_URL: "" },
    actions: { handleHomeClic: jest.fn(), setUIField: jest.fn(), handleUIChange: jest.fn(), handleTooltip: jest.fn() },
  };
}

test.each([
  ["current", false, 2, 7], ["daily", false, 4, 14],
  ["current", true, 3, 9], ["daily", true, 6, 18],
])("modern Home preserves selected totals in %s / try=%s", (mode, tryset, cost, profit) => {
  useAppCtx.mockReturnValue(context(mode, tryset));
  const classic = renderToStaticMarkup(<HomeTable />);
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(<HomeTable modern />);
  expect(classic).toContain(`Cost: ${cost}`);
  expect(node.querySelector(".home-modern-totals").textContent).toBe(`Cost ${cost}${mode === "daily" ? "Profit/day" : "Profit"} ${profit}`);
  expect(node.querySelectorAll("tbody tr")).toHaveLength(2);
  expect(node.querySelectorAll(".home-item-checkbox")[1].checked).toBe(false);
  expect(node.querySelector(".home-power-skill-time").textContent).toBe("Ready");
  expect(node.querySelector(".home-status-line").classList.contains("is-done")).toBe(true);
  expect(classic).not.toContain("home-modern-summary");
});

test("modern accordion responds to keyboard without toggling when its checkbox receives space", () => {
  const ctx = context();
  useAppCtx.mockReturnValue(ctx);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  global.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    act(() => root.render(<HomeTable modern />));
    const header = container.querySelector(".collapsible-header");
    act(() => header.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
    expect(ctx.actions.handleHomeClic).toHaveBeenCalledWith(0);
    ctx.actions.handleHomeClic.mockClear();
    act(() => header.querySelector("input").dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })));
    expect(ctx.actions.handleHomeClic).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test("sidebar height follows its page scroller and stops observing on unmount", () => {
  useAppCtx.mockReturnValue(context());
  const container = document.createElement("div");
  container.className = "table-container";
  let height = 565;
  Object.defineProperty(container, "clientHeight", { get: () => height });
  document.body.appendChild(container);
  const originalObserver = global.ResizeObserver;
  let onResize;
  const observe = jest.fn();
  const disconnect = jest.fn();
  global.ResizeObserver = class {
    constructor(callback) { onResize = callback; }
    observe = observe;
    disconnect = disconnect;
  };
  const root = createRoot(container);
  global.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    act(() => root.render(<HomeTable modern />));
    const home = container.querySelector(".home-modern");
    expect(home.style.getPropertyValue("--home-panel-height")).toBe("565px");
    expect(observe).toHaveBeenCalledWith(container);
    height = 310;
    act(() => onResize());
    expect(home.style.getPropertyValue("--home-panel-height")).toBe("310px");
    act(() => root.unmount());
    expect(disconnect).toHaveBeenCalled();
  } finally {
    container.remove();
    global.ResizeObserver = originalObserver;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test.each([false, true])("Home icon opens details without changing selection (modern=%s)", (modern) => {
  const ctx = context("daily");
  ctx.data.dataSetFarm.homeData.blocks[0].key = "cropmachine";
  ctx.data.dataSetFarm.homeData.blocks[0].rows[0].daily.tooltip = { rounds: [] };
  useAppCtx.mockReturnValue(ctx);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  global.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    act(() => root.render(<HomeTable modern={modern} />));
    act(() => container.querySelector(".home-item-open").click());
    expect(ctx.actions.handleTooltip).toHaveBeenCalledTimes(1);
    expect(ctx.actions.handleTooltip).toHaveBeenCalledWith("Gold", "itemdashboard", { source: "home" }, expect.anything());
    expect(ctx.actions.setUIField).not.toHaveBeenCalled();
    ctx.actions.handleTooltip.mockClear();
    act(() => container.querySelector(".home-item-checkbox").click());
    expect(ctx.actions.setUIField).toHaveBeenCalledWith("selectedHomeItems", expect.any(Function));
    expect(ctx.actions.handleTooltip).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

 test.each([false, true])("Home row cells and keyboard open the item dashboard (modern=%s)", (modern) => {
  const ctx = context("daily");
  ctx.data.dataSetFarm.homeData.blocks[0].key = "cropmachine";
  ctx.data.dataSetFarm.homeData.blocks[0].rows[0].daily.tooltip = { rounds: [] };
  useAppCtx.mockReturnValue(ctx);
  const container = document.createElement("div");
  const root = createRoot(container);
  global.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    act(() => root.render(<HomeTable modern={modern} />));
    const row = container.querySelector("tbody tr");
    for (const cell of row.querySelectorAll("td")) {
      ctx.actions.handleTooltip.mockClear();
      act(() => cell.click());
      expect(ctx.actions.handleTooltip).toHaveBeenCalledTimes(1);
      expect(ctx.actions.handleTooltip).toHaveBeenCalledWith("Gold", "itemdashboard", { source: "home" }, expect.anything());
    }
    for (const key of ["Enter", " "]) {
      ctx.actions.handleTooltip.mockClear();
      act(() => row.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })));
      expect(ctx.actions.handleTooltip).toHaveBeenCalledTimes(1);
    }
    ctx.actions.handleTooltip.mockClear();
    act(() => row.querySelector("input").dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })));
    expect(ctx.actions.handleTooltip).not.toHaveBeenCalled();
    expect(ctx.actions.setUIField).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
