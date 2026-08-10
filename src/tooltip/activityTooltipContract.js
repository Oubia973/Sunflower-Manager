export function buildActivityXpTooltipContract(date, totalXp, items, getItemImage) {
  const rows = Object.entries(items || {})
    .map(([dish, info]) => ({
      dish,
      qty: Number(info?.qty || 0),
      xpUnit: Number(info?.xpUnit || 0),
      xpTotal: Number(info?.xpTotal || 0),
      img: getItemImage?.(dish) || "",
    }))
    .filter((row) => row.qty > 0 || row.xpTotal > 0)
    .sort((a, b) => b.xpTotal - a.xpTotal);
  return { date, totalXp: Number(totalXp || 0), rows };
}
