import { createItemDashboardCache } from "./itemDashboardCache";

test("deduplicates concurrent requests and caches reopenings only within the same farm/settings scope", async () => {
  const cache = createItemDashboardCache();
  const scope = {};
  const load = jest.fn(async () => ({ frmid: 123 }));
  const first = cache(scope, "Carrot", load);
  expect(cache(scope, "Carrot", load)).toBe(first);
  await first;
  await cache(scope, "Carrot", load);
  expect(load).toHaveBeenCalledTimes(1);
  await cache({}, "Carrot", load);
  expect(load).toHaveBeenCalledTimes(2);
});

test("expired responses and rejected requests are retried", async () => {
  const cache = createItemDashboardCache(1000);
  const scope = {};
  const clock = jest.spyOn(Date, "now").mockReturnValue(0);
  const load = jest.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({});
  await expect(cache(scope, "Wood", load)).rejects.toThrow("offline");
  await cache(scope, "Wood", load);
  clock.mockReturnValue(1001);
  await cache(scope, "Wood", load);
  expect(load).toHaveBeenCalledTimes(3);
  clock.mockRestore();
});
