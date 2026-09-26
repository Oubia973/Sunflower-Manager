import React, { act } from "react";
import { createRoot } from "react-dom/client";
import useTrysetDraft from "./useTrysetDraft.js";
import { readTryitSnapshot, writeTryitSnapshot } from "../../tryitStorage.js";
import ModalTNFT from "../../ftrynft.js";
import QuickTryDrawer from "../QuickTryDrawer.jsx";
import { AppCtx } from "../../context/AppCtx.js";
import { fetchJson } from "../../services/apiClient.js";

jest.mock("../../services/apiClient.js", () => ({ fetchJson: jest.fn() }));
const config = { boostTables: ["nft", "skill"], itemTables: { spots: { sources: ["itables.it"], field: "spottry" } } };
const farm = { frmid: "123", boostables: { nft: { A: { tryit: 1, isactive: 1 }, B: { tryit: 1, isactive: 1 } }, skill: { S: { level: 2, leveltry: 2, maxLevel: 3 } } }, itables: { it: { Wood: { spottry: 4 } } } };
let draft, root, container;
const publish = jest.fn();
function Harness({ state = farm, quick = false, full = false }) {
  draft = useTrysetDraft(state, config);
  const context = { trysetDraft: draft, data: { dataSet: { options: { farmId: "123" } }, dataSetFarm: state, priceData: [] }, config: { API_URL: "", tryitConfig: config }, ui: { TryChecked: true, selectedTrySeason: "spring" }, actions: { handleRefreshfTNFT: publish, setUIField: jest.fn(), handleUIChange: jest.fn() } };
  return <AppCtx.Provider value={context}>{quick && <QuickTryDrawer knownTableHashes={state.tableHashes || {}} />}{full && <ModalTNFT onClose={jest.fn()} />}</AppCtx.Provider>;
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  writeTryitSnapshot({ nft: { A: 1, B: 1 }, skill: { S: 2 }, spots: { Wood: 4 } });
  fetchJson.mockReset();
  publish.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("pending edits survive zero-valued server refreshes and do not overwrite the saved configuration", async () => {
  await act(async () => root.render(<Harness />));
  const previous = draft.state;
  const edited = JSON.parse(JSON.stringify(previous));
  edited.boostables.nft.A.tryit = 0;
  edited.boostables.skill.S.leveltry = 0;
  await act(async () => draft.stage(previous, edited));
  await act(async () => root.render(<Harness state={{ ...farm, boostables: { nft: { A: { tryit: 0 }, B: { tryit: 0 } }, skill: { S: { level: 2, leveltry: 0 } } } }} />));
  expect(draft.state.boostables.nft.B.tryit).toBe(1);
  expect(draft.state.boostables.nft.A.tryit).toBe(0);
  expect(draft.state.boostables.skill.S.leveltry).toBe(0);
  expect(draft.isPending("nft", "A")).toBe(true);
  expect(draft.isPending("nft", "B")).toBe(false);
  expect(readTryitSnapshot().nft).toEqual({ A: 1, B: 1 });
  const snapshot = draft.snapshot;
  await act(async () => { draft.begin(); draft.finish(); });
  expect(draft.dirty).toBe(true);
  await act(async () => { draft.begin(); draft.finish(snapshot); });
  expect(draft.dirty).toBe(false);
  expect(readTryitSnapshot().skill.S).toBe(0);
});

test("returning a draft to the applied value clears its pending marker", async () => {
  await act(async () => root.render(<Harness />));
  let previous = draft.state;
  await act(async () => draft.stage(previous, { ...previous, boostables: { ...previous.boostables, nft: { ...previous.boostables.nft, A: { tryit: 0 } } } }));
  previous = draft.state;
  await act(async () => draft.stage(previous, { ...previous, boostables: { ...previous.boostables, nft: { ...previous.boostables.nft, A: { tryit: 1 } } } }));
  expect(draft.dirty).toBe(false);
});

test("Quick edits wait for Apply and a failed request keeps the common draft", async () => {
  await act(async () => root.render(<Harness quick />));
  await act(async () => container.querySelector(".quick-try-fab").click());
  expect(container.querySelector(".quick-try .button").disabled).toBe(true);
  await act(async () => container.querySelector(".quick-try-switch input").click());
  expect(fetchJson).not.toHaveBeenCalled();
  expect(draft.dirty).toBe(true);
  expect(container.querySelectorAll(".tryset-pending")).toHaveLength(1);
  expect(readTryitSnapshot().nft.A).toBe(1);
  fetchJson.mockRejectedValue(new Error("Offline"));
  await act(async () => container.querySelector(".quick-try .button").click());
  expect(fetchJson).toHaveBeenCalledTimes(1);
  expect(draft.dirty).toBe(true);
  expect(readTryitSnapshot().nft.A).toBe(1);
  fetchJson.mockResolvedValue({});
  await act(async () => container.querySelector(".quick-try .button").click());
  expect(draft.dirty).toBe(false);
  expect(readTryitSnapshot().nft).toEqual({ A: 0, B: 1 });
});


test("Quick and TryNFT show the same pending choice and applying from TryNFT clears both markers", async () => {
  fetchJson.mockResolvedValue({});
  await act(async () => root.render(<Harness quick full state={{ ...farm, itables: { it: {} } }} />));
  await act(async () => container.querySelector(".quick-try-fab").click());
  await act(async () => container.querySelector(".quick-try-switch input").click());
  const modalCheck = container.querySelector("input.tryset-pending");
  expect(modalCheck).not.toBeNull();
  expect(modalCheck.checked).toBe(false);
  await act(async () => modalCheck.click());
  expect(draft.dirty).toBe(false);
  expect(container.querySelector(".quick-try-switch input").checked).toBe(true);
  await act(async () => modalCheck.click());
  expect(draft.dirty).toBe(true);
  expect(container.querySelector(".quick-try-switch input").checked).toBe(false);
  expect(container.querySelector('[aria-label="Apply Tryset"]').disabled).toBe(false);
  await act(async () => container.querySelector('[aria-label="Apply Tryset"]').click());
  expect(readTryitSnapshot().nft.A).toBe(0);
  expect(draft.dirty).toBe(false);
  expect(container.querySelectorAll(".tryset-pending")).toHaveLength(0);
  expect(container.querySelector(".quick-try .button").disabled).toBe(true);
});


test("an incompatible partial Apply response retries with full tables without resetting other choices", async () => {
  await act(async () => root.render(<Harness quick />));
  await act(async () => container.querySelector(".quick-try-fab").click());
  await act(async () => container.querySelector(".quick-try-switch input").click());
  fetchJson.mockResolvedValueOnce({ _tableDeltas: { boostables: { nft: { baseHash: "wrong-base", nextHash: "v2", upserts: { B: { tryit: 0 } }, deletes: [] } } } });
  fetchJson.mockResolvedValueOnce({ boostables: { nft: { A: { tryit: 0 }, B: { tryit: 0 } } } });
  await act(async () => container.querySelector(".quick-try .button").click());
  expect(fetchJson).toHaveBeenCalledTimes(2);
  expect(fetchJson.mock.calls[1][2].body.knownTableHashes).toEqual({});
  expect(readTryitSnapshot().nft).toEqual({ A: 0, B: 1 });
  expect(draft.dirty).toBe(false);
});


test.each([false, true])("Quick Apply publishes Kuebiko zero crop costs with reduced TryNFT tables (delta=%s)", async (partial) => {
  writeTryitSnapshot({ nft: { Kuebiko: 0 } });
  const state = {
    ...farm,
    tableHashes: { "itables.it": "before" },
    boostables: { ...farm.boostables, nft: { Kuebiko: { tryit: 0, isactive: 0 } } },
    itables: { it: { Carrot: { pcosttry: 9, costtry: 9, spottry: 4 } } },
  };
  await act(async () => root.render(<Harness quick state={state} />));
  await act(async () => container.querySelector(".quick-try-fab").click());
  await act(async () => container.querySelector(".quick-try-switch input").click());
  const row = { pcosttry: 0, costtry: 0, harvesttry: 12 };
  fetchJson.mockResolvedValue({
    ...(partial ? { _tableDeltas: { itables: { it: { baseHash: "before", nextHash: "after", upserts: { Carrot: row }, deletes: [] } } } } : { itables: { it: { Carrot: row } } }),
    tryNftData: { itables: { it: { Carrot: { costtry: 0, harvesttry: 12 } } } },
  });
  await act(async () => container.querySelector(".quick-try .button").click());
  expect(fetchJson).toHaveBeenCalledTimes(1);
  const applied = publish.mock.calls[0][1];
  expect(applied.boostables.nft.Kuebiko.tryit).toBe(1);
  expect(applied.itables.it.Carrot.pcosttry).toBe(0);
  expect(applied.itables.it.Carrot.harvesttry).toBe(12);
  await act(async () => root.render(<Harness quick state={applied} />));
  expect(draft.state.itables.it.Carrot.pcosttry).toBe(0);
});


test("Quick Skills shows compact remaining points/shards and refreshes the budget for unapplied levels", async () => {
  jest.useFakeTimers();
  try {
    fetchJson.mockResolvedValueOnce({ remainingPoints: 5, remainingShards: 10 }).mockResolvedValueOnce({ remainingPoints: -1, remainingShards: 8 });
    const state = { ...farm, skillUpgrade: { availablePoints: 5, shards: 10 } };
    await act(async () => root.render(<Harness quick state={state} />));
    await act(async () => container.querySelector(".quick-try-fab").click());
    expect(container.querySelector(".quick-try-skill-budget")).toBeNull();
    const category = container.querySelector('.quick-try-tools select');
    await act(async () => { category.value = "skill"; category.dispatchEvent(new Event("change", { bubbles: true })); });
    await act(async () => jest.advanceTimersByTime(400));
    let budget = container.querySelector(".quick-try-skill-budget");
    expect(budget.textContent).toContain("Points 5");
    expect(budget.textContent).toContain("Shards 10");
    await act(async () => container.querySelector(".quick-try-level button:last-child").click());
    expect(budget.textContent).not.toContain("Points 5");
    await act(async () => jest.advanceTimersByTime(400));
    budget = container.querySelector(".quick-try-skill-budget");
    expect(budget.textContent).toContain("Points -1");
    expect(budget.textContent).toContain("Shards 8");
    expect(budget.querySelector("strong").style.color).toBe("rgb(255, 142, 142)");
    expect(fetchJson.mock.calls[1][2].body).toEqual({ activeLevels: { S: 2 }, selectedLevels: { S: 3 }, availablePoints: 5, availableShards: 10 });
    expect(fetchJson.mock.calls.every(call => call[1] === "/getskillbudgetcalc")).toBe(true);
    expect(readTryitSnapshot().skill.S).toBe(2);
    await act(async () => { category.value = "all"; category.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(container.querySelector(".quick-try-skill-budget")).toBeNull();
  } finally { jest.useRealTimers(); }
});
