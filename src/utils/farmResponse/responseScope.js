const TABLE_ROOTS = new Set(["itables", "boostables"]);

function sectionResources(section, sectionPayloadKeys, sectionTablePaths) {
  const keys = Array.isArray(sectionPayloadKeys?.[section]) ? sectionPayloadKeys[section] : [];
  const paths = Array.isArray(sectionTablePaths?.[section]) ? sectionTablePaths[section] : [];
  const resources = new Set([`section:${section}`]);
  keys.forEach((key) => {
    if (!TABLE_ROOTS.has(key)) resources.add(`key:${key}`);
    else {
      resources.add(`root:${key}`);
      const ownedPaths = paths.filter((path) => String(path).startsWith(`${key}.`));
      if (ownedPaths.length) ownedPaths.forEach((path) => resources.add(`table:${path}`));
    }
  });
  return [...resources];
}

export function claimFarmRequestSections(sections, sequence, latestByResource, sectionPayloadKeys, sectionTablePaths) {
  sections.forEach((section) => {
    sectionResources(section, sectionPayloadKeys, sectionTablePaths)
      .forEach((resource) => latestByResource.set(resource, sequence));
  });
}

export function currentFarmRequestSections(sections, sequence, latestByResource, sectionPayloadKeys, sectionTablePaths) {
  return sections.filter((section) => sectionResources(section, sectionPayloadKeys, sectionTablePaths)
    .every((resource) => latestByResource.get(resource) === sequence));
}

function selectTables(source, allowedPaths, allowedKeys, unrestrictedRoots) {
  if (!source || typeof source !== "object") return undefined;
  const selected = {};
  TABLE_ROOTS.forEach((root) => {
    if (!allowedKeys.has(root) || !source[root] || typeof source[root] !== "object") return;
    const tables = Object.fromEntries(Object.entries(source[root])
      .filter(([subKey]) => unrestrictedRoots.has(root) || allowedPaths.has(`${root}.${subKey}`)));
    if (Object.keys(tables).length) selected[root] = tables;
  });
  return Object.keys(selected).length ? selected : undefined;
}

export function selectFarmResponseSections(rawPayload, sections, sectionPayloadKeys, sectionTablePaths) {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return rawPayload;
  const allowedKeys = new Set(sections.flatMap((section) => sectionPayloadKeys?.[section] || []));
  const allowedPaths = new Set(sections.flatMap((section) => (sectionTablePaths?.[section] || [])
    .filter((path) => allowedKeys.has(String(path).split(".")[0]))));
  const unrestrictedRoots = new Set([...TABLE_ROOTS].filter((root) => sections.some((section) =>
    (sectionPayloadKeys?.[section] || []).includes(root)
    && !(sectionTablePaths?.[section] || []).some((path) => String(path).startsWith(`${root}.`)))));
  const selected = {};
  allowedKeys.forEach((key) => {
    if (!TABLE_ROOTS.has(key) && Object.prototype.hasOwnProperty.call(rawPayload, key)) {
      selected[key] = rawPayload[key];
    }
  });
  const rootTables = selectTables(rawPayload, allowedPaths, allowedKeys, unrestrictedRoots);
  if (rootTables) Object.assign(selected, rootTables);
  for (const field of ["_packedTables", "_tableDeltas"]) {
    const tables = selectTables(rawPayload[field], allowedPaths, allowedKeys, unrestrictedRoots);
    if (tables) selected[field] = tables;
  }
  if (Array.isArray(rawPayload._replaceTables)) {
    selected._replaceTables = rawPayload._replaceTables.filter((path) =>
      unrestrictedRoots.has(String(path).split(".")[0]) || allowedPaths.has(path));
  }
  if (rawPayload.tableHashes && typeof rawPayload.tableHashes === "object") {
    selected.tableHashes = Object.fromEntries(Object.entries(rawPayload.tableHashes)
      .filter(([path]) => unrestrictedRoots.has(String(path).split(".")[0]) || allowedPaths.has(path)));
  }
  if (rawPayload.sectionHashes && typeof rawPayload.sectionHashes === "object") {
    selected.sectionHashes = Object.fromEntries(sections
      .filter((section) => Object.prototype.hasOwnProperty.call(rawPayload.sectionHashes, section))
      .map((section) => [section, rawPayload.sectionHashes[section]]));
  }
  for (const field of ["requestedSections", "returnedSections", "unchangedSections"]) {
    if (Array.isArray(rawPayload[field])) selected[field] = rawPayload[field].filter((section) => sections.includes(section));
  }
  if (allowedKeys.has("ftrades")) {
    for (const field of ["ftradesDelta", "ftradesEntryHashes"]) {
      if (Object.prototype.hasOwnProperty.call(rawPayload, field)) selected[field] = rawPayload[field];
    }
  }
  return selected;
}
