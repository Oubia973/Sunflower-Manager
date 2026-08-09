import { getQuickTryKnownHashes } from './quickTryHashes.js';

describe('getQuickTryKnownHashes', () => {
  it('forces fresh Expand page costs for a Quick Tryset request', () => {
    expect(getQuickTryKnownHashes(
      { core: 'core-hash', expandpage: 'old-expand-hash' },
      ['core', 'expandpage'],
    )).toEqual({ core: 'core-hash' });
  });

  it('preserves hashes for other pages', () => {
    const hashes = { core: 'core-hash', animalpage: 'animal-hash' };
    expect(getQuickTryKnownHashes(hashes, ['core', 'animalpage'])).toEqual(hashes);
  });
});
