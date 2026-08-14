import { applyFarmPayloadTableDeltas, mergeFarmStateDeep } from "../fct.js";

const tryitConfig = {
  boostTables: ["skill"],
  itemTables: {
    xcookit: { sources: ["itables.food"], field: "cookit", baseField: "cookit" },
  },
};

test("applies a full-row table delta and preserves client-only fields", () => {
  const current = {
    itables: {
      food: {
        "Orange Juice": { cost: 10, staleField: true, cookit: 1 },
        Removed: { cost: 2, cookit: 0 },
      },
    },
  };
  const response = {
    _tableDeltas: {
      itables: {
        food: {
          baseHash: "food-v1",
          nextHash: "food-v2",
          upserts: {
            "Orange Juice": { cost: 20 },
            Added: { cost: 3 },
          },
          deletes: ["Removed"],
        },
      },
    },
    tableHashes: { "itables.food": "food-v2" },
  };

  const result = applyFarmPayloadTableDeltas(current, response, { "itables.food": "food-v1" }, tryitConfig);
  expect(result.rejectedPaths).toEqual([]);
  expect(result.appliedPaths).toEqual(["itables.food"]);
  expect(result.payload._tableDeltas).toBeUndefined();
  expect(result.payload._replaceTables).toContain("itables.food");
  expect(result.payload.itables.food).toEqual({
    "Orange Juice": { cost: 20, cookit: 1 },
    Added: { cost: 3 },
  });
  expect(current.itables.food["Orange Juice"].staleField).toBe(true);

  const merged = mergeFarmStateDeep(current, result.payload, tryitConfig);
  expect(merged.itables.food).toEqual(result.payload.itables.food);
});

test("rejects a delta when the local base hash does not match", () => {
  const response = {
    _tableDeltas: {
      itables: {
        food: { baseHash: "food-v1", nextHash: "food-v2", upserts: {}, deletes: [] },
      },
    },
  };
  const result = applyFarmPayloadTableDeltas(
    { itables: { food: { A: { cost: 1 } } } },
    response,
    { "itables.food": "another-version" },
    tryitConfig
  );
  expect(result.appliedPaths).toEqual([]);
  expect(result.rejectedPaths).toEqual(["itables.food"]);
  expect(result.payload.itables).toBeUndefined();
});
