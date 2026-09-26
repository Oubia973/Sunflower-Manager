import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { AppCtx } from "../../context/AppCtx.js";
import { fetchJson } from "../../services/apiClient.js";
import InvItemDashboard from "./InvItemDashboard.jsx";
import { buildMiniGraphPoints, MiniPriceGraph } from "./InvItemDashboard.jsx";

jest.mock("../../services/apiClient.js", () => ({ fetchJson: jest.fn() }));

test.each([
  [[2, 3, 2.5], ["Min 2 SFL", "Max 3 SFL", "Min to max: 50.0%"]],
  [[2, 2], ["Min / Max 2 SFL", "Min to max: 0.0%"]],
])("graph displays extrema and their difference inside the SVG for %j", (prices, labels) => {
  const html = renderToStaticMarkup(<MiniPriceGraph points={prices.map((price, index) => ({ price, time: 1_790_000_000_000 + index * 3_600_000 }))} />);
  const svg = html.slice(html.indexOf("<svg"), html.indexOf("</svg>"));
  labels.forEach((label) => expect(svg).toContain(label));
  expect(svg).not.toContain("NaN");
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
