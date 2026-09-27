export function createItemDashboardCache(ttlMs = 60_000) {
  const entries = new Map();
  let currentScope;
  return (scope, name, load) => {
    if (scope !== currentScope) {
      entries.clear();
      currentScope = scope;
    }
    const cached = entries.get(name);
    if (cached && Date.now() - cached.time < ttlMs) return cached.promise;
    const entry = { time: Date.now() };
    entry.promise = Promise.resolve().then(load).catch((error) => {
      if (entries.get(name) === entry) entries.delete(name);
      throw error;
    });
    entries.set(name, entry);
    if (entries.size > 100) entries.delete(entries.keys().next().value);
    return entry.promise;
  };
}
