import { useCallback, useState } from "react";

export function useItemDashboardLayers() {
  const [tooltipData, setTooltipData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const showTooltip = useCallback((next) => {
    if (next?.context === "itemdashboard") {
      setDashboardData(next);
      setTooltipData(null);
    } else {
      setTooltipData(next);
    }
  }, []);
  const closeDashboard = useCallback(() => {
    setDashboardData(null);
  }, []);
  return { tooltipData, setTooltipData, dashboardData, showTooltip, closeDashboard };
}
