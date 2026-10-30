import { getCookDisplayNames } from "./cookDisplayOrder.js";

test("Cook puts new dishes last in their building even when received first", () => {
  const food = {
    "Ember-Roasted Truffle Potatoes": { bld: "Fire Pit" },
    "Truffle Cake": { bld: "Bakery" },
    "Creamy Truffle Risotto": { bld: "Kitchen" },
    "Mashed Potato": { bld: "Fire Pit" },
    "Pizza Margherita": { bld: "Fire Pit" },
    "Roast Veggies": { bld: "Kitchen" },
    Cheese: { bld: "Deli" },
    "Pirate Cake": { bld: "Bakery" },
    "Apple Juice": { bld: "Smoothie Shack" },
  };
  expect(getCookDisplayNames(food, { "Fish Omelette": {} })).toEqual([
    "Mashed Potato", "Pizza Margherita", "Ember-Roasted Truffle Potatoes",
    "Roast Veggies", "Creamy Truffle Risotto", "Cheese",
    "Pirate Cake", "Truffle Cake", "Apple Juice", "Fish Omelette",
  ]);
  expect(Object.keys(food)[0]).toBe("Ember-Roasted Truffle Potatoes");
});
