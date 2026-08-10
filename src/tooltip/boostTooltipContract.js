const unique = (values) => [...new Set((values || []).filter(Boolean))];

const resolveRows = (catalog, ids) => unique(ids)
  .map((id) => catalog?.[id])
  .filter(Boolean)
  .map((row) => ({ name: row.name || "Boost", image: row.img || "", boost: row.boost || "" }));

export function buildBoostTooltipContract(index, itemName, itemEntry, mode, view) {
  const selectedMode = mode === "try" ? "try" : "active";
  const references = index?.items?.[itemName]?.[selectedMode] || {};
  const catalog = index?.catalog || {};
  let ids = [];
  let titleKind = view;

  if (view === "timechg") ids = references.time;
  if (view === "yieldchg") ids = references.yield;
  if (view === "costchg") ids = references.cost;
  if (view === "yield") ids = unique([...(references.yield || []), ...(references.time || []), ...(references.cost || [])]);
  if (view === "xp") ids = unique([...(references.xp || []), ...(index?.xpExtras || [])]);

  return {
    itemName,
    itemImage: itemEntry?.img || "",
    titleKind,
    yieldValue: Number(itemEntry?.[selectedMode === "try" ? "myieldtry" : "myield"] ?? itemEntry?.myield ?? 0),
    harvestAverage: Number(itemEntry?.[selectedMode === "try" ? "harvestnodetry" : "harvestnode"] ?? itemEntry?.harvestnode ?? 0),
    xpValue: Number(itemEntry?.[selectedMode === "try" ? "xptry" : "xp"] ?? itemEntry?.xp ?? 0),
    rows: resolveRows(catalog, ids),
  };
}

export function buildPetYieldTooltipContract(payload, itemName, itemImage, boostables, fallbackImage, perkImage) {
  const catalog = {};
  Object.values(boostables || {}).forEach((table) => {
    Object.entries(table || {}).forEach(([name, row]) => { catalog[name] = row; });
  });
  return {
    itemName,
    itemImage,
    titleKind: "petityield",
    yieldValue: Number(payload?.totalYield || 1),
    rows: (Array.isArray(payload?.details) ? payload.details : [])
      .filter((detail) => (detail?.n || "") !== "Base")
      .map((detail) => {
        const name = detail?.n || "Boost";
        const amount = Number(detail?.a || 0);
        return {
          name,
          image: catalog?.[name]?.img || (/perk/i.test(name) ? perkImage : fallbackImage),
          boost: `${amount >= 0 ? "+" : ""}${amount} yield`,
        };
      }),
  };
}
