import { mergeFarmResponse } from "./mergeFarmResponse.js";
import { mergeFarmStateDeep } from "../../fct.js";
import { syncTryitStateAcrossFarmState } from "../../tryitStorage.js";

const config = { boostTables: ["nft", "skill"], itemTables: {
  xspottry: { sources: ["itables.it"], field: "spottry", baseField: "spot" },
} };
const current = {
  frmid: 901, boostables: { nft: { A: { tryit: 1 } }, skill: { B: { tryit: 2, leveltry: 2 } } },
  itables: { it: { Sunflower: { spot: 2, spottry: 7, cost: 4 } } },
  ftrades: { a: { item: "Wood" } }, tableHashes: { "itables.it": "old" },
};
const response = {
  itables: { it: { Sunflower: { cost: 0, spottry: 0 } } },
  boostables: { nft: { A: { tryit: 0 } } },
  tableHashes: { "itables.it": "new" },
};

test.each([
  [current, response, config, { nft: { A: 0 }, skill: { B: 3 }, xspottry: { Sunflower: 0 } }],
  [current, response, config, { nft: { A: 1 }, xspottry: { Sunflower: 9 } }],
  [current, response, config, {}],
  [current, response, config, null],
  [current, response, null, { nft: { A: 0 } }],
  [{}, { ...response, frmid: 902 }, config, { nft: { A: 1 } }],
  [current, { homeData: { amount: 0 } }, config, { nft: { A: 1 } }],
  [current, { tryNftData: response }, config, { nft: { A: 1 }, xspottry: { Sunflower: 9 } }],
  [current, undefined, config, null],
])("merge/sync matches the historical sequence for case %#", (base, payload, cfg, snapshot) => {
  const before = JSON.stringify({ base, payload, cfg, snapshot });
  const expected = syncTryitStateAcrossFarmState(mergeFarmStateDeep(base, payload, cfg), cfg, snapshot);
  expect(mergeFarmResponse(base, payload, cfg, snapshot)).toEqual(expected);
  expect(JSON.stringify({ base, payload, cfg, snapshot })).toBe(before);
});

test("the caller's latest state and explicit snapshot take priority over captured state", () => {
  const latest = { ...current, ftrades: { newer: { item: "Stone" } }, homeData: { amount: 5 } };
  const result = mergeFarmResponse(latest, response, config, { nft: { A: 0 }, xspottry: { Sunflower: 0 } });
  expect(result.ftrades).toEqual(latest.ftrades);
  expect(result.homeData.amount).toBe(5);
  expect(result.itables.it.Sunflower).toMatchObject({ cost: 0, spottry: 0 });
  expect(result.boostables.nft.A.tryit).toBe(0);
});
