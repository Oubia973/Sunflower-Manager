import { selectCookViewTables } from "./cookViewTables.js";

const completeProjection = (overrides = {}) => ({
  it: {},
  food: {},
  pfood: {},
  fish: {},
  bounty: {},
  crustacean: {},
  ...overrides,
});

test("Cook uses current projected calculations and preserves local recipe choices", () => {
  const canonical = {
    it: { Sunflower: { cost: 1, farmit: 0 } },
    food: { "Sunflower Cake": { xptry: 100, cookit: 1 } },
    pfood: { "Seasonal Soup": { xptry: 50, cookit: 0 } },
    fish: {},
    bounty: {},
    crustacean: {},
  };
  const projected = completeProjection({
    it: { Sunflower: { cost: 2, farmit: 1 } },
    food: { "Sunflower Cake": { xptry: 110 } },
    pfood: { "Seasonal Soup": { xptry: 55 } },
  });

  const selected = selectCookViewTables(canonical, projected);

  expect(selected.food["Sunflower Cake"]).toEqual({ xptry: 110, cookit: 1 });
  expect(selected.pfood["Seasonal Soup"]).toEqual({ xptry: 55, cookit: 0 });
  expect(selected.it.Sunflower).toEqual({ cost: 2, farmit: 0 });
  expect(projected.food["Sunflower Cake"]).toEqual({ xptry: 110 });
});

test("Cook falls back to canonical tables until its complete projection is available", () => {
  const canonical = completeProjection({ food: { Cake: { xptry: 100, cookit: 1 } } });
  const incompleteProjection = { food: { Cake: { xptry: 110 } } };

  expect(selectCookViewTables(canonical, incompleteProjection)).toBe(canonical);
});

test.each([
  [0, 100],
  [1, 105],
  [2, 107.5],
  [3, 110],
])("Cook exposes the projected Munching Mastery XP for rank %i", (_rank, xptry) => {
  const canonical = completeProjection({ food: { Cake: { xptry: 100, cookit: 1 } } });
  const projected = completeProjection({ food: { Cake: { xptry } } });

  expect(selectCookViewTables(canonical, projected).food.Cake.xptry).toBe(xptry);
});
