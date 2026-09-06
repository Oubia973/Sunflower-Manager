export const GEMS_PACK_USD_MAP = {
  100: 1.29,
  650: 6.49,
  1350: 12.99,
  2800: 25.99,
  7400: 64.99,
  15500: 129.99,
  200000: 1299.99,
};

export const GEMS_PACK_FLOWER_USD_MAP = {
  100: 1.03,
  650: 5.19,
  1350: 10.39,
  2800: 20.79,
  7400: 51.99,
  15500: 103.99,
  200000: 1039.99,
};

export function getGemsPackUsd(gemsPack) {
  const pack = Number(gemsPack) || 0;
  return GEMS_PACK_USD_MAP[pack] || 0;
}

export function getGemsPackFlowerUsd(gemsPack) {
  const pack = Number(gemsPack) || 0;
  return GEMS_PACK_FLOWER_USD_MAP[pack] || 0;
}

export function computeGemsRatio(gemsPack, usdSfl) {
  const pack = Number(gemsPack) || 0;
  const usdFlower = Number(usdSfl) || 0;
  if (pack <= 0 || usdFlower <= 0) return 0;

  const packUsd = getGemsPackFlowerUsd(pack);
  if (!packUsd) return 0;

  return (packUsd / usdFlower) / pack;
}
