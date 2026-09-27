import React, { act } from "react";
import { createRoot } from "react-dom/client";
import ItemDashboardTooltipDetails from "./ItemDashboardTooltipDetails";
import { useAppCtx } from "../../context/AppCtx";

jest.mock("../../context/AppCtx", () => ({ useAppCtx: jest.fn() }));
jest.mock("./InvItemDashboard", () => function Dashboard({ name, item, embedded }) {
  return <div data-embedded={embedded}>{name}:{item.id}:{item.pcost}</div>;
});

let container;
let root;
let ctx;
const currentData = () => ({ frmid: 123, invData: { itables: { it: { Carrot: { id: 204, pcost: 9 } } } }, itables: { it: { Carrot: { pcost: 0 } } } });
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  ctx = { data: { dataSet: { options: { farmId: 123 } }, dataSetFarm: { frmid: 123 } }, actions: { loadItemDashboardData: jest.fn() } };
  useAppCtx.mockImplementation(() => ctx);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

test("Home loads details on demand and preserves canonical numeric zero", async () => {
  let resolve;
  ctx.actions.loadItemDashboardData.mockImplementation(() => new Promise((done) => { resolve = done; }));
  await act(async () => root.render(<ItemDashboardTooltipDetails name="Carrot" source="home" onClose={() => {}} />));
  expect(container.textContent).toContain("Loading item details");
  await act(async () => { resolve(currentData()); });
  expect(container.textContent).toBe("Carrot:204:0");
  expect(container.querySelector("[data-embedded]").getAttribute("data-embedded")).toBe("true");
  const firstLoader = ctx.actions.loadItemDashboardData;
  ctx.actions.loadItemDashboardData = jest.fn();
  act(() => root.render(<ItemDashboardTooltipDetails name="Carrot" source="home" onClose={() => {}} />));
  expect(firstLoader).toHaveBeenCalledTimes(1);
  expect(firstLoader).toHaveBeenCalledWith("Carrot");
  expect(ctx.data.dataSetFarm.invData).toBeUndefined();
  expect(ctx.actions.loadItemDashboardData).not.toHaveBeenCalled();
});

test("Inv uses the combined dashboard request without loading inventory sections", async () => {
  ctx.data.dataSetFarm = currentData();
  ctx.actions.loadItemDashboardData.mockResolvedValue(currentData());
  await act(async () => root.render(<ItemDashboardTooltipDetails name="Carrot" source="inv" onClose={() => {}} />));
  expect(container.textContent).toBe("Carrot:204:0");
  expect(ctx.actions.loadItemDashboardData).toHaveBeenCalledWith("Carrot");
});

test("failed Home loading offers Retry and never renders empty figures", async () => {
  ctx.actions.loadItemDashboardData.mockRejectedValueOnce(new Error("Unavailable"));
  await act(async () => root.render(<ItemDashboardTooltipDetails name="Carrot" source="home" onClose={() => {}} />));
  expect(container.textContent).toContain("Item details unavailable");
  expect(container.querySelector("[data-embedded]")).toBeNull();
  ctx.actions.loadItemDashboardData.mockResolvedValueOnce(currentData());
  await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Retry").click());
  expect(container.textContent).toBe("Carrot:204:0");
});

test("a stale inventory projection does not supply item figures when the targeted request fails", async () => {
  ctx.data.dataSetFarm = { ...currentData(), tryitRevision: 2, invData: { ...currentData().invData, _source: { tryitRevision: 1 } } };
  ctx.actions.loadItemDashboardData.mockRejectedValue(new Error("offline"));
  await act(async () => root.render(<ItemDashboardTooltipDetails name="Carrot" source="inv" onClose={() => {}} />));
  expect(container.querySelector("[data-embedded]")).toBeNull();
  expect(container.textContent).toContain("Item details unavailable");
});
