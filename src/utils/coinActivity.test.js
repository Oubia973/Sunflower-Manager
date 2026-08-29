import {
  calculateCoinFlow,
  createCoinBaseline,
  getDailyCoinFlow,
  getTodayDeliverySummary,
} from "./coinActivity.js";

function memoryStorage() {
  const values = {};
  return {
    getItem: (key) => values[key] || null,
    setItem: (key, value) => { values[key] = value; },
  };
}

const first = {
  schema: 1,
  counters: { coinsEarned: 1000, coinsSpent: 400 },
  bettySales: { Sunflower: { count: 10, unitCoins: 2 } },
};

test("calculates exact counter deltas and estimated Betty value", () => {
  const baseline = createCoinBaseline(first, new Date(2026, 7, 29, 8));
  const flow = calculateCoinFlow({
    ...first,
    counters: { coinsEarned: 1400, coinsSpent: 550 },
    bettySales: { Sunflower: { count: 13, unitCoins: 2 } },
  }, baseline);

  expect(flow).toEqual({
    earned: 400,
    spent: 150,
    net: 250,
    bettyQuantity: 3,
    bettyValueCoins: 6,
  });
});

test("starts a local baseline and reuses it during the same day", () => {
  const storage = memoryStorage();
  const now = new Date(2026, 7, 29, 8);
  expect(getDailyCoinFlow(first, 1972, storage, now).startedNow).toBe(true);

  const later = {
    ...first,
    counters: { coinsEarned: 1250, coinsSpent: 500 },
  };
  expect(getDailyCoinFlow(later, 1972, storage, new Date(2026, 7, 29, 9))).toMatchObject({
    startedNow: false,
    earned: 250,
    spent: 100,
    net: 150,
  });
});

test("restarts the baseline on a new day", () => {
  const storage = memoryStorage();
  getDailyCoinFlow(first, 1972, storage, new Date(2026, 7, 29, 23));
  const next = {
    ...first,
    counters: { coinsEarned: 1300, coinsSpent: 450 },
  };
  expect(getDailyCoinFlow(next, 1972, storage, new Date(2026, 7, 30, 1))).toMatchObject({
    startedNow: true,
    earned: 0,
    spent: 0,
  });
});

test("filters completed deliveries to the local day", () => {
  const activity = {
    deliveryRewards: [
      { completedAt: "2026-08-29T08:00:00", coins: 500, costFlower: 0.4 },
      { completedAt: "2026-08-28T08:00:00", coins: 900, costFlower: 0.8 },
    ],
  };
  expect(getTodayDeliverySummary(activity, new Date(2026, 7, 29, 12))).toEqual({
    coins: 500,
    costFlower: 0.4,
    count: 1,
  });
});
