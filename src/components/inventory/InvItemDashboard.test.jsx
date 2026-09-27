import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { AppCtx } from "../../context/AppCtx.js";
import { fetchJson } from "../../services/apiClient.js";
import InvItemDashboard from "./InvItemDashboard.jsx";
import { buildMiniGraphPoints, MiniPriceGraph } from "./InvItemDashboard.jsx";

jest.mock("../../services/apiClient.js", () => ({ fetchJson: jest.fn() }));

test.each([
  [[2, 3, 2.5], ["Min 2", "Max 3", "Min to max: 50.0%"]],
  [[2, 2], ["Min / Max 2", "Min to max: 0.0%"]],
])("graph keeps readable HTML annotations separate from the scaled curve for %j", (prices, labels) => {
  const html = renderToStaticMarkup(<MiniPriceGraph points={prices.map((price, index) => ({ price, time: 1_790_000_000_000 + index * 3_600_000 }))} />);
  const svg = html.slice(html.indexOf("<svg"), html.indexOf("</svg>"));
  labels.forEach((label) => expect(html).toContain(label));
  expect(svg).not.toContain("NaN");
  expect(html).toContain('alt="Flower"');
  expect(svg).toContain('preserveAspectRatio="none"');
  expect(svg).not.toContain("<foreignObject");
  expect(svg).not.toContain("Min to max:");
  expect(html).toContain('inv-item-graph-extreme is-min');
  if (prices[0] !== prices[1]) expect(html).toContain('inv-item-graph-extreme is-max');
});

test("item graph keeps only valid ordered prices for the selected item", () => {
  const points = buildMiniGraphPoints([
    { id: 5, date: "2026-09-24 12", unit: 2 },
    { id: 6, date: "2026-09-24 13", unit: 90 },
    { id: 5, date: "2026-09-24 10", unit: 1 },
    { id: 5, date: "2026-09-24 14", unit: null },
  ], 5);
  expect(points.map((point) => point.price)).toEqual([1, 2]);
  expect(points[0].time).toBeLessThan(points[1].time);
});

test("opening an item requests only that item's Market series", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fetchJson.mockResolvedValue([{ id: 204, date: "2026-09-24 12", unit: 2 }]);
  const container = document.createElement("div");
  const root = createRoot(container);
  const context = {
    data: { dataSet: { options: { farmId: 123, username: "Tester", coinsRatio: 1, tradeTax: 10 } }, dataSetFarm: {} },
    config: { API_URL: "" },
    ui: { TryChecked: false, selectedQuantity: "farm" },
    actions: { handleTooltip: jest.fn(), handleTraderClick: jest.fn(), handleUIChange: jest.fn() },
  };
  await act(async () => { root.render(<AppCtx.Provider value={context}><InvItemDashboard name="Carrot" item={{ id: "204", img: "/carrot.png", cat: "crop", costp2pt: 2 }} onClose={() => {}} /></AppCtx.Provider>); });
  expect(fetchJson).toHaveBeenCalledWith("", "/getHT", expect.objectContaining({ headers: expect.objectContaining({ xitemid: "204", xsource: "Marketplace" }) }));
  await act(async () => { root.unmount(); });
});

test("embedded dashboard opens metric details without an outside click and closes explicitly", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fetchJson.mockResolvedValue([]);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const onClose = jest.fn();
  const outsideClick = jest.fn();
  const context = {
    data: { dataSet: { options: { farmId: 123, coinsRatio: 1, tradeTax: 10 } }, dataSetFarm: {} },
    config: { API_URL: "" }, ui: { TryChecked: false, selectedQuantity: "farm" },
    actions: { handleTooltip: jest.fn(), handleTraderClick: jest.fn(), handleUIChange: jest.fn() },
  };
  try {
    await act(async () => root.render(<AppCtx.Provider value={context}><div onClick={outsideClick}><InvItemDashboard name="Carrot" item={{ id: 204, cat: "crop", costp2pt: 2 }} onClose={onClose} embedded /></div></AppCtx.Provider>));
    expect(container.querySelector(".inv-item-scrim")).toBeNull();
    const metric = [...container.querySelectorAll(".inv-item-metrics button")].find((button) => button.textContent.includes("Market price"));
    act(() => metric.click());
    expect(context.actions.handleTooltip).toHaveBeenCalledWith("Carrot", "market", { itemQuant: 1, itemPrice: 2, CostChecked: false }, expect.anything());
    expect(outsideClick).not.toHaveBeenCalled();
    act(() => container.querySelector('[aria-label="Close item dashboard"]').click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(outsideClick).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

test("Escape leaves a covered dashboard mounted and its selected graph period unchanged", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  fetchJson.mockResolvedValue([]);
  const container = document.createElement("div");
  const root = createRoot(container);
  const onClose = jest.fn();
  const context = { data: { dataSet: { options: {} }, dataSetFarm: {} }, config: { API_URL: "" }, ui: {}, actions: { handleUIChange: jest.fn() } };
  const render = (inactive) => <AppCtx.Provider value={context}><InvItemDashboard name="Carrot" item={{ id: 204 }} onClose={onClose} embedded inactive={inactive} /></AppCtx.Provider>;
  try {
    await act(async () => root.render(render(false)));
    await act(async () => [...container.querySelectorAll(".inv-item-section-head button")].find((button) => button.textContent === "24h").click());
    await act(async () => root.render(render(true)));
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onClose).not.toHaveBeenCalled();
    expect(container.querySelector(".inv-item-section-head .is-active").textContent).toBe("24h");
    await act(async () => root.render(render(false)));
    act(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});

test("bundled history supports all periods under StrictMode without getHT requests", async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  fetchJson.mockClear();
  const container = document.createElement("div");
  const root = createRoot(container);
  const rows = [{ id: 204, date: "2026-09-26 00", unit: 1 }, { id: 204, date: "2026-09-27 00", unit: 2 }];
  const dashboardFarm = { priceHistory: { status: "ready", series: { "24h": rows, "7d": rows, "31d": rows } } };
  const context = { data: { dataSet: { options: {} }, dataSetFarm: {} }, config: { API_URL: "" }, ui: {}, actions: { handleUIChange: jest.fn() } };
  try {
    await act(async () => root.render(<React.StrictMode><AppCtx.Provider value={context}><InvItemDashboard name="Carrot" item={{ id: 204 }} dashboardFarm={dashboardFarm} onClose={() => {}} embedded /></AppCtx.Provider></React.StrictMode>));
    expect(container.querySelector('svg[aria-label^="Market price history"]')).not.toBeNull();
    for (const period of ["24h", "31d", "7d"]) {
      await act(async () => [...container.querySelectorAll(".inv-item-section-head button")].find((button) => button.textContent === period).click());
      expect(container.querySelector(".inv-item-section-head .is-active").textContent).toBe(period);
    }
    expect(fetchJson).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
