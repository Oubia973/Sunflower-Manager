const STORAGE_KEY = "SFLManCoinDailyBaseline";
const MAX_FARM_BASELINES = 20;

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function localDateKey(value = new Date()) {
  let date = value instanceof Date ? value : new Date(value);
  const legacyMatch = typeof value === "string"
    ? value.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
    : null;
  if (legacyMatch) {
    date = new Date(Date.UTC(
      2000 + Number(legacyMatch[3]),
      Number(legacyMatch[1]) - 1,
      Number(legacyMatch[2]),
      Number(legacyMatch[4]),
      Number(legacyMatch[5]),
      Number(legacyMatch[6])
    ));
  }
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function soldCounts(activity) {
  return Object.fromEntries(
    Object.entries(activity?.bettySales || {}).map(([name, sale]) => [name, number(sale?.count)])
  );
}

export function createCoinBaseline(activity, now = new Date()) {
  return {
    date: localDateKey(now),
    startedAt: now instanceof Date ? now.getTime() : new Date(now).getTime(),
    updatedAt: Date.now(),
    coinsEarned: number(activity?.counters?.coinsEarned),
    coinsSpent: number(activity?.counters?.coinsSpent),
    bettySold: soldCounts(activity),
  };
}

export function calculateCoinFlow(activity, baseline) {
  const earned = Math.max(0, number(activity?.counters?.coinsEarned) - number(baseline?.coinsEarned));
  const spent = Math.max(0, number(activity?.counters?.coinsSpent) - number(baseline?.coinsSpent));
  let bettyQuantity = 0;
  let bettyValueCoins = 0;

  Object.entries(activity?.bettySales || {}).forEach(([name, sale]) => {
    const quantity = Math.max(0, number(sale?.count) - number(baseline?.bettySold?.[name]));
    bettyQuantity += quantity;
    bettyValueCoins += quantity * number(sale?.unitCoins);
  });

  return {
    earned,
    spent,
    net: earned - spent,
    bettyQuantity,
    bettyValueCoins,
  };
}

function readBaselines(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeBaselines(storage, baselines) {
  try {
    const entries = Object.entries(baselines)
      .sort(([, a], [, b]) => number(b?.updatedAt) - number(a?.updatedAt))
      .slice(0, MAX_FARM_BASELINES);
    storage?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Tracking is optional when storage is unavailable.
  }
}

export function getDailyCoinFlow(activity, farmId, storage = globalThis?.localStorage, now = new Date()) {
  const key = String(farmId || "").trim();
  if (!key || !activity || Number(activity?.schema || 0) < 1) return null;

  const today = localDateKey(now);
  const baselines = readBaselines(storage);
  let baseline = baselines[key];
  const countersWentBack = baseline
    && (number(activity?.counters?.coinsEarned) < number(baseline.coinsEarned)
      || number(activity?.counters?.coinsSpent) < number(baseline.coinsSpent));
  const startedNow = !baseline || baseline.date !== today || countersWentBack;

  if (startedNow) {
    baseline = createCoinBaseline(activity, now);
    baselines[key] = baseline;
    writeBaselines(storage, baselines);
  }

  return {
    ...calculateCoinFlow(activity, baseline),
    startedNow,
    startedAt: number(baseline.startedAt),
  };
}

export function getTodayDeliverySummary(activity, now = new Date()) {
  const today = localDateKey(now);
  return (activity?.deliveryRewards || []).reduce((summary, reward) => {
    if (localDateKey(reward?.completedAt) !== today) return summary;
    summary.coins += number(reward?.coins);
    summary.costFlower += number(reward?.costFlower);
    summary.count += 1;
    return summary;
  }, { coins: 0, costFlower: 0, count: 0 });
}

export { STORAGE_KEY as COIN_BASELINE_STORAGE_KEY };
