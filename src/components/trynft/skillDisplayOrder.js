const CATEGORY_ORDER = [
  "Crops", "Fruits", "Trees", "Fishing", "Animals", "Greenhouse",
  "Mining", "Cooking", "Bees Flowers", "Machinery", "Compost", "Aging",
];

const compareNames = (left, right) => String(left || "").localeCompare(String(right || ""), "en");

export function getOrderedSkillEntries(skills) {
  return Object.entries(skills || {}).sort(([leftName, left], [rightName, right]) => {
    const leftCategory = String(left?.cat || "");
    const rightCategory = String(right?.cat || "");
    const leftIndex = CATEGORY_ORDER.indexOf(leftCategory);
    const rightIndex = CATEGORY_ORDER.indexOf(rightCategory);
    return (leftIndex < 0 ? CATEGORY_ORDER.length : leftIndex)
      - (rightIndex < 0 ? CATEGORY_ORDER.length : rightIndex)
      || compareNames(leftCategory, rightCategory)
      || (Number(left?.tier) || 0) - (Number(right?.tier) || 0)
      || compareNames(leftName, rightName);
  });
}
