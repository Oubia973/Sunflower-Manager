import { mergeFarmStateDeep } from "../fct.js";

test("projection contracts can replace a finite return with null", () => {
  const previous = {
    invData: {
      tooltipData: {
        dailyProfit: {
          Wood: { try: { profitMultiplier: -2, profitPercent: -300 } },
        },
      },
    },
    farmMeta: { optionalValue: 12 },
  };

  const merged = mergeFarmStateDeep(previous, {
    invData: {
      tooltipData: {
        dailyProfit: {
          Wood: { try: { profitMultiplier: null, profitPercent: null } },
        },
      },
    },
    farmMeta: { optionalValue: null },
  });

  expect(merged.invData.tooltipData.dailyProfit.Wood.try.profitMultiplier).toBeNull();
  expect(merged.invData.tooltipData.dailyProfit.Wood.try.profitPercent).toBeNull();
  expect(merged.farmMeta.optionalValue).toBe(12);
});

test("projection cost trees replace removed recipe ingredients", () => {
  const oilCostTree = (nodes) => ({
    invData: {
      tooltipData: {
        productionCosts: {
          items: {
            Oil: { try: { detail: { kind: "tool", costTree: { nodes } } } },
          },
        },
      },
    },
  });

  const leather = oilCostTree({ Leather: { qty: 10 } });
  const wool = mergeFarmStateDeep(leather, oilCostTree({ Wool: { qty: 20 } }));
  expect(wool.invData.tooltipData.productionCosts.items.Oil.try.detail.costTree.nodes)
    .toEqual({ Wool: { qty: 20 } });

  const leatherAgain = mergeFarmStateDeep(wool, oilCostTree({ Leather: { qty: 10 } }));
  expect(leatherAgain.invData.tooltipData.productionCosts.items.Oil.try.detail.costTree.nodes)
    .toEqual({ Leather: { qty: 10 } });
});
import { collectKnownProjectionHashes, hasSectionData, isProjectionCurrent, selectCurrentProjection } from "./farmState.js";

test("collects only usable local projection hashes", () => {
  expect(collectKnownProjectionHashes({
    cropMachineData: { _source: { contentHash: "crop-v1" } },
    homeData: { _source: { contentHash: "" } },
    boostables: { _source: { contentHash: "ignore-root-table" } },
  })).toEqual({ cropMachineData: "crop-v1" });
});

describe("section readiness contracts", () => {
  test.each([
    ["craft", "craftData", ["itables.it", "itables.flower", "itables.bounty", "itables.craft"]],
    ["bounty", "bountyData", ["itables.it", "itables.bounty"]],
  ])("accepts sparse %s projections without requiring source root tables", (section, projectionKey, tablePaths) => {
    const payload = {
      tryitRevision: 4,
      [projectionKey]: {
        itables: {},
        _source: { section, tryitRevision: 4, contentHash: `${section}-v1` },
      },
    };

    expect(hasSectionData(
      payload,
      section,
      { [section]: [projectionKey] },
      { [section]: tablePaths }
    )).toBe(true);
  });

  test("still requires declared root tables for hybrid page sections", () => {
    const payload = {
      tryitRevision: 4,
      fishData: {
        itables: {},
        _source: { section: "fish", tryitRevision: 4, contentHash: "fish-v1" },
      },
    };

    expect(hasSectionData(
      payload,
      "fish",
      { fish: ["fishData", "itables"] },
      { fish: ["itables.fish", "itables.it"] }
    )).toBe(false);
  });

  test("rejects a stale sparse page projection", () => {
    const payload = {
      tryitRevision: 5,
      craftData: {
        itables: {},
        _source: { section: "craft", tryitRevision: 4, contentHash: "craft-v1" },
      },
    };

    expect(hasSectionData(
      payload,
      "craft",
      { craft: ["craftData"] },
      { craft: ["itables.craft"] }
    )).toBe(false);
  });
});

describe("versioned page projections", () => {
  test("stamps page projections with the response try revision", () => {
    const merged = mergeFarmStateDeep({}, {
      tryitRevision: 7,
      homeData: { blocks: [] },
    });

    expect(merged.homeData._source.tryitRevision).toBe(7);
    expect(isProjectionCurrent(merged, merged.homeData)).toBe(true);
  });

  test("marks a cached page projection stale after another try revision", () => {
    const first = mergeFarmStateDeep({}, {
      tryitRevision: 7,
      homeData: { blocks: [], _source: { section: "home" } },
    });
    const afterTryApply = mergeFarmStateDeep(first, {
      tryitRevision: 8,
      tryNftData: { itables: {} },
    });
    const sectionKeys = { home: ["homeData"] };

    expect(isProjectionCurrent(afterTryApply, afterTryApply.homeData)).toBe(false);
    expect(selectCurrentProjection(afterTryApply, "homeData")).toBeNull();
    expect(selectCurrentProjection(afterTryApply, "tryNftData")).toBe(afterTryApply.tryNftData);
    expect(hasSectionData(afterTryApply, "home", sectionKeys, {})).toBe(false);
    expect(isProjectionCurrent(afterTryApply, afterTryApply.tryNftData)).toBe(true);
  });

  test("accepts a cached projection when the backend confirms its section is unchanged", () => {
    const first = mergeFarmStateDeep({}, {
      tryitRevision: 7,
      homeData: { blocks: [], _source: { section: "home" } },
    });
    const confirmed = mergeFarmStateDeep(first, {
      tryitRevision: 8,
      unchangedSections: ["home"],
    });

    expect(confirmed.homeData._source.tryitRevision).toBe(8);
    expect(selectCurrentProjection(confirmed, "homeData")).toBe(confirmed.homeData);
  });

  test("invalidates a projection when its backend content hash changes", () => {
    const first = mergeFarmStateDeep({}, {
      tryitRevision: 7,
      projectionHashes: { homeData: "hash-a" },
      homeData: {
        blocks: [],
        _source: { section: "home", contentHash: "hash-a" },
      },
    });
    const changedElsewhere = mergeFarmStateDeep(first, {
      tryitRevision: 7,
      projectionHashes: { homeData: "hash-b" },
    });

    expect(changedElsewhere.homeData._source.stale).toBe(true);
    expect(selectCurrentProjection(changedElsewhere, "homeData")).toBeNull();
  });

  test("revalidates an unchanged projection hash for a new Tryset revision", () => {
    const first = mergeFarmStateDeep({}, {
      tryitRevision: 7,
      projectionHashes: { homeData: "hash-a" },
      homeData: {
        blocks: [],
        _source: { section: "home", contentHash: "hash-a" },
      },
    });
    const nextRevision = mergeFarmStateDeep(first, {
      tryitRevision: 8,
      projectionHashes: { homeData: "hash-a" },
    });

    expect(nextRevision.homeData._source.stale).toBe(false);
    expect(nextRevision.homeData._source.tryitRevision).toBe(8);
    expect(selectCurrentProjection(nextRevision, "homeData")).toBe(nextRevision.homeData);
  });
});
