/**
 * Balance utility functions.
 */

export function getBalanceValue(balance, key = "sfl") {
  if (balance && typeof balance === "object") {
    return Number(balance[key] || 0);
  }
  return key === "sfl" ? Number(balance || 0) : 0;
}

export function hasBalanceData(balance) {
  if (balance && typeof balance === "object") {
    return Object.values(balance).some((value) => Number(value || 0) > 0);
  }
  return Number(balance || 0) > 0;
}
