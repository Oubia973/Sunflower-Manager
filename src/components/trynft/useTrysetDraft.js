import { withTrysetTables } from "./trysetTables.js";
import { useMemo, useRef, useState } from "react";
import { applyTryitSnapshotToFarmState, buildCanonicalTryitSnapshot, readTryitSnapshot, writeTryitSnapshot } from "../../tryitStorage.js";

export function snapshotWithSkillLevels(state, config) {
  const snapshot = buildCanonicalTryitSnapshot(state, config) || {};
  (config?.boostTables || []).forEach(table => {
    snapshot[table] = Object.fromEntries(Object.entries(state?.boostables?.[table] || {}).map(([name, row]) => [name, Number(table === "skill" ? row.leveltry ?? row.level ?? 0 : row.tryit ?? row.isactive ?? 0)]));
  });
  Object.entries(config?.itemTables || {}).forEach(([key, cfg]) => {
    (cfg.sources || []).forEach(path => {
      const table = path.split(".").reduce((node, part) => node?.[part], state) || {};
      Object.entries(table).forEach(([name, row]) => {
        if (!row || typeof row !== "object" || (!Object.prototype.hasOwnProperty.call(row, cfg.field) && !Object.prototype.hasOwnProperty.call(row, cfg.baseField))) return;
        if (!Object.prototype.hasOwnProperty.call(snapshot[key] || {}, name)) {
          (snapshot[key] ||= {})[name] = Number(row[cfg.field] ?? row[cfg.baseField] ?? 0);
        }
      });
    });
  });
  return snapshot;
}

export function changedTrysetEntries(before, after) {
  const changes = {};
  Object.entries(after).forEach(([table, entries]) => {
    Object.entries(entries || {}).forEach(([name, value]) => {
      if (Object.prototype.hasOwnProperty.call(before[table] || {}, name) && before[table][name] !== value) {
        (changes[table] ||= {})[name] = value;
      }
    });
  });
  return changes;
}

export function overlayTryset(base, changes) {
  const result = { ...base };
  Object.entries(changes).forEach(([table, entries]) => { result[table] = { ...(base[table] || {}), ...entries }; });
  return result;
}

export default function useTrysetDraft(farmState, config) {
  const [changes, setChanges] = useState({});
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const storedSignature = JSON.stringify(readTryitSnapshot() || {});
  const appliedState = useMemo(() => {
    const base = withTrysetTables(farmState);
    return applyTryitSnapshotToFarmState(base, JSON.parse(storedSignature), config);
  }, [farmState, config, storedSignature]);
  const baseline = useMemo(() => snapshotWithSkillLevels(appliedState, config), [appliedState, config]);
  const snapshot = useMemo(() => overlayTryset(baseline, changes), [baseline, changes]);
  const state = useMemo(() => applyTryitSnapshotToFarmState(appliedState, snapshot, config), [appliedState, snapshot, config]);
  const isPending = (table, name) => Object.prototype.hasOwnProperty.call(changes[table] || {}, name) && changes[table][name] !== baseline[table]?.[name];
  const dirty = Object.entries(changes).some(([table, entries]) => Object.keys(entries).some(name => isPending(table, name)));
  const stage = (previous, next) => {
    if (busyRef.current) return;
    const delta = changedTrysetEntries(snapshotWithSkillLevels(previous, config), snapshotWithSkillLevels(next, config));
    setChanges(current => overlayTryset(current, delta));
  };
  const begin = () => {
    if (busyRef.current) return false;
    setError("");
    busyRef.current = true;
    setApplying(true);
    return true;
  };
  const finish = (appliedSnapshot, failure) => {
    if (failure) setError(failure);
    if (appliedSnapshot) {
      const saved = writeTryitSnapshot(appliedSnapshot);
      if (!saved) {
        setError("Could not save Tryset. Please retry Apply.");
        busyRef.current = false;
        setApplying(false);
        return false;
      }
      setError("");
      setChanges({});
    }
    busyRef.current = false;
    setApplying(false);
    return true;
  };
  return { state, snapshot, stage, dirty, isPending, applying, error, begin, finish };
}
