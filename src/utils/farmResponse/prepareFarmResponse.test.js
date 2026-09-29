import { prepareFarmTableResponse, finalizeFarmResponse, normalizeFarmResponseImages, prepareLoadedFarmResponse, prepareTryModalResponse } from "./prepareFarmResponse.js";
import { unpackFarmPayloadTables, applyFarmPayloadTableDeltas } from "../../fct.js";
import { normalizeServerImagesDeep, versionImageUrl } from "../../constants/images.js";
import { applyTradesDeltaToPayload } from "../farmState.js";

// Frozen orchestration from the pre-extraction hook, only retained as a test oracle.
function legacy(current, raw, hashes, config) {
  const unpacked = unpackFarmPayloadTables(raw);
  const result = applyFarmPayloadTableDeltas(current, unpacked, hashes, config);
  const normalized = normalizeServerImagesDeep(result.payload || {});
  if (normalized?.constants?.imgtkt) normalized.constants.imgtkt = versionImageUrl(normalized.constants.imgtkt);
  return { ...result, rawPayload: result.payload, final: result.payload && typeof result.payload === "object"
    ? applyTradesDeltaToPayload(current, normalized) : normalized };
}
const config = { boostTables: ["nft"], itemTables: { xspottry: { sources: ["itables.it"], field: "spottry", baseField: "spot" } } };
const current = { frmid: 901, itables: { it: { Wood: { cost: 1, spottry: 7 } } }, ftrades: { a: { item: "Wood" } } };
const delta = baseHash => ({ _tableDeltas: { itables: { it: {
  baseHash, nextHash: "v2", upserts: { Wood: { cost: 0, img: "./icon/res/wood.png" } }, deletes: [],
} } }, sectionHashes: { inventory: "s2" } });

test.each([undefined, null, {},
  { ftrades: {}, ftradesHeader: { hash: "replacement" }, homeData: { amount: 0 } },
  { _packedTables: { itables: { it: { c: ["cost"], r: [["Wood", [[0, 0]]]] } } } },
  { ftradesDelta: { upserts: { b: { item: "Stone" } }, deletes: ["a"] } },
])("modal adapter matches legacy trade preservation for response %#", raw => {
  const base = { ...current, ftradesHeader: { hash: "existing" } };
  const before = JSON.stringify({ base, raw });
  const expected = { ...(unpackFarmPayloadTables(raw) || {}) };
  delete expected.ftrades;
  delete expected.ftradesHeader;
  if (!Object.prototype.hasOwnProperty.call(expected, "ftrades")) expected.ftrades = base?.ftrades;
  if (!Object.prototype.hasOwnProperty.call(expected, "ftradesHeader")) expected.ftradesHeader = base?.ftradesHeader;
  expect(prepareTryModalResponse(base, raw)).toEqual(expected);
  expect(prepareTryModalResponse({}, raw)).toEqual({ ...expected, ftrades: undefined, ftradesHeader: undefined });
  expect(JSON.stringify({ base, raw })).toBe(before);
});

test.each([
  undefined, null, "", "unexpected", {},
  { homeData: { amount: 0 }, constants: { imgtkt: "./icon/ticket.png?x=1#top" } },
  { itables: { it: { Wood: { cost: 0, img: "./icon/res/wood.png" } } } },
  { _packedTables: { itables: { it: { c: ["cost", "img"], r: [["Wood", [[0, 0], [1, "./icon/res/wood.png"]]]] } } } },
  delta("v1"), delta("wrong"),
  { ftradesDelta: { baseHash: "a", nextHash: "b", upserts: { b: { img: "./icon/res/wood.png" } }, deletes: ["a"] } },
  { bumpkinImg: "https://example.test/avatar.png", itables: { it: { A: { img: "data:image/png;base64,AA", icon: "/icon/a.png" } } } },
])("new preparation matches legacy orchestration for response %#", raw => {
  const before = JSON.stringify({ current, raw });
  const expected = legacy(current, raw, { "itables.it": "v1" }, config);
  const tables = prepareFarmTableResponse(current, raw, { "itables.it": "v1" }, config);
  const final = finalizeFarmResponse(current, tables.payload);
  expect({ ...tables, rawPayload: final.rawPayload, final: final.payload }).toEqual(expected);
  expect(JSON.stringify({ current, raw })).toBe(before);
});

test.each([
  undefined, null, "", {},
  { constants: { imgtkt: "./icon/ticket.png?x=1#top" }, itables: { it: { Wood: { img: "./icon/res/wood.png", cost: 0 } } } },
  { _packedTables: { itables: { it: { c: ["cost", "img"], r: [["Wood", [[0, 0], [1, "./icon/res/wood.png"]]]] } } } },
  delta("v1"),
  { ftradesDelta: { baseHash: "a", nextHash: "b", upserts: { b: { img: "./icon/res/wood.png" } }, deletes: ["a"] } },
])("loader adapter preserves its distinct legacy order for response %#", raw => {
  const before = JSON.stringify({ current, raw });
  const expectedNormalized = normalizeServerImagesDeep(raw || {});
  const normalized = normalizeFarmResponseImages(raw);
  expect(normalized).toEqual(expectedNormalized);
  // The loader still owns ticket/profile processing between these stages.
  for (const value of [normalized, expectedNormalized]) {
    if (value?.constants?.imgtkt) value.constants.imgtkt = versionImageUrl(value.constants.imgtkt);
  }
  const expected = applyTradesDeltaToPayload(current, unpackFarmPayloadTables(expectedNormalized));
  expect(prepareLoadedFarmResponse(current, normalized)).toEqual(expected);
  expect(JSON.stringify({ current, raw })).toBe(before);
});
