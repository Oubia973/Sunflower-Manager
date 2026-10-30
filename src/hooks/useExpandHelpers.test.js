import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getExpandTrysetModifiers, getExpandChapterBoostHeaders, useExpandHelpers } from './useExpandHelpers.js';
import { fetchJson } from '../services/apiClient.js';

jest.mock('../services/apiClient.js', () => ({ fetchJson: jest.fn() }));

describe('getExpandTrysetModifiers', () => {
  it('uses the active set when Tryset is disabled', () => {
    const farmState = {
      boostables: {
        nft: {
          'Ascension Monument': { isactive: 1, tryit: 0 },
          "Grinx's Hammer": { isactive: 0, tryit: 1 },
        },
      },
    };

    expect(getExpandTrysetModifiers(farmState, false)).toEqual({
      timeMultiplier: 0.8,
      resourceMultiplier: 1,
    });
  });

  it('reads Quick Tryset boosts from page-scoped data', () => {
    const farmState = {
      tryNftData: {
        boostables: {
          nft: {
            'Ascension Monument': { isactive: 0, tryit: 1 },
            "Grinx's Hammer": { isactive: 0, tryit: 1 },
          },
        },
      },
    };

    expect(getExpandTrysetModifiers(farmState, true)).toEqual({
      timeMultiplier: 0.8,
      resourceMultiplier: 0.5,
    });
  });
});

test('chapter expansion flags carry the selected mode without duplicating the formulas', () => {
  const farm = { tryNftData: { boostables: {
    nft: { 'Duende Monument': { isactive: 0, tryit: 1 }, 'Brick House': { isactive: 1, tryit: 0 } },
    nftw: { 'Hercules Beetle Hat': { isactive: 0, tryit: 1 } },
  } } };
  expect(getExpandChapterBoostHeaders(farm, false)).toEqual({ 'duende-monument': '0', 'brick-house': '1', 'stick-house': '0', 'hercules-beetle-hat': '0' });
  expect(getExpandChapterBoostHeaders(farm, true)).toEqual({ 'duende-monument': '1', 'brick-house': '0', 'stick-house': '0', 'hercules-beetle-hat': '1' });
});

test('Expand uses its current boost selections ahead of cached root tables', () => {
  const farm = { tryitRevision: 2,
    boostables: { nft: { 'Brick House': { isactive: 0, tryit: 0 } } },
    expandPageData: { _source: { tryitRevision: 2 }, boostables: {
      nft: { 'Brick House': { isactive: 0, tryit: 1 } },
    } },
  };
  expect(getExpandChapterBoostHeaders(farm, false)['brick-house']).toBe('0');
  expect(getExpandChapterBoostHeaders(farm, true)['brick-house']).toBe('1');
  farm.expandPageData._source.tryitRevision = 1;
  farm.tryNftData = { _source: { tryitRevision: 2 }, boostables: { nft: { 'Brick House': { tryit: 1 } } } };
  expect(getExpandChapterBoostHeaders(farm, true)['brick-house']).toBe('1');
  farm.tryNftData._source.stale = true;
  expect(getExpandChapterBoostHeaders(farm, true)['brick-house']).toBe('0');
});

test('changing the wearable refreshes the calculator and identical selections remain deduplicated', async () => {
  const previousActFlag = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  const root = createRoot(host);
  const data = { options: { farmId: '1' } };
  let hook;
  function Harness({ farm }) {
    hook = useExpandHelpers('http://local', data, farm, true);
    return null;
  }
  fetchJson.mockResolvedValue({ expand: {}, meta: {} });
  fetchJson.mockClear();
  try {
    const farm = { boostables: { nftw: { 'Hercules Beetle Hat': { tryit: 0 } } } };
    await act(async () => root.render(<Harness farm={farm} />));
    await act(async () => hook.getFromToExpand(31, 31, 'swamp', 1));
    expect(fetchJson.mock.calls[0][2].headers['hercules-beetle-hat']).toBe('0');
    const changed = { boostables: { nftw: { 'Hercules Beetle Hat': { tryit: 1 } } } };
    await act(async () => root.render(<Harness farm={changed} />));
    await act(async () => hook.getFromToExpand(31, 31, 'swamp', 1));
    expect(fetchJson.mock.calls[1][2].headers['hercules-beetle-hat']).toBe('1');
    await act(async () => hook.getFromToExpand(31, 31, 'swamp', 1));
    expect(fetchJson).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    global.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
  }
});

test('switching Active/Try refreshes expansion costs from page-scoped selections', async () => {
  const previousActFlag = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  const root = createRoot(host);
  const data = { options: { farmId: '1' } };
  const farm = { expandPageData: { boostables: { nft: { 'Brick House': { isactive: 0, tryit: 1 } } } } };
  function Harness({ tried }) {
    const { getFromToExpand } = useExpandHelpers('http://local', data, farm, tried);
    useEffect(() => { getFromToExpand(31, 31, 'swamp', 1); }, [getFromToExpand]);
    return <span>{data.fromtoexpand?.expand?.totalResources?.Coins}</span>;
  }
  fetchJson.mockClear();
  fetchJson.mockImplementation(async (_base, _path, { headers }) => ({
    expand: { totalResources: { Coins: headers['brick-house'] === '1' ? 4750 : 5000 } },
  }));
  try {
    await act(async () => root.render(<Harness tried={false} />));
    expect(host.textContent).toBe('5000');
    await act(async () => root.render(<Harness tried={true} />));
    expect(host.textContent).toBe('4750');
    await act(async () => root.render(<Harness tried={false} />));
    expect(host.textContent).toBe('5000');
    expect(fetchJson).toHaveBeenCalledTimes(3);
  } finally {
    await act(async () => root.unmount());
    global.IS_REACT_ACT_ENVIRONMENT = previousActFlag;
  }
});
