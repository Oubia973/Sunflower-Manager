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

export function collectChangedSkillLevels(previousState = {}, nextState = {}) {
  const previousSkills = previousState?.boostables?.skill || {};
  const nextSkills = nextState?.boostables?.skill || {};

  return Object.fromEntries(
    Object.entries(nextSkills)
      .filter(([skillName, skill]) => {
        if (!Object.prototype.hasOwnProperty.call(previousSkills, skillName)) return false;
        const previous = previousSkills[skillName] || {};
        const previousLevel = Number(previous?.leveltry ?? previous?.level ?? 0);
        const nextLevel = Number(skill?.leveltry ?? skill?.level ?? 0);
        return previousLevel !== nextLevel;
      })
      .map(([skillName, skill]) => [
        skillName,
        Number(skill?.leveltry ?? skill?.level ?? 0),
      ])
  );
}
