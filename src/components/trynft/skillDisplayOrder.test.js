import { getOrderedSkillEntries } from "./skillDisplayOrder.js";

test("interleaved refresh entries keep the same category, tier and name order", () => {
  const entries = [
    ["Tree B", { cat: "Trees", tier: 2 }],
    ["Crop C", { cat: "Crops", tier: 2 }],
    ["Tree A", { cat: "Trees", tier: 1 }],
    ["Crop B", { cat: "Crops", tier: 1 }],
    ["Crop A", { cat: "Crops", tier: 1 }],
    ["Future Z", { cat: "Future Z", tier: 1 }],
    ["Future A", { cat: "Future A", tier: 1 }],
  ];
  const skills = Object.fromEntries(entries);
  const ordered = getOrderedSkillEntries(skills);
  expect(ordered.map(([name]) => name)).toEqual([
    "Crop A", "Crop B", "Crop C", "Tree A", "Tree B", "Future A", "Future Z",
  ]);
  expect(getOrderedSkillEntries(Object.fromEntries([...entries].reverse()))).toEqual(ordered);
  expect(Object.entries(skills)).toEqual(entries);
});
