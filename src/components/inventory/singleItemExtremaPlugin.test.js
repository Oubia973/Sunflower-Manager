import { getSingleItemExtrema } from "./singleItemExtremaPlugin.js";

function chartFor(datasets, hidden = []) {
  return {
    data: { datasets },
    scales: { x: { min: 10, max: 30 } },
    isDatasetVisible: (index) => !hidden.includes(index),
    getDatasetMeta: (index) => ({
      data: datasets[index].data.map(() => ({})),
      controller: { getParsed: (pointIndex) => datasets[index].data[pointIndex] },
    }),
  };
}
const prices = { data: [{ x: 0, y: 100 }, { x: 10, y: 2 }, { x: 20, y: 3 }, { x: 30, y: 2.5 }] };

test("one visible item uses only the displayed time range and ignores sold quantity bars", () => {
  const result = getSingleItemExtrema(chartFor([prices, { kind: "quantity", type: "bar", data: [{ x: 20, y: 1000 }] }]));
  expect(result.min.y).toBe(2);
  expect(result.max.y).toBe(3);
  expect(result.amplitude).toBe(50);
});

test("multiple visible items suppress the annotation, hiding one restores it", () => {
  expect(getSingleItemExtrema(chartFor([prices, prices]))).toBeNull();
  expect(getSingleItemExtrema(chartFor([prices, prices], [1])).amplitude).toBe(50);
  expect(getSingleItemExtrema(chartFor([prices], [0]))).toBeNull();
});

test("flat prices give zero amplitude and zero minimum leaves percentage unavailable", () => {
  expect(getSingleItemExtrema(chartFor([{ data: [{ x: 10, y: 2 }, { x: 20, y: 2 }] }])).amplitude).toBe(0);
  expect(getSingleItemExtrema(chartFor([{ data: [{ x: 10, y: 0 }, { x: 20, y: 2 }] }])).amplitude).toBeNull();
});
