import { flattenCompoit } from "./fct.js";

test("flattenCompoit preserves absolute nested recipe quantities", () => {
  expect(flattenCompoit({
    Cheese: {
      qty: 3,
      compoit: {
        Milk: { qty: 9 },
        Oil: { qty: 0.5 },
      },
    },
    Honey: { qty: 5 },
    Oil: { qty: 6 },
  })).toEqual({
    Milk: 9,
    Oil: 6.5,
    Honey: 5,
  });
});
