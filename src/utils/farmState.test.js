import { mergeFarmStateDeep } from "../fct.js";
import { collectKnownProjectionHashes, hasSectionData, isProjectionCurrent, selectCurrentProjection } from "./farmState.js";

test("collects only usable local projection hashes", () => {
  expect(collectKnownProjectionHashes({
    cropMachineData: { _source: { contentHash: "crop-v1" } },
    homeData: { _source: { contentHash: "" } },
    boostables: { _source: { contentHash: "ignore-root-table" } },
  })).toEqual({ cropMachineData: "crop-v1" });
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
