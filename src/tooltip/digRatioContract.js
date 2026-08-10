export function convertDigCoins(value, currency, coinsRatio) {
  const number = Number(value || 0);
  const ratio = Number(coinsRatio || 0);
  return currency === "sfl" && ratio > 0 ? number / ratio : number;
}

export function buildDigRatioContract({ itemName, row, mode, currency, coinsRatio, isTotal = false }) {
  const shared = row?.shared || {};
  const values = row?.[mode] || {};
  return {
    itemName,
    itemImage: shared.itemImage || "",
    isTotal,
    quantityToday: Number(shared.quantityToday || 0),
    patternQuantity: Number(shared.patternQuantity || 0),
    stock: Number(shared.stock || 0),
    supply: Number(shared.supply || 0),
    stockValue: convertDigCoins(values.stockValueCoins, currency, coinsRatio),
    digValue: convertDigCoins(values.digValueCoins, currency, coinsRatio),
    toolCost: convertDigCoins(values.toolCostCoins, currency, coinsRatio),
    ratioCoinsPerSfl: Number(values.ratioCoinsPerSfl || 0),
    patternValue: convertDigCoins(values.patternValueCoins, currency, coinsRatio),
    patternToolCost: convertDigCoins(values.patternToolCostCoins, currency, coinsRatio),
    patternRatioCoinsPerSfl: Number(values.patternRatioCoinsPerSfl || 0),
    coinsRatio: Number(coinsRatio || 0),
  };
}
