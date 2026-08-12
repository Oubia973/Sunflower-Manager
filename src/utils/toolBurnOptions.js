const BURN_RESOURCE_NAMES = ["Wood", "Stone", "Iron", "Gold"];

export function buildToolBurnOptions(itemTable, toolTable) {
  const usedTools = new Set(
    Object.values(itemTable || {})
      .map((item) => String(item?.tool || ""))
      .filter(Boolean)
  );

  return Object.entries(toolTable || {})
    .filter(([toolName, recipe]) => (
      usedTools.has(toolName)
      && BURN_RESOURCE_NAMES.some((resource) => Number(recipe?.[resource] || 0) > 0)
    ))
    .map(([toolName, recipe]) => ({
      value: toolName,
      label: toolName,
      iconSrc: recipe?.img || null,
    }));
}

export function resolveToolBurnSelection(storedSelection, options) {
  const available = new Set((options || []).map((option) => String(option.value)));
  if (!Array.isArray(storedSelection)) return [...available];
  return storedSelection.map(String).filter((toolName) => available.has(toolName));
}
