import { extractReceivedTableHashes, mergeKnownHashesFromPayload } from "../farmState.js";

// Frozen fetcher block; refs' identity is part of its observable behavior.
function legacy(payload, sections, tables) {
  if (payload?.sectionHashes && typeof payload.sectionHashes === "object") {
    sections.current = { ...(sections.current || {}), ...payload.sectionHashes };
  }
  if (payload?.tableHashes && typeof payload.tableHashes === "object") {
    const picked = extractReceivedTableHashes(payload, payload.tableHashes);
    tables.current = { ...(tables.current || {}), ...picked };
  }
}

test.each([
  undefined, null, "", {},
  { sectionHashes: {}, tableHashes: {} },
  { sectionHashes: null, tableHashes: null },
  { sectionHashes: "bad", tableHashes: "bad" },
  { sectionHashes: 42, tableHashes: true },
  { sectionHashes: ["s2"], tableHashes: ["t2"] },
  { sectionHashes: { home: "s2" }, tableHashes: { "itables.it": "not-received" } },
  { itables: { it: {} }, tableHashes: { "itables.it": "t2", "itables.food": "not-received" } },
  { boostables: { nft: { A: { tryit: 0 } } }, tableHashes: { "boostables.nft": "b2" } },
  { itables: { it: null }, tableHashes: { "itables.it": "t2" } },
])("shared hash adoption preserves the fetcher contract for response %#", payload => {
  const before = JSON.stringify(payload);
  const make = () => ({ sections: { current: { home: "s1", trades: "independent" } }, tables: { current: { "itables.it": "t1" } } });
  const expected = make(), actual = make();
  const oldExpectedSections = expected.sections.current, oldExpectedTables = expected.tables.current;
  const oldActualSections = actual.sections.current, oldActualTables = actual.tables.current;
  legacy(payload, expected.sections, expected.tables);
  mergeKnownHashesFromPayload(payload, actual.sections, actual.tables);
  expect(actual).toEqual(expected);
  expect(actual.sections.current === oldActualSections).toBe(expected.sections.current === oldExpectedSections);
  expect(actual.tables.current === oldActualTables).toBe(expected.tables.current === oldExpectedTables);
  expect(JSON.stringify(payload)).toBe(before);
});

test("only a received table restores an invalidated hash; unrelated sections stay known", () => {
  const sections = { current: { home: "s1" } }, tables = { current: {} };
  mergeKnownHashesFromPayload({ tableHashes: { "itables.it": "t2" } }, sections, tables);
  expect(tables.current).toEqual({});
  mergeKnownHashesFromPayload({ itables: { it: { Wood: { cost: 0 } } }, tableHashes: { "itables.it": "t2" } }, sections, tables);
  expect(tables.current).toEqual({ "itables.it": "t2" });
  expect(sections.current).toEqual({ home: "s1" });
});

test("the loader's truthy legacy guard differs on malformed hash primitives", () => {
  const sections = { current: { home: "s1" } }, tables = { current: { "itables.it": "t1" } };
  const payload = { sectionHashes: "bad", tableHashes: "bad" };
  const loaderSections = { ...sections.current, ...payload.sectionHashes };
  const loaderTables = { ...tables.current, ...extractReceivedTableHashes(payload, payload.tableHashes) };
  const previousTables = tables.current;
  mergeKnownHashesFromPayload(payload, sections, tables);
  expect(sections.current).not.toEqual(loaderSections);
  expect(tables.current).toEqual(loaderTables);
  expect(tables.current).toBe(previousTables); // loader would replace this ref.
});
