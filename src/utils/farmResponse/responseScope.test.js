import {
  claimFarmRequestSections,
  currentFarmRequestSections,
  selectFarmResponseSections,
} from "./responseScope.js";

const sectionKeys = {
  home: ["homeData", "boostables"],
  trades: ["ftrades", "ftradesHeader"],
  inventory: ["itables"],
  inv: ["invData", "itables", "boostables"],
};
const tablePaths = {
  home: ["boostables.skill"],
  inventory: ["itables.it"],
  inv: ["itables.it", "boostables.skill"],
};

test("disjoint sections retain ownership while shared table paths supersede it", () => {
  const latest = new Map();
  claimFarmRequestSections(["home", "trades", "inventory"], 1, latest, sectionKeys, tablePaths);
  claimFarmRequestSections(["trades", "inv"], 2, latest, sectionKeys, tablePaths);
  expect(currentFarmRequestSections(["home", "trades", "inventory"], 1, latest, sectionKeys, tablePaths))
    .toEqual([]);
  claimFarmRequestSections(["home", "trades", "inventory"], 3, latest, sectionKeys, tablePaths);
  claimFarmRequestSections(["trades"], 4, latest, sectionKeys, tablePaths);
  expect(currentFarmRequestSections(["home", "trades", "inventory"], 3, latest, sectionKeys, tablePaths))
    .toEqual(["home", "inventory"]);
});

test("partial response retains only accepted tables, deltas, hashes and section coverage", () => {
  const response = {
    frmid: 901, username: "Old", homeData: { amount: 2 }, ftrades: { old: true },
    boostables: { skill: { A: 1 }, nft: { B: 1 } },
    itables: { it: { Sunflower: { instock: 2 } } },
    _packedTables: { boostables: { skill: { packed: true }, nft: { packed: true } } },
    _tableDeltas: { boostables: { skill: { baseHash: "s1" }, nft: { baseHash: "n1" } } },
    _replaceTables: ["boostables.skill", "boostables.nft"],
    tableHashes: { "boostables.skill": "s2", "boostables.nft": "n2", "itables.it": "i2" },
    sectionHashes: { home: "h2", trades: "t2", inventory: "i2" },
    returnedSections: ["home", "trades", "inventory"],
    ftradesEntryHashes: { old: "t1" },
  };
  expect(selectFarmResponseSections(response, ["home"], sectionKeys, tablePaths)).toEqual({
    homeData: { amount: 2 }, boostables: { skill: { A: 1 } },
    _packedTables: { boostables: { skill: { packed: true } } },
    _tableDeltas: { boostables: { skill: { baseHash: "s1" } } },
    _replaceTables: ["boostables.skill"],
    tableHashes: { "boostables.skill": "s2" },
    sectionHashes: { home: "h2" },
    returnedSections: ["home"],
  });
});
