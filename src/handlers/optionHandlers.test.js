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

test("marks explicit calculation choices before updating options, but skips notification choices", () => {
  const dataSet = { options: { tradeTax: 10, notifList: [] } };
  const mark = jest.fn();
  let current = dataSet.options;
  const setOptions = jest.fn((next) => { current = typeof next === "function" ? next(current) : next; });
  const handlers = createOptionHandlers(dataSet, setOptions, jest.fn(), mark);
  handlers.handleOptionChange({ target: { name: "tradeTax", value: 20 } });
  expect(mark).toHaveBeenCalledTimes(1);
  expect(dataSet.options.tradeTax).toBe(20);
  handlers.handleOptionChange({ target: { name: "animalLvl_Chicken", value: 8 } });
  handlers.handleOptionChange(["Pickaxe"], "toolsBurnCraft");
  expect(mark).toHaveBeenCalledTimes(3);
  handlers.handleOptionChange([["Sunflower", true]]);
  handlers.setOptionField("auctionNotifSelection", { 901: ["Flower"] });
  handlers.handleOptionChange({ target: { name: "autoRefresh", type: "checkbox", checked: false } });
  expect(mark).toHaveBeenCalledTimes(3);
});
