import { applyFarmPayloadTableDeltas, mergeFarmStateDeep } from "../fct.js";

const tryitConfig = {
  boostTables: ["skill"],
  itemTables: {
    xcookit: { sources: ["itables.food"], field: "cookit", baseField: "cookit" },
    xspottry: { sources: ["itables.it"], field: "spottry", baseField: "spot" },
    xspot2try: { sources: ["itables.it"], field: "spot2try", baseField: "spot2" },
    xspot3try: { sources: ["itables.it"], field: "spot3try", baseField: "spot3" },
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

test("keeps frontend-owned Tryset spots during a full table replacement", () => {
  const current = {
    itables: {
      it: {
        Wood: { spot: 5, spottry: 12, spot2try: 2, spot3try: 1, cost: 10 },
        Stone: { spot: 4, spottry: 7, spot2try: 0, spot3try: 0, cost: 20 },
      },
    },
  };
  const response = {
    _replaceTables: ["itables.it"],
    itables: {
      it: {
        Wood: { spot: 6, spottry: 0, spot2try: 0, spot3try: 0, cost: 11 },
        Stone: { spot: 8, cost: 21 },
        Gold: { spot: 1, cost: 30 },
      },
    },
  };

  const merged = mergeFarmStateDeep(current, response, tryitConfig);

  expect(merged.itables.it.Wood).toEqual({
    spot: 6, spottry: 12, spot2try: 2, spot3try: 1, cost: 11,
  });
  expect(merged.itables.it.Stone).toEqual({
    spot: 8, spottry: 7, spot2try: 0, spot3try: 0, cost: 21,
  });
  expect(merged.itables.it.Gold).toEqual({ spot: 1, cost: 30 });
});

test("ignores echoed server Tryset spots during a normal deep merge", () => {
  const current = {
    itables: {
      it: {
        Wood: { spot: 5, spottry: 12, spot2try: 2, spot3try: 1 },
      },
    },
  };
  const response = {
    itables: {
      it: {
        Wood: { spot: 6, spottry: 0, spot2try: 0, spot3try: 0 },
      },
    },
  };

  const merged = mergeFarmStateDeep(current, response, tryitConfig);

  expect(merged.itables.it.Wood).toEqual({
    spot: 6, spottry: 12, spot2try: 2, spot3try: 1,
  });
});
