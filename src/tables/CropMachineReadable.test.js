import { buildCropMachineRows } from "./CropMachineReadable.jsx";

const crop = (overrides = {}) => ({
  cat: "crop", btime: "01:00:00", stock: 10, seed: 2, harvestnode: 3,
  costp2pt: 2, img: "/crop.png", ...overrides,
});

describe("buildCropMachineRows", () => {
  const options = { tradeTax: 10, coinsRatio: 2, gemsRatio: 0.01, restockCostDaily: false };
  const machine = { moil: 1, mtime: 1, spot: 1, perCrop: {} };

  test("builds the batch economics from the selected seed mode", () => {
    const [row] = buildCropMachineRows({
      it: { Sunflower: crop(), Oil: { cat: "resource", cost: 4, img: "/oil.png" } },
      machine, options, tryMode: false, seedMode: "stock", customSeeds: {}, selectedCrops: {},
    });

    expect(row.seeds).toBe(10);
    expect(row.harvest).toBe(30);
    expect(row.seedCost).toBe(10);
    expect(row.oil).toBeCloseTo(10);
    expect(row.cost).toBeCloseTo(30);
    expect(row.market).toBeCloseTo(54);
    expect(row.profit).toBeCloseTo(24);
    expect(row.active).toBe(true);
  });

  test("respects custom quantities, exclusions, and the availability boundary", () => {
    const rows = buildCropMachineRows({
      it: {
        Sunflower: crop(), Soybean: crop(), Celestine: crop(), Oil: { cat: "resource", cost: 4 },
      },
      machine, options, tryMode: false, seedMode: "custom",
      customSeeds: { Sunflower: 7 }, selectedCrops: { Sunflower: false },
    });

    expect(rows[0]).toMatchObject({ name: "Sunflower", seeds: 7, active: false, available: true });
    expect(rows[1]).toMatchObject({ name: "Soybean", active: false, available: false });
    expect(rows[2]).toMatchObject({ name: "Celestine", active: false, available: false });
  });
});
