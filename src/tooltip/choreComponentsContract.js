export function selectChoreComponentsContract(source, forTry) {
  const mode = forTry ? "try" : "active";
  const rows = Object.entries(source?.rows || {}).map(([name, entry]) => ({
    name,
    ...(entry?.shared || {}),
    ...(entry?.[mode] || {}),
  }));
  return {
    rows,
    totalCost: Number(source?.totals?.[mode]?.totalCost || 0),
    totalMarket: Number(source?.totals?.[mode]?.totalMarket || 0),
  };
}
