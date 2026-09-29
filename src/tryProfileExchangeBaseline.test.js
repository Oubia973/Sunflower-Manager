import { postTrysetSnapshot, computeProfileSummaryPayload } from "./tryProfileSummary.js";
import { fetchJson } from "./services/apiClient.js";

jest.mock("./services/apiClient.js", () => ({ fetchJson: jest.fn() }));
const config = { boostTables: ["nft", "skill"], itemTables: {
  xspottry: { sources: ["itables.it"], field: "spottry", baseField: "spot" },
} };
const farm = () => ({ frmid: 901, sectionHashes: { boosts: "s1" }, tableHashes: { "itables.it": "t1" },
  itables: { it: { Sunflower: { spot: 2, spottry: 3, instock: 0, yield: 1, dailysfl: 0 } } },
  boostables: { nft: { A: { isactive: 0, tryit: 1 } }, skill: { GreenThumb: { level: 1, leveltry: 2 } } } });
const params = () => ({ API_URL: "", frmid: 901, deviceId: "synthetic", options: { tradeTax: 10 },
  username: "Synthetic", tryitConfig: config, currentState: farm(), simulatedSeason: "summer",
  profilePayload: { tables: { nft: [["A"]] }, includeNodes: false }, getScopeTablesFromPayload: () => ["nft"] });
beforeEach(() => fetchJson.mockReset());

test("snapshot posts canonical selection and merges partial response without changing its source", async () => {
  const target = farm(); const before = JSON.stringify(target);
  fetchJson.mockResolvedValue({ itables: { it: { Sunflower: { yield: 2 } } } });
  const result = await postTrysetSnapshot({ ...params(), targetState: target });
  expect(fetchJson.mock.calls[0][1]).toBe("/settry");
  expect(fetchJson.mock.calls[0][2]).toMatchObject({ method: "POST", timeoutMs: 30000, body: {
    frmid: 901, deviceId: "synthetic", simulatedSeason: "summer", tryitMode: "snapshot",
    include: ["inventory", "boosts"], page: "trynft", knownHashes: target.sectionHashes, knownTableHashes: target.tableHashes,
  } });
  expect(result.itables.it.Sunflower).toMatchObject({ instock: 0, spottry: 3, yield: 2 });
  expect(JSON.stringify(target)).toBe(before);
});

test.each(["active", "zero"])("%s summary uses dedicated endpoint and restores the current Try state", async compareMode => {
  const input = params(); const before = JSON.stringify(input.currentState);
  fetchJson.mockResolvedValue({ baseIt: { Sunflower: { yield: 1 } }, targetIt: { Sunflower: { yield: 2 } } });
  const result = await computeProfileSummaryPayload({ ...input, compareMode });
  expect(fetchJson).toHaveBeenCalledTimes(1);
  expect(fetchJson.mock.calls[0][1]).toBe("/settry-summary");
  const body = fetchJson.mock.calls[0][2].body;
  expect(body).toMatchObject({ page: "trynft", include: ["inventory", "boosts"],
    baseTryitarrays: { nft: { A: 0 }, xspottry: { Sunflower: 2 } }, targetTryitarrays: { nft: { A: 1 } } });
  expect(result.restoredCurrent).toEqual(input.currentState);
  expect(result.restoredCurrent).not.toBe(input.currentState);
  expect(result.summaryPayload.compareMode).toBe(compareMode);
  expect(JSON.stringify(input.currentState)).toBe(before);
});

test.each([["active", 2], ["zero", 3]])("%s summary falls back to %i total requests when dedicated endpoint fails", async (compareMode, count) => {
  const input = params();
  fetchJson.mockRejectedValueOnce(new Error("summary unavailable"))
    .mockResolvedValue({ itables: { it: { Sunflower: { yield: 2 } } } });
  const result = await computeProfileSummaryPayload({ ...input, compareMode });
  expect(fetchJson).toHaveBeenCalledTimes(count);
  expect(fetchJson.mock.calls.slice(1).map(call => call[1])).toEqual(Array(count - 1).fill("/settry"));
  expect(result.restoredCurrent).toEqual(input.currentState);
});

test("failed fallback propagates its error without changing the current farm", async () => {
  const input = params(); const before = JSON.stringify(input.currentState);
  fetchJson.mockRejectedValue(new Error("offline"));
  await expect(computeProfileSummaryPayload(input)).rejects.toThrow("offline");
  expect(JSON.stringify(input.currentState)).toBe(before);
});
