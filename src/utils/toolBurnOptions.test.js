import { buildToolBurnOptions, resolveToolBurnSelection } from "./toolBurnOptions.js";

test("builds choices only for used tools that burn tracked resources", () => {
  const options = buildToolBurnOptions({
    Wood: { tool: "Axe" },
    Stone: { tool: "Pickaxe" },
    Iron: { tool: "Stone Pickaxe" },
  }, {
    Axe: { img: "axe.png" },
    Pickaxe: { Wood: 3, img: "pickaxe.png" },
    "Stone Pickaxe": { Wood: 3, Stone: 5, img: "stone-pickaxe.png" },
    "Oil Drill": { Wood: 20, Iron: 9, img: "drill.png" },
  });

  expect(options).toEqual([
    { value: "Pickaxe", label: "Pickaxe", iconSrc: "pickaxe.png" },
    { value: "Stone Pickaxe", label: "Stone Pickaxe", iconSrc: "stone-pickaxe.png" },
  ]);
});

test("defaults new profiles to every available tool and preserves an explicit empty selection", () => {
  const options = [{ value: "Pickaxe" }, { value: "Oil Drill" }];
  expect(resolveToolBurnSelection(undefined, options)).toEqual(["Pickaxe", "Oil Drill"]);
  expect(resolveToolBurnSelection([], options)).toEqual([]);
  expect(resolveToolBurnSelection(["Oil Drill", "Unknown"], options)).toEqual(["Oil Drill"]);
});
