import React from "react";
import LegacyTooltip from "./Tooltip.jsx";
import ModernTooltip from "./modern/ModernTooltip.jsx";
import { buildCropMachineRows } from "../tables/CropMachineReadable.jsx";
import { selectCurrentProjection } from "../utils/farmState.js";
import {
  buildCompositionCatalog,
  resolveDailyProfitContract,
  resolveMarketComparisonContract,
  resolveCompositionTooltipContract,
  resolveProductionCostContract,
} from "./resolvers/inventoryTooltipResolvers.js";

export const MODERN_TOOLTIP_CONTEXTS = new Set([
  "dailysfl",
  "boostdetails",
  "gainh",
  "buildcraft",
  "dailyBurn",
  "th",
  "costp",
  "harvest",
  "market",
  "costitem",
  "cookcost",
  "craftcompo",
  "shrinecost",
  "crustaceancost",
  "cmgainh",
  "cmdailysfl",
]);

export function shouldUseModernTooltip(interfaceMode, context, contract) {
  return interfaceMode === "compact"
    && MODERN_TOOLTIP_CONTEXTS.has(context)
    && !!contract;
}

export function resolveCropMachineTooltipContract(dataSet, dataSetFarm, item, context, forTry, cropMachineUi) {
  if (!["cmgainh", "cmdailysfl"].includes(context)) return null;
  const source = selectCurrentProjection(dataSetFarm, "cropMachineData") || dataSetFarm;
  const it = source?.itables?.it;
  const machine = source?.CropMachine;
  const options = dataSet?.options;
  if (!it || !machine || !options || !item) return null;
  const row = buildCropMachineRows({
    it,
    machine,
    options,
    tryMode: forTry,
    seedMode: cropMachineUi?.selectedSeeds || "stock",
    customSeeds: cropMachineUi?.customSeeds,
    selectedCrops: cropMachineUi?.selectedCrops,
  }).find((candidate) => candidate.name === item);
  if (!row) return null;
  return context === "cmgainh" ? row.gainTooltip : row.dailyTooltip;
}

export default function TooltipRouter(props) {
  const { dataSet, dataSetFarm, forTry, interfaceMode } = props;
  let contract = null;
  if (["cmgainh", "cmdailysfl"].includes(props.context)) {
    contract = resolveCropMachineTooltipContract(dataSet, dataSetFarm, props.item, props.context, forTry, props.cropMachineUi);
  } else if (props.context === "dailysfl") {
    contract = resolveDailyProfitContract(dataSetFarm, props.item, forTry);
  } else if (props.context === "costp" || props.context === "harvest") {
    contract = resolveProductionCostContract(dataSetFarm, props.item, forTry);
  } else if (props.context === "market") {
    contract = resolveMarketComparisonContract(dataSetFarm, props.item, forTry, {
      quantity: props.value?.itemQuant,
      includeProductionCost: props.value?.CostChecked,
    });
  } else if (["costitem", "cookcost", "craftcompo", "shrinecost", "crustaceancost"].includes(props.context)) {
    contract = resolveCompositionTooltipContract(dataSetFarm, props.context, props.item, props.value, forTry);
  } else if (props.context === "th") {
    contract = props.item ? { key: props.item } : null;
  } else if (props.value && typeof props.value === "object") {
    contract = props.value;
  }

  if (shouldUseModernTooltip(interfaceMode, props.context, contract)) {
    return <ModernTooltip {...props} contract={contract} compositionCatalog={buildCompositionCatalog(dataSetFarm)} />;
  }

  return <LegacyTooltip {...props} />;
}
