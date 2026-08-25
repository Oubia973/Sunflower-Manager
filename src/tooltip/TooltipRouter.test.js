import { resolveCropMachineTooltipContract, shouldUseModernTooltip } from "./TooltipRouter.jsx";

describe("TooltipRouter", () => {
  test("uses the modern renderer only for a migrated context in compact mode", () => {
    expect(shouldUseModernTooltip("compact", "dailysfl", {})).toBe(true);
    expect(shouldUseModernTooltip("classic", "dailysfl", {})).toBe(false);
    expect(shouldUseModernTooltip("compact", "deliverycost", {})).toBe(false);
    expect(shouldUseModernTooltip("compact", "cmgainh", {})).toBe(true);
    expect(shouldUseModernTooltip("compact", "cmdailysfl", {})).toBe(true);
    expect(shouldUseModernTooltip("classic", "cmdailysfl", {})).toBe(false);
  });

  test("falls back to the legacy renderer when the modern contract is unavailable", () => {
    expect(shouldUseModernTooltip("compact", "dailysfl", null)).toBe(false);
  });
});

test("rebuilds an open Crop Machine tooltip from the current options", () => {
  const crop = { cat: "crop", stock: 10, seed: 2, btime: "00:01:00", harvestnode: 2, costp2pt: 1, img: "crop.png" };
  const farm = { itables: { it: { Sunflower: crop, Oil: { cost: 1, img: "oil.png" } } }, CropMachine: { moil: 1, mtime: 1, spot: 1, perCrop: {} } };
  const dataSet = { options: { tradeTax: 0, coinsRatio: 1, gemsRatio: 0.1, restockCostDaily: false } };
  const withoutRestock = resolveCropMachineTooltipContract(dataSet, farm, "Sunflower", "cmdailysfl", false, { selectedSeeds: "stock" });
  dataSet.options.restockCostDaily = true;
  const withRestock = resolveCropMachineTooltipContract(dataSet, farm, "Sunflower", "cmdailysfl", false, { selectedSeeds: "stock" });
  expect(withRestock.costPerDay).toBeGreaterThan(withoutRestock.costPerDay);
  expect(withRestock.profitPerDay).toBeLessThan(withoutRestock.profitPerDay);
  expect(withRestock.restockCostEnabled).toBe(true);
});
