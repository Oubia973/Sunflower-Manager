import React from "react";
import { useAppCtx } from "../context/AppCtx";
import TopListsLazyTable from "./TopListsLazy";
import FarmHoldingsSearch from "./FarmHoldingsSearch";
import "../styles/farm-holdings-search.css";

export default function ListsSwitch() {
  const { ui: { listsMode } } = useAppCtx();
  const mode = listsMode === "database" ? "database" : "classic";
  return <div className="lists-content">
    {mode === "classic" ? <TopListsLazyTable /> : <FarmHoldingsSearch />}
  </div>;
}
