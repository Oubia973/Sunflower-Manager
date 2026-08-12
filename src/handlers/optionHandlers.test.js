import { createOptionHandlers } from "./optionHandlers.js";

test("stores named array options without numeric coercion", () => {
  const dataSet = { options: { toolsBurn: true } };
  let renderedOptions = null;
  const { handleOptionChange } = createOptionHandlers(
    dataSet,
    (next) => { renderedOptions = next; },
    () => {}
  );

  handleOptionChange(["Pickaxe", "Oil Drill"], "toolsBurnCraft");

  expect(dataSet.options.toolsBurnCraft).toEqual(["Pickaxe", "Oil Drill"]);
  expect(renderedOptions.toolsBurnCraft).toEqual(["Pickaxe", "Oil Drill"]);
});
