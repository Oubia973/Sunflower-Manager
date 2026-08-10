export default function createAnimalUnitCostContract(values = {}) {
  const productionCost = Number(values.displayedCost || 0);
  const marketAfterTax = Number(values.marketCostU || 0);
  const profitMultiplier = productionCost > 0 ? marketAfterTax / productionCost : null;
  return {
    animalName: String(values.animal || ""),
    productName: String(values.product || ""),
    productImage: String(values.productImage || ""),
    productionCost,
    yieldPerCycle: Number(values.yieldPerCycle || 0),
    foodQuantity: Number(values.foodQty || 0),
    foodName: String(values.foodName || ""),
    foodImage: String(values.foodImage || ""),
    foodCycleCost: Number(values.foodCycleCost || 0),
    foodCycleMarketCost: Number(values.foodCycleMarketCost || 0),
    currentLevel: values.currentLvl === null || values.currentLvl === undefined ? null : Number(values.currentLvl),
    buyCropsCost: values.buyCropsCostU === null || values.buyCropsCostU === undefined ? null : Number(values.buyCropsCostU),
    marketAfterTax,
    tradeTaxPercent: Number(values.tradeTax || 0),
    profit: marketAfterTax - productionCost,
    profitMultiplier,
    profitPercent: profitMultiplier === null ? null : ((Math.ceil(profitMultiplier * 100) - 100) || 0),
  };
}
