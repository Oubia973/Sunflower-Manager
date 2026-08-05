export const SKILL_UPGRADE_POINTS_BY_TIER = Object.freeze({
  1: 1,
  2: 3,
  3: 6,
});

export function getSkillUpgradePoints(tier, upgrades = 1) {
  const safeTier = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
  const count = Math.max(0, Math.floor(Number(upgrades) || 0));
  return (SKILL_UPGRADE_POINTS_BY_TIER[safeTier] || 0) * count;
}

export function getSkillPointsAtLevel(skill, level) {
  const safeLevel = Math.max(0, Math.floor(Number(level) || 0));
  if (safeLevel < 1) return 0;
  return Number(skill?.points || 0) + getSkillUpgradePoints(skill?.tier, safeLevel - 1);
}
