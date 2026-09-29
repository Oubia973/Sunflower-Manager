import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";
import { unpackFarmPayloadTables, applyFarmPayloadTableDeltas, mergeFarmStateDeep } from "../fct.js";
import { applyTradesDeltaToPayload } from "./farmState.js";

const backend = path.resolve(process.cwd(), "../sflman");
// Public frontend CI has no private backend checkout. Report this integration as skipped there.
const integration = fs.existsSync(path.join(backend, "scripts/reorganisation/transport-fixture.js")) ? describe : describe.skip;
integration("local private-backend transport integration", () => {
let trace;
beforeAll(() => {
  trace = JSON.parse(execFileSync(process.execPath, ["scripts/reorganisation/transport-fixture.js"],
    { cwd: backend, timeout: 15000, encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }));
});
function loaded() {
  const current = mergeFarmStateDeep({}, unpackFarmPayloadTables(trace.full), trace.config);
  current.itables.food.Food1.cookit = 1;
  current.itables.it.Sunflower.spottry = 9;
  return current;
}
function expectedFood() {
  return Object.fromEntries(Object.entries(trace.expectedFood).map(([name, row]) => {
    const { cookit, ...serverFields } = row;
    return [name, name === "Food1" ? { ...serverFields, cookit: 1 } : serverFields];
  }));
}

test("actual server packing is decoded before the client merger and preserves zero values", () => {
  expect(trace.full._packedTables.itables.food).toBeDefined();
  const current = loaded();
  expect(current.itables.food.Food0.cost).toBe(0);
  expect(current.itables.food.Food0.dailysfl).toBe(0);
  expect(current.itables.food.Food0.img).toBe("/icon/food/0.png");
  expect(current.homeData.amount).toBe(0);
});

test("actual server delta reconstructs changed/deleted rows while preserving local Try selection", () => {
  const current = loaded(); const before = JSON.stringify(current);
  const result = applyFarmPayloadTableDeltas(current, unpackFarmPayloadTables(trace.incremental), trace.full.tableHashes, trace.config);
  expect(result.rejectedPaths).toEqual([]);
  expect(result.appliedPaths).toEqual(["itables.food"]);
  const next = mergeFarmStateDeep(current, result.payload, trace.config);
  expect(next.itables.food).toEqual(expectedFood());
  expect(next.itables.food.Food2).toBeUndefined();
  expect(next.itables.it.Sunflower.spottry).toBe(9);
  expect(next.homeData).toEqual(current.homeData);
  expect(JSON.stringify(current)).toBe(before);
});

test("wrong client base rejects server delta; full fallback then reconstructs the same table", () => {
  const current = loaded();
  const result = applyFarmPayloadTableDeltas(current, trace.incremental, { "itables.food": "wrong" }, trace.config);
  expect(result.rejectedPaths).toEqual(["itables.food"]);
  const recovered = mergeFarmStateDeep(current, unpackFarmPayloadTables(trace.fallback), trace.config);
  expect(recovered.itables.food).toEqual(expectedFood());
  expect(recovered.itables.it.Sunflower.spottry).toBe(9);
});

test("unchanged section response preserves locally reconstructed tables", () => {
  const current = loaded();
  expect(trace.unchanged.unchangedSections).toEqual(["inventory"]);
  const next = mergeFarmStateDeep(current, unpackFarmPayloadTables(trace.unchanged), trace.config);
  expect(next.itables).toEqual(current.itables);
});
test("actual trades delta reconstructs updates and deletions without changing its base", () => {
  const before = JSON.stringify(trace.tradesFull);
  expect(trace.tradesDelta.ftradesDelta).toBeDefined();
  const received = applyTradesDeltaToPayload(trace.tradesFull, trace.tradesDelta);
  expect(received.ftrades).toEqual(trace.expectedTrades);
  expect(received.ftrades.sale2).toBeUndefined();
  expect(received.ftradesDelta).toBeUndefined();
  expect(JSON.stringify(trace.tradesFull)).toBe(before);
});
test("characterization: trades merger applies delta even when local section base hash differs", () => {
  const current = { ...trace.tradesFull, sectionHashes: { trades: "wrong-base" } };
  const received = applyTradesDeltaToPayload(current, trace.tradesDelta);
  expect(received.ftrades).toEqual(trace.expectedTrades);
});
});
