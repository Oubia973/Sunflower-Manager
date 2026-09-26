import { getMondaySeasonMarkers, SEASON_STYLES } from "./graphSeasons.js";

test("season markers fall on Monday midnight UTC across daylight saving changes", () => {
  const markers = getMondaySeasonMarkers(
    Date.parse("2026-10-18T22:00:00Z"), Date.parse("2026-11-02T00:00:00Z"),
    "autumn", Date.parse("2026-10-26T12:00:00Z"),
  );
  expect(markers.map(({ time }) => new Date(time).toISOString())).toEqual([
    "2026-10-19T00:00:00.000Z", "2026-10-26T00:00:00.000Z", "2026-11-02T00:00:00.000Z",
  ]);
  expect(markers.map(({ season }) => season)).toEqual(["summer", "autumn", "winter"]);
  expect(markers[1].line).toBe(SEASON_STYLES.autumn.line);
});

test("a range between Mondays has no marker", () => {
  expect(getMondaySeasonMarkers(Date.parse("2026-09-22T00:00:00Z"), Date.parse("2026-09-27T23:59:59Z"), "spring")).toEqual([]);
});
