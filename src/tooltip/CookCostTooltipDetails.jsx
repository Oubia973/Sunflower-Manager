import React from "react";

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export default function CookCostTooltipDetails({
  contracts,
  quantity,
  season,
  initialSeason,
  renderSeasonButtons,
  setCompoTable,
  fallbackImage,
}) {
  const rows = Array.isArray(contracts) ? contracts : [];
  if (rows.length === 0) return <div>Cooking cost details unavailable. Refresh this page to load the current calculation.</div>;

  return <>{rows.map((contract, index) => {
    const seasonal = isObject(contract?.seasonalCostTree) ? contract.seasonalCostTree : null;
    const seasonKeys = seasonal ? Object.keys(seasonal) : [];
    const selectedSeason = seasonal
      ? (seasonal[season] ? season : seasonal[initialSeason] ? initialSeason : seasonal.spring ? "spring" : seasonKeys[0])
      : "";
    const costTree = selectedSeason ? seasonal[selectedSeason] : contract?.costTree;
    if (!isObject(costTree)) {
      return <div key={`${contract?.itemName || "item"}-${index}`}>
        {contract?.itemName || "Item"}: cost details unavailable. Refresh this page to load the current calculation.
      </div>;
    }
    const label = selectedSeason
      ? `${contract.itemName} - ${selectedSeason.charAt(0).toUpperCase()}${selectedSeason.slice(1)}`
      : contract.itemName;
    const table = setCompoTable(contract.itemName, quantity, {
      costTree,
      img: contract.itemImage || fallbackImage,
      label,
    }).table;
    return <React.Fragment key={`${contract.itemName}-${index}`}>
      {seasonKeys.length >= 4 ? renderSeasonButtons(season) : null}
      {table}
    </React.Fragment>;
  })}</>;
}
