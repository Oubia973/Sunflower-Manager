export default function createAnimalUnitCostContract(values = {}) {
  const productionCost = Number(values.displayedCost || 0);
  const marketAfterTax = Number(values.marketCostU || 0);
  const profitMultiplier = productionCost > 0 ? marketAfterTax / productionCost : null;
  const allocationMode = Number(values.allocationMode ?? 0);
  const allocationLabel = ["By quantity", "By market value", "Full cost per product"][allocationMode] || "By quantity";
  const foodCycleCost = Number(values.foodCycleCost || 0);
  const outputs = (values.outputs || []).map((output) => {
    const quantity = Number(output.quantity || 0);
    const unitCost = Number(output.unitCost || 0);
    const allocatedCost = unitCost * quantity;
    return {
      name: String(output.name || ""),
      image: String(output.image || ""),
      quantity,
      unitCost,
      allocatedCost,
      share: foodCycleCost > 0 ? allocatedCost / foodCycleCost : 0,
    };
  });
  const selectedOutput = outputs.find((output) => output.name === String(values.product || ""));
  const selectedAllocatedCost = selectedOutput
    ? selectedOutput.allocatedCost
    : productionCost * Number(values.yieldPerCycle || 0);
  const selectedAllocationShare = foodCycleCost > 0 ? selectedAllocatedCost / foodCycleCost : 0;
  return {
    animalName: String(values.animal || ""),
    productName: String(values.product || ""),
    productImage: String(values.productImage || ""),
    productionCost,
    yieldPerCycle: Number(values.yieldPerCycle || 0),
    foodQuantity: Number(values.foodQty || 0),
    foodName: String(values.foodName || ""),
    foodImage: String(values.foodImage || ""),
    foodCycleCost,
    foodCycleMarketCost: Number(values.foodCycleMarketCost || 0),
    currentLevel: values.currentLvl === null || values.currentLvl === undefined ? null : Number(values.currentLvl),
    buyCropsCost: values.buyCropsCostU === null || values.buyCropsCostU === undefined ? null : Number(values.buyCropsCostU),
    marketAfterTax,
    tradeTaxPercent: Number(values.tradeTax || 0),
    profit: marketAfterTax - productionCost,
    profitMultiplier,
    profitPercent: profitMultiplier === null ? null : ((Math.ceil(profitMultiplier * 100) - 100) || 0),
    allocationMode,
    allocationLabel,
    outputs,
    selectedAllocatedCost,
    selectedAllocationShare,
  };
}
