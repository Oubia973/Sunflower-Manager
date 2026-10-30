const BUILDING_ORDER = ["Fire Pit", "Kitchen", "Deli", "Bakery", "Smoothie Shack", "Fish Market"];
const CHAPTER_DISHES = new Set(["Ember-Roasted Truffle Potatoes", "Creamy Truffle Risotto", "Truffle Cake"]);

export function getCookDisplayNames(food = {}, preparedFood = {}) {
  const names = [...Object.keys(food), ...Object.keys(preparedFood)];
  const buildingOf = name => (food[name] || preparedFood[name])?.bld || "Fish Market";
  const rankOf = name => {
    const index = BUILDING_ORDER.indexOf(buildingOf(name));
    return index < 0 ? BUILDING_ORDER.length : index;
  };
  return names.sort((a, b) => rankOf(a) - rankOf(b)
    || (buildingOf(a) === buildingOf(b) ? Number(CHAPTER_DISHES.has(a)) - Number(CHAPTER_DISHES.has(b)) : 0));
}
