import React, { useEffect, useRef, useState } from "react";
import { useAppCtx } from "../../context/AppCtx";
import { selectCurrentProjection } from "../../utils/farmState.js";
import InvItemDashboard from "./InvItemDashboard";

export default function ItemDashboardTooltipDetails({ name, source, onClose, inactive = false }) {
  const { data: { dataSetFarm, dataSet }, ui, actions: { loadItemDashboardData } } = useAppCtx();
  const farmId = String(dataSetFarm?.frmid || dataSet?.options?.farmId || "");
  const loaderRef = useRef(loadItemDashboardData);
  loaderRef.current = loadItemDashboardData;
  const [request, setRequest] = useState({ farmId: "", status: "loading" });
  const [retry, setRetry] = useState(0);
  const dashboardFarm = request.payload;
  const projection = selectCurrentProjection(dashboardFarm, "invData");
  const projectedItem = projection?.itables?.it?.[name];
  const rootItem = dashboardFarm?.itables?.it?.[name];
  const item = projectedItem || rootItem ? { ...projectedItem, ...rootItem } : null;

  useEffect(() => {
    let cancelled = false;
    setRequest({ farmId, status: "loading" });
    Promise.resolve().then(() => loaderRef.current?.(name)).then((result) => {
      if (!cancelled) setRequest({ farmId, status: result ? "ready" : "error", payload: result });
    }).catch(() => {
      if (!cancelled) setRequest({ farmId, status: "error" });
    });
    return () => { cancelled = true; };
  }, [farmId, name, source, retry, dataSetFarm, dataSet?.options, ui?.selectedTrySeason]);

  const waiting = request.farmId !== farmId || request.status === "loading";
  const failed = request.status === "error";
  if (waiting || failed || !projection || !item) {
    return <div className="inv-item-dashboard-status" role="status">
      <header><strong>{name}</strong><button type="button" onClick={(event) => { event.stopPropagation(); onClose(); }} aria-label="Close item dashboard">×</button></header>
      <p>{waiting ? "Loading item details…" : "Item details unavailable. Refresh the farm or retry."}</p>
      {!waiting && <button type="button" onClick={(event) => { event.stopPropagation(); setRetry((value) => value + 1); }}>Retry</button>}
    </div>;
  }
  return <InvItemDashboard key={`${farmId}:${name}`} name={name} item={item} dashboardFarm={dashboardFarm} onClose={onClose} embedded inactive={inactive} />;
}
