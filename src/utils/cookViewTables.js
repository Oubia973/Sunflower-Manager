const REQUIRED_COOK_TABLES = ["it", "food", "pfood", "fish", "bounty", "crustacean"];

function hasCompleteCookTables(tables) {
  return REQUIRED_COOK_TABLES.every((tableName) => (
    tables?.[tableName] && typeof tables[tableName] === "object"
  ));
}

function preserveClientFields(projectedTable, canonicalTable, fields) {
  if (!projectedTable || typeof projectedTable !== "object") return projectedTable || {};
  const canonical = canonicalTable && typeof canonicalTable === "object" ? canonicalTable : {};

  return Object.fromEntries(Object.entries(projectedTable).map(([itemName, projectedItem]) => {
    if (!projectedItem || typeof projectedItem !== "object") return [itemName, projectedItem];
    const canonicalItem = canonical[itemName];
    if (!canonicalItem || typeof canonicalItem !== "object") return [itemName, projectedItem];

    const clientFields = {};
    fields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(canonicalItem, field)) {
        clientFields[field] = canonicalItem[field];
      }
    });
    return [itemName, { ...projectedItem, ...clientFields }];
  }));
}

/**
 * Builds the single table contract consumed by Cook.
 * Server-calculated values come from the current Cook projection, while the
 * few frontend-owned Tryset choices remain sourced from the canonical state.
 */
export function selectCookViewTables(canonicalTables = {}, projectedTables = {}) {
  if (!hasCompleteCookTables(projectedTables)) return canonicalTables;

  return {
    ...projectedTables,
    it: preserveClientFields(projectedTables.it, canonicalTables.it, ["farmit"]),
    food: preserveClientFields(projectedTables.food, canonicalTables.food, ["cookit"]),
    pfood: preserveClientFields(projectedTables.pfood, canonicalTables.pfood, ["cookit"]),
  };
}
