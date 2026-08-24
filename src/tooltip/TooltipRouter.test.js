import { shouldUseModernTooltip } from "./TooltipRouter.jsx";

describe("TooltipRouter", () => {
  test("uses the modern renderer only for a migrated context in compact mode", () => {
    expect(shouldUseModernTooltip("compact", "dailysfl", {})).toBe(true);
    expect(shouldUseModernTooltip("classic", "dailysfl", {})).toBe(false);
    expect(shouldUseModernTooltip("compact", "deliverycost", {})).toBe(false);
  });

  test("falls back to the legacy renderer when the modern contract is unavailable", () => {
    expect(shouldUseModernTooltip("compact", "dailysfl", null)).toBe(false);
  });
});
