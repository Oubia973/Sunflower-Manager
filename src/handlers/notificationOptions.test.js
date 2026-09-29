import { initializeNotificationOptionsFromInventory } from "./notificationOptions.js";

function context() {
  const farm = { frmid: 901, itables: { it: { Sunflower: { pcost: 0, dailysfl: 0 } } } };
  const dataSet = { options: { farmId: 901, notifList: [] } };
  const refreshDataSet = jest.fn(() => { dataSet.options.notifList = [["Sunflower", 1]]; });
  return {
    dataSetFarmRef: { current: farm }, dataSet, refreshDataSet, setOptions: jest.fn(),
    sectionPayloadKeys: { inventory: ["itables"] }, sectionTablePaths: { inventory: ["itables.it"] },
    selection: { tryitMode: "active", tryitarrays: {} },
    getTryitRequestPayload: null, getPricesWithOutcome: jest.fn(),
  };
}

test.each(["ignored", "unavailable", "incomplete", "rejected-delta", "applied"])(
  "notification options initialize only after confirmed Inventory (%s)", async kind => {
    const state = context();
    state.getTryitRequestPayload = () => state.selection;
    state.getPricesWithOutcome.mockResolvedValue({
      status: kind === "ignored" ? "ignored" : kind === "unavailable" ? "unavailable" : "applied",
      requestedFarmId: "901", requestedPage: "inv", requestedSections: ["inventory"],
      confirmedSections: kind === "incomplete" ? [] : ["inventory"],
      rejectedTablePaths: kind === "rejected-delta" ? ["itables.it"] : [],
      farm: state.dataSetFarmRef.current,
    });
    const initialized = await initializeNotificationOptionsFromInventory(state);
    expect(state.getPricesWithOutcome).toHaveBeenCalledWith(false, true, ["inventory"], false, "inv", true, "OPTIONS_NOTIFICATIONS");
    expect(initialized).toBe(kind === "applied");
    expect(state.refreshDataSet).toHaveBeenCalledTimes(kind === "applied" ? 1 : 0);
    expect(state.setOptions).toHaveBeenCalledTimes(kind === "applied" ? 1 : 0);
    expect(state.dataSet.options.notifList).toEqual(kind === "applied" ? [["Sunflower", 1]] : []);
  }
);

test.each(["farm", "tryset"])("notification options ignore a pending %s change", async change => {
  const state = context(); let resolveOutcome;
  state.getTryitRequestPayload = () => state.selection;
  state.getPricesWithOutcome.mockImplementation(() => new Promise(resolve => { resolveOutcome = resolve; }));
  const pending = initializeNotificationOptionsFromInventory(state);
  if (change === "farm") state.dataSetFarmRef.current = { ...state.dataSetFarmRef.current, frmid: 902 };
  else state.selection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
  resolveOutcome({ status: "applied", requestedFarmId: "901", requestedPage: "inv",
    requestedSections: ["inventory"], confirmedSections: ["inventory"], rejectedTablePaths: [] });
  expect(await pending).toBe(false);
  expect(state.refreshDataSet).not.toHaveBeenCalled();
  expect(state.dataSet.options.notifList).toEqual([]);
});

test("notification options leave error handling to App", async () => {
  const state = context();
  state.getTryitRequestPayload = () => state.selection;
  state.getPricesWithOutcome.mockRejectedValue(new Error("offline"));
  await expect(initializeNotificationOptionsFromInventory(state)).rejects.toThrow("offline");
  expect(state.refreshDataSet).not.toHaveBeenCalled();
  expect(state.setOptions).not.toHaveBeenCalled();
});
