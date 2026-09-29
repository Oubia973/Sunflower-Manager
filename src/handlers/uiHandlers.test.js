import { createUIHandlers } from "./uiHandlers.js";

test("season selection marks calculation intent before UI state update", () => {
  let ui = { selectedTrySeason: "spring" };
  const mark = jest.fn();
  const setUI = (next) => { ui = typeof next === "function" ? next(ui) : next; };
  const args = [setUI, jest.fn(), null, { current: false }, ...Array(15).fill(null), mark];
  const handlers = createUIHandlers(...args);
  handlers.handleUIChange({ target: { name: "selectedTrySeason", value: "summer" } });
  expect(mark).toHaveBeenCalledTimes(1);
  expect(ui.selectedTrySeason).toBe("summer");
  handlers.setUIField("selectedTrySeason", "winter");
  expect(mark).toHaveBeenCalledTimes(2);
  expect(ui.selectedTrySeason).toBe("winter");
  handlers.setUIField("selectedInv", "home");
  expect(mark).toHaveBeenCalledTimes(2);
});

describe("UI handlers and versioned projections", () => {
  test("an optimistic item change does not mutate stale page projections", () => {
    const farmState = {
      tryitRevision: 2,
      itables: { it: { Milk: { farmit: 0 } } },
      invData: {
        _source: { section: "inv", tryitRevision: 1 },
        itables: { it: { Milk: { farmit: 0 } } },
      },
      cookData: {
        _source: { section: "cook", tryitRevision: 2 },
        itables: { it: { Milk: { farmit: 0 } } },
      },
    };
    let updatedFarmState = null;
    const pendingSaveRef = { current: false };
    const markTryitPending = jest.fn();
    const buildAndWriteSnapshot = jest.fn();
    const handlers = createUIHandlers(
      jest.fn(),
      (next) => { updatedFarmState = next; },
      null,
      pendingSaveRef,
      markTryitPending,
      buildAndWriteSnapshot,
      null,
      null,
      null,
      null,
      null,
      null,
      farmState,
      {},
    );

    handlers.handleUIChange({
      target: { name: "farmit:Milk", type: "checkbox", checked: true },
    });

    expect(updatedFarmState.itables.it.Milk.farmit).toBe(1);
    expect(updatedFarmState.cookData.itables.it.Milk.farmit).toBe(1);
    expect(updatedFarmState.invData.itables.it.Milk.farmit).toBe(0);
    expect(buildAndWriteSnapshot).toHaveBeenCalledTimes(1);
    expect(buildAndWriteSnapshot.mock.calls[0][0]).toBe(updatedFarmState);
    expect(markTryitPending).not.toHaveBeenCalled();
    expect(pendingSaveRef.current).toBe(true);
  });

  test.each(["ignored", "unavailable", "incomplete", "rejected-delta", "applied", "error"])(
    "BUY advances its timer only after a complete current outcome (%s)", async kind => {
      const cooldown = { current: 0 };
      const normalFirstCycle = { current: false };
      const setDuration = jest.fn();
      const setNextAt = jest.fn();
      const setNonce = jest.fn();
      const setCookie = jest.fn();
      const farm = { frmid: 901, invData: {}, itables: { it: { Sunflower: { pcost: 0, dailysfl: 0 } } },
        boostables: { nft: {} } };
      const farmRef = { current: farm };
      const requestedSections = ["inv", "inventory", "boosts"];
      const getPricesWithOutcome = jest.fn(() => kind === "error"
        ? Promise.reject(new Error("offline"))
        : Promise.resolve({
          status: kind === "ignored" ? "ignored" : kind === "unavailable" ? "unavailable" : "applied",
          requestedFarmId: "901", requestedPage: "inv", requestedSections,
          confirmedSections: kind === "incomplete" ? ["inv", "boosts"] : requestedSections,
          rejectedTablePaths: kind === "rejected-delta" ? ["itables.it"] : [],
        }));
      const getTryitPayload = () => ({ tryitMode: "active", tryitarrays: {} });
      const sectionKeys = { inv: ["invData", "itables", "boostables"], inventory: ["itables"], boosts: ["boostables"] };
      const sectionPaths = { inv: ["itables.it", "boostables.nft"], inventory: ["itables.it"], boosts: ["boostables.nft"] };
      const handlers = createUIHandlers(jest.fn(), jest.fn(), farmRef, { current: false },
        jest.fn(), jest.fn(), cooldown, getPricesWithOutcome, normalFirstCycle, setDuration, setNextAt,
        setNonce, farm, { options: { farmId: 901 } }, {}, setCookie, getTryitPayload, sectionKeys, sectionPaths);
      const log = jest.spyOn(console, "log").mockImplementation(() => {});
      try {
        const result = await handlers.handleInvBuyRefresh();
        expect(result).toBe(kind === "applied");
        expect(getPricesWithOutcome).toHaveBeenCalledWith(false, true, requestedSections, true, "inv", true, "BUY");
        expect(setCookie).toHaveBeenCalledTimes(1);
        expect(cooldown.current).toBeGreaterThan(0);
        expect(normalFirstCycle.current).toBe(kind === "applied");
        expect(setNonce).toHaveBeenCalledTimes(kind === "applied" ? 1 : 0);
        expect(setDuration).toHaveBeenCalledTimes(kind === "applied" ? 1 : 0);
        expect(setNextAt).toHaveBeenCalledTimes(kind === "applied" ? 1 : 0);
      } finally {
        log.mockRestore();
      }
    }
  );

  test.each(["farm", "tryset"])("BUY ignores an applied outcome after a pending %s change", async change => {
    const farm = { frmid: 901, invData: {}, itables: { it: { Sunflower: { pcost: 0, dailysfl: 0 } } },
      boostables: { nft: {} } };
    const farmRef = { current: farm };
    const cooldown = { current: 0 };
    const normalFirstCycle = { current: false };
    const setNonce = jest.fn();
    const setCookie = jest.fn();
    let resolveOutcome;
    let selection = { tryitMode: "active", tryitarrays: {} };
    const getPricesWithOutcome = jest.fn(() => new Promise(resolve => { resolveOutcome = resolve; }));
    const handlers = createUIHandlers(jest.fn(), jest.fn(), farmRef, { current: false },
      jest.fn(), jest.fn(), cooldown, getPricesWithOutcome, normalFirstCycle, jest.fn(), jest.fn(),
      setNonce, farm, { options: { farmId: 901 } }, {}, setCookie, () => selection,
      { inv: ["invData", "itables", "boostables"], inventory: ["itables"], boosts: ["boostables"] },
      { inv: ["itables.it", "boostables.nft"], inventory: ["itables.it"], boosts: ["boostables.nft"] });
    const pending = handlers.handleInvBuyRefresh();
    if (change === "farm") farmRef.current = { ...farm, frmid: 902 };
    else selection = { tryitMode: "snapshot", tryitarrays: { nft: { A: 1 } } };
    resolveOutcome({ status: "applied", requestedFarmId: "901", requestedPage: "inv",
      requestedSections: ["inv", "inventory", "boosts"], confirmedSections: ["inv", "inventory", "boosts"],
      rejectedTablePaths: [] });
    expect(await pending).toBe(false);
    expect(setCookie).toHaveBeenCalledTimes(1);
    expect(cooldown.current).toBeGreaterThan(0);
    expect(normalFirstCycle.current).toBe(false);
    expect(setNonce).not.toHaveBeenCalled();
  });
});
