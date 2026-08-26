export function mergeExplicitSkillLevels(snapshot = {}, explicitSkillLevels = {}) {
  const levels = explicitSkillLevels && typeof explicitSkillLevels === "object"
    ? explicitSkillLevels
    : {};
  if (Object.keys(levels).length < 1) return snapshot;

  return {
    ...(snapshot || {}),
    skill: {
      ...(snapshot?.skill || {}),
      ...levels,
    },
  };
}
