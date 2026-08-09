export function getQuickTryKnownHashes(knownHashes, currentSections = []) {
  const nextHashes = { ...(knownHashes || {}) };

  // Expand costs are derived from the freshly recalculated `costtry` fields in
  // expandPageData. Never let section deduplication reuse an older projection
  // after a Quick Tryset change.
  if ((currentSections || []).includes('expandpage')) {
    delete nextHashes.expandpage;
  }

  return nextHashes;
}
