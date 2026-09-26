import { withTrysetTables } from "./trysetTables.js";

test("a reduced TryNFT table cannot mask the zero production cost returned for Inv", () => {
  const farm = {
    itables: { it: { Carrot: { pcosttry: 0, costtry: 0, harvesttry: 12 } } },
    tryNftData: { itables: { it: { Carrot: { costtry: 9, harvesttry: 10, img: "/carrot.png" } } } },
  };
  const merged = withTrysetTables(farm);
  expect(merged.itables.it.Carrot).toEqual({ pcosttry: 0, costtry: 0, harvesttry: 12, img: "/carrot.png" });
  expect(farm.tryNftData.itables.it.Carrot.costtry).toBe(9);
});

test("a projection-only response remains usable when the canonical table was omitted", () => {
  const result = withTrysetTables({ tryNftData: { itables: { it: { Carrot: { costtry: 0 } } } } });
  expect(result.itables.it.Carrot.costtry).toBe(0);
});

test("an outdated projection does not supplement a current Tryset", () => {
  const farm = { tryitRevision: 2, itables: { it: { Carrot: { pcosttry: 0 } } }, tryNftData: { _source: { tryitRevision: 1 }, itables: { it: { Carrot: { costtry: 9 } } } } };
  expect(withTrysetTables(farm)).toBe(farm);
});
