export function getSkillLevelColor(level) {
  const safeLevel = Math.max(0, Math.floor(Number(level) || 0));
  if (safeLevel === 0) return "#8d8d8d";
  if (safeLevel === 1) return "#7ee787";
  if (safeLevel === 2) return "#79c0ff";
  return "#e3c55b";
}

