import React from "react";
import TooltipShell from "./TooltipShell.jsx";
import DailyProfitModern from "./renderers/DailyProfitModern.jsx";
import InventoryTooltipModern from "./renderers/InventoryTooltipModern.jsx";
import InventoryFinancialModern from "./renderers/InventoryFinancialModern.jsx";
import CompositionTooltipModern from "./composition/CompositionTooltipModern.jsx";
import { frmtNb } from "../../fct.js";
import "./modern-tooltip.css";

export default function ModernTooltip({
  onClose,
  item,
  context,
  value,
  clickPosition,
  bdrag = true,
  contract,
  compositionCatalog,
}) {
  const singleCompositionItem = contract?.items?.length === 1 ? contract.items[0] : null;
  const content = context === "dailysfl"
    ? <DailyProfitModern contract={contract} itemName={item} />
    : (["costitem", "cookcost", "craftcompo", "shrinecost", "crustaceancost"].includes(context)
      ? <CompositionTooltipModern contract={contract} catalog={compositionCatalog} hideSingleItemTitle />
      : (["costp", "harvest", "market"].includes(context)
      ? <InventoryFinancialModern context={context} contract={contract} itemName={item} growing={Number(value) > 0} compositionCatalog={compositionCatalog} />
      : <InventoryTooltipModern context={context} contract={contract} itemName={item} />));

  const metadata = {
    boostdetails: { title: contract?.itemName || item, subtitle: "Boost details", icon: contract?.itemImage },
    gainh: { title: contract?.itemName || item, subtitle: "Hourly gain", icon: contract?.itemImage },
    buildcraft: { title: contract?.buildingName || item, subtitle: "Building production", icon: contract?.buildingImage },
    dailyBurn: { title: item, subtitle: "Daily production" },
    th: { title: "Column help", subtitle: item },
    costp: { title: item, subtitle: "Production cost", icon: contract?.itemImage },
    harvest: { title: item, subtitle: Number(value) > 0 ? "Currently growing" : "Average harvest", icon: contract?.itemImage },
    market: { title: item, subtitle: "Marketplace comparison", icon: contract?.itemImage },
    costitem: { title: item, subtitle: "Composition", icon: singleCompositionItem?.itemImage },
    cookcost: { title: Array.isArray(item) ? "Recipe requirements" : item, subtitle: "Cooking composition", icon: singleCompositionItem?.itemImage },
    craftcompo: { title: item, subtitle: "Craft composition", icon: singleCompositionItem?.itemImage },
    shrinecost: { title: item, subtitle: "Shrine composition", icon: singleCompositionItem?.itemImage },
    crustaceancost: { title: item, subtitle: "Crustacean composition", icon: singleCompositionItem?.itemImage },
  }[context] || { title: item, subtitle: "Daily profitability", icon: contract?.itemImage };

  if (!content) return null;

  return (
    <TooltipShell
      title={metadata.title}
      titleSuffix={singleCompositionItem && Number(singleCompositionItem.quantity) > 1
        ? `×${frmtNb(singleCompositionItem.quantity)}`
        : null}
      subtitle={metadata.subtitle}
      icon={metadata.icon}
      draggable={bdrag}
      clickPosition={clickPosition}
      onClose={onClose}
      variant={["costp", "harvest", "costitem", "cookcost", "craftcompo", "shrinecost", "crustaceancost"].includes(context) ? "composition" : ""}
    >
      {content}
    </TooltipShell>
  );
}
