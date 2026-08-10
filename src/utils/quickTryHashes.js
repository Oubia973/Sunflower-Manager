export function getQuickTryKnownHashes(knownHashes, currentSections = []) {
  const nextHashes = { ...(knownHashes || {}) };

  // Expand costs are derived from freshly recalculated `costtry` fields.
  if ((currentSections || []).includes('expandpage')) delete nextHashes.expandpage;

  return nextHashes;
}
