export function buildSkillBudgetRequestState(state = {}) {
  const activeLevels = {};
  const selectedLevels = {};
  const signatureParts = [];
  Object.entries(state?.boostables?.skill || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([name, skill]) => {
      const activeLevel = Math.max(0, Math.floor(Number(skill?.level || 0)));
      const selectedLevel = Math.max(0, Math.floor(Number(skill?.leveltry ?? skill?.level ?? 0)));
      if (activeLevel > 0) activeLevels[name] = activeLevel;
      if (activeLevel > 0 || selectedLevel > 0) selectedLevels[name] = selectedLevel;
      signatureParts.push(`${name}:${activeLevel}:${selectedLevel}`);
    });
  const availablePoints = Number(state?.skillUpgrade?.availablePoints || 0);
  const availableShards = Number(state?.skillUpgrade?.shards || 0);
  signatureParts.push(`budget:${availablePoints}:${availableShards}`);
  return {
    activeLevels,
    selectedLevels,
    availablePoints,
    availableShards,
    signature: signatureParts.join("|"),
  };
}

