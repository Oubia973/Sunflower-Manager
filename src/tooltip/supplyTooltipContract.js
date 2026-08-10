export function buildSupplyTooltipContract(itemName, row) {
  return {
    itemName,
    itemImage: row?.img || "",
    inventory: Number(row?.inv ?? row?.supply ?? 0),
    listed: Number(row?.listed || 0),
    inactive: Number(row?.inactive || 0),
    banned: Number(row?.banned || 0),
    onchain: Number(row?.onchain || 0),
  };
}
