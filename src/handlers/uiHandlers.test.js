import { createUIHandlers } from "./uiHandlers.js";

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
});
