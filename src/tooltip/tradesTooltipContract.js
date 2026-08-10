const TYPE_LABELS = {
  resources: "Resources",
  nft: "Boosts",
  bud: "Buds",
  pet: "Pets",
  other: "Other",
};

function normalizeType(value) {
  const type = String(value || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(TYPE_LABELS, type) ? type : "other";
}

export function buildTradesTooltipContract(trades, tradesHeader) {
  const headerRows = Array.isArray(tradesHeader) ? tradesHeader.filter((row) => row?.name) : [];
  const metaByName = Object.fromEntries(headerRows.map((row) => [String(row.name).trim().toLowerCase(), row]));
  const tradeRows = trades && typeof trades === "object" && !Array.isArray(trades) ? Object.values(trades) : [];
  if (tradeRows.length < 1) {
    return {
      headerRows: headerRows.map((row) => ({ name: row.name, image: row.img || "", sold: !!row.fulfilledAt })),
      rows: [],
      totals: [],
    };
  }

  const totals = Object.fromEntries(Object.entries(TYPE_LABELS).map(([type, label]) => [type, {
    type, label, count: 0, soldPriceNet: 0, priceNet: 0, marketPriceNet: 0,
  }]));
  const rows = tradeRows.map((trade) => {
    const [itemName, rawQuantity] = Object.entries(trade?.items || {})[0] || [];
    if (!itemName) return null;
    const meta = metaByName[String(itemName).trim().toLowerCase()] || {};
    const quantity = Number(rawQuantity || 0);
    const price = Number(trade?.sfl || 0);
    const marketPrice = Number(meta?.floor || 0) * quantity;
    const category = normalizeType(meta?.category);
    const netRate = Number.isFinite(Number(meta?.netRate)) ? Number(meta.netRate) : 1;
    const sold = !!trade?.fulfilledAt;
    const target = totals[category];
    target.count += 1;
    target.priceNet += price * netRate;
    target.marketPriceNet += marketPrice * netRate;
    if (sold) target.soldPriceNet += price * netRate;
    return {
      itemName,
      itemImage: meta?.img || "",
      quantity,
      sold,
      price,
      marketPrice,
      marketDiffPercent: marketPrice > 0 ? ((price - marketPrice) / marketPrice) * 100 : null,
      createdAt: trade?.createdAt || 0,
    };
  }).filter(Boolean);

  return {
    headerRows: [],
    rows,
    totals: Object.values(totals).filter((row) => row.count > 0),
  };
}
