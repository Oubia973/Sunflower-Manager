import { selectCurrentProjection } from "../../utils/farmState.js";

// Page projections contain fewer fields than the canonical tables. Supplement
// missing rows/fields without replacing the full table or losing numeric zero.
function supplementTables(canonical = {}, projected = {}) {
  const tables = { ...projected, ...canonical };
  Object.entries(projected).forEach(([tableName, rows]) => {
    const rootRows = canonical[tableName];
    if (!rootRows || !rows) return;
    tables[tableName] = { ...rows, ...rootRows };
    Object.entries(rows).forEach(([name, row]) => {
      if (rootRows[name]) tables[tableName][name] = { ...row, ...rootRows[name] };
    });
  });
  return tables;
}

export function withTrysetTables(farmState = {}) {
  const extra = selectCurrentProjection(farmState, "tryNftData");
  if (!extra) return farmState;
  return {
    ...farmState,
    skillUpgrade: extra.skillUpgrade || farmState.skillUpgrade || {},
    trySummary: extra.trySummary || farmState.trySummary || {},
    itables: supplementTables(farmState.itables, extra.itables),
    boostables: supplementTables(farmState.boostables, extra.boostables),
  };
}
