import {
  buildPackedTryitSnapshot,
  readTryitSnapshot,
  writeTryitSnapshot,
} from "./tryitStorage.js";

const config = {
  boostTables: ["nft", "skill"],
  itemTables: {
    xfarmit: { sources: ["itables.it"], field: "farmit", baseField: "farmit" },
  },
};

test("packs a complete snapshot with table indexes", () => {
  const state = {
    boostables: {
      nft: { A: {}, B: {}, C: {} },
      skill: { First: {}, Second: {} },
    },
    itables: { it: { Sunflower: {}, Potato: {} } },
  };
  const snapshot = {
    nft: { B: 1, C: 0 },
    skill: { Second: 4 },
    xfarmit: { Potato: 1 },
  };

  const packed = buildPackedTryitSnapshot(state, snapshot, config);
  expect(packed).toMatchObject({
    mode: "idx-v1",
    tables: {
      nft: [[1, 1], [2, 0]],
      skill: [[1, 4]],
      xfarmit: [[1, 1]],
    },
  });
  expect(packed.keyHashes).toEqual({
    nft: expect.any(String),
    skill: expect.any(String),
    xfarmit: expect.any(String),
  });
});

test("refuses compact encoding when the local catalog is incomplete", () => {
  const state = { boostables: { nft: { A: {} }, skill: {} }, itables: { it: {} } };
  expect(buildPackedTryitSnapshot(state, { nft: { Missing: 1 } }, config)).toBeNull();
});

test("a partial snapshot write does not erase persisted Tryset fields", () => {
  localStorage.removeItem("SFLManTryit");
  writeTryitSnapshot({
    nft: { A: 1 },
    xspottry: { Wood: 12, Stone: 7 },
    xspot2try: { Wood: 2, Stone: 0 },
  });

  writeTryitSnapshot({
    nft: { B: 1 },
    xspottry: { Wood: 15 },
  });

  expect(readTryitSnapshot()).toMatchObject({
    nft: { A: 1, B: 1 },
    xspottry: { Wood: 15, Stone: 7 },
    xspot2try: { Wood: 2, Stone: 0 },
  });
  localStorage.removeItem("SFLManTryit");
});
