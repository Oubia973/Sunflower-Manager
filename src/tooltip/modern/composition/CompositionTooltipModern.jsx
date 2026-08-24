import React, { useState } from "react";
import { frmtNb } from "../../../fct.js";
import { imgautumn, imgspring, imgsummer, imgwinter } from "../../../constants/images.js";
import CompositionTree from "./CompositionTree.jsx";

const SEASON_ICONS = {
  spring: imgspring.props?.src,
  summer: imgsummer.props?.src,
  autumn: imgautumn.props?.src,
  winter: imgwinter.props?.src,
};

function CompositionItem({ item, initialSeason, catalog, showTitle }) {
  const seasonal = item.seasonalCostTree && typeof item.seasonalCostTree === "object" ? item.seasonalCostTree : null;
  const seasons = seasonal ? Object.keys(seasonal) : [];
  const fallbackSeason = seasonal?.[initialSeason] ? initialSeason : seasonal?.spring ? "spring" : seasons[0];
  const [season, setSeason] = useState(fallbackSeason || "");
  const costTree = season ? seasonal?.[season] : item.costTree;
  const hasQuantity = Number(item.quantity) > 1;
  const hasYield = Number(item.yield) > 0 && Number(item.yield) !== 1;
  if (!costTree) return <div className="modern-tooltip__empty">Composition unavailable for {item.itemName}.</div>;

  return <section className="composition-tooltip__item">
    {showTitle || hasYield ? <div className="composition-tooltip__title">
      {showTitle && item.itemImage ? <img src={item.itemImage} alt="" /> : null}
      {showTitle ? <strong>{item.itemName}</strong> : null}
      {showTitle && hasQuantity ? <span>×{frmtNb(item.quantity)}</span> : null}
      {Number(item.yield) > 0 && Number(item.yield) !== 1 ? <small className="composition-tooltip__created">
        Creates ×{frmtNb(Number(item.quantity) * Number(item.yield))}
        {item.toolImage ? <> per <img src={item.toolImage} alt={item.toolName || "Tool"} title={item.toolName || "Tool"} /></> : null}
      </small> : null}
    </div> : null}
    {seasons.length > 1 ? <div className="composition-tooltip__seasons">
      {seasons.map((key) => <button
        type="button"
        className={season === key ? "is-active" : ""}
        onClick={() => setSeason(key)}
        key={key}
        title={key}
        aria-label={key}
      >
        {SEASON_ICONS[key] ? <img src={SEASON_ICONS[key]} alt="" /> : key.slice(0, 1).toUpperCase()}
      </button>)}
    </div> : null}
    <CompositionTree
      costTree={costTree}
      quantity={item.quantity}
      catalog={catalog}
      totalCost={Number.isFinite(Number(costTree.totalCost)) ? Number(costTree.totalCost) * (Number(item.quantity) || 1) : undefined}
      totalMarket={Number.isFinite(Number(costTree.totalMarket)) ? Number(costTree.totalMarket) * (Number(item.quantity) || 1) : undefined}
    />
  </section>;
}

export default function CompositionTooltipModern({ contract, catalog, hideSingleItemTitle = false }) {
  const items = contract.items || [];
  return <div className="composition-tooltip">
    {items.map((item, index) => <CompositionItem
      key={`${item.itemName}-${index}`}
      item={item}
      initialSeason={contract.initialSeason}
      catalog={catalog}
      showTitle={items.length > 1 || !hideSingleItemTitle}
    />)}
  </div>;
}
