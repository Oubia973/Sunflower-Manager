import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useItemDashboardLayers } from "./useItemDashboardLayers";

test("metric tooltips and dashboards close independently; another item replaces the dashboard", () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement("div");
  const root = createRoot(container);
  let layers;
  function Harness() { layers = useItemDashboardLayers(); return null; }
  try {
    act(() => root.render(<Harness />));
    const dashboard = { item: "Carrot", context: "itemdashboard" };
    act(() => layers.showTooltip(dashboard));
    act(() => layers.showTooltip({ item: "Carrot", context: "costp" }));
    expect(layers.dashboardData).toBe(dashboard);
    expect(layers.tooltipData.context).toBe("costp");
    act(() => layers.setTooltipData(null));
    expect(layers.dashboardData).toBe(dashboard);
    act(() => layers.showTooltip({ item: "Wood", context: "itemdashboard" }));
    expect(layers.dashboardData.item).toBe("Wood");
    expect(layers.tooltipData).toBeNull();
    const metric = { item: "Wood", context: "market", dashboardFarm: { frmid: 123 } };
    act(() => layers.showTooltip(metric));
    act(() => layers.closeDashboard());
    expect(layers.dashboardData).toBeNull();
    expect(layers.tooltipData).toBe(metric);
    act(() => layers.setTooltipData(null));
    expect(layers.tooltipData).toBeNull();
  } finally {
    act(() => root.unmount());
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
