import { getExpandTrysetModifiers } from './useExpandHelpers.js';

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
