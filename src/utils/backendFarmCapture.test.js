import fs from "fs";
import { unpackFarmPayloadTables, mergeFarmStateDeep, stripFarmMetadata } from "../fct.js";

// Explicit private artifact only; no live API or Mongo access inside Jest.
const capturePath = process.env.SFL_REORGANISATION_CAPTURE;
const captureTest = capturePath ? test : test.skip;

captureTest("real isolated backend capture remains readable through the current frontend merger", () => {
  const capture = JSON.parse(fs.readFileSync(capturePath, "utf8"));
  expect(capture.schema).toBe(1);
  expect(capture.diagnostics.violations).toEqual([]);
  const wire = capture.cases.cache.wire;
  const config = { boostTables: Object.keys(wire.boostables), itemTables: {
    xfarmit: { sources: ["itables.it"], field: "farmit", baseField: "farmit" },
    xspottry: { sources: ["itables.it"], field: "spottry", baseField: "spot" },
  } };
  const received = unpackFarmPayloadTables(wire);
  const merged = stripFarmMetadata(mergeFarmStateDeep({}, received, config));
  expect(merged.frmid).toBe(wire.frmid);
  expect(merged.farmMeta.balance).toEqual(wire.farmMeta.balance);
  for (const name of ["Sunflower", "Wood", "Stone", "Egg", "Milk"]) {
    for (const field of ["instock", "yield", "time", "dailycycle", "pcost", "dailysfl"]) {
      expect(merged.itables.it[name][field]).toEqual(wire.itables.it[name][field]);
    }
  }
  const refreshed = mergeFarmStateDeep(merged, { frmid: wire.frmid, homeData: wire.homeData }, config);
  expect(refreshed.itables.it).toEqual(merged.itables.it);
  expect(refreshed.homeData._source.contentHash).toBe(wire.homeData._source.contentHash);
  expect(refreshed.itables.it.Sunflower.spottry).toBe(merged.itables.it.Sunflower.spottry);
});
