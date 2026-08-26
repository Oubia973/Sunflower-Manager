import { createTooltipHandlers, refreshOpenTooltip } from './tooltipHandlers.js';

test('keeps the opening anchor and rebuilds an open tooltip from its latest click handler', () => {
  const anchor = document.createElement('button');
  anchor.className = 'tooltipcell';
  document.body.appendChild(anchor);

  let currentValue = 1;
  let tooltipData = null;
  const setTooltipData = (next) => { tooltipData = next; };
  const { handleTooltip } = createTooltipHandlers(setTooltipData, { current: null });
  anchor.addEventListener('click', (event) => handleTooltip('Sunflower', 'dailysfl', currentValue, event));

  anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 25, clientY: 40 }));
  expect(tooltipData).toMatchObject({ value: 1, anchor, x: 25, y: 40 });

  currentValue = 2;
  expect(refreshOpenTooltip(tooltipData)).toBe(true);
  expect(tooltipData).toMatchObject({ value: 2, anchor, x: 25, y: 40 });

  anchor.remove();
});

test('does not refresh when the opening cell is no longer rendered', () => {
  const anchor = document.createElement('button');
  expect(refreshOpenTooltip({ anchor, x: 1, y: 2 })).toBe(false);
});
