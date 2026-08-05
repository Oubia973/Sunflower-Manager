/**
 * Notification preferences utilities.
 * Handles localStorage persistence of notification settings per farm.
 */

const NOTIF_PREFS_STORAGE_KEY = "SFLManNotifPrefs";

export function normalizeNotifPrefs(raw) {
  const source = (raw && typeof raw === "object") ? raw : {};
  const enabledFarmIds = Array.isArray(source.enabledFarmIds)
    ? [...new Set(
      source.enabledFarmIds
        .map((farmId) => String(farmId || "").trim())
        .filter(Boolean)
    )]
    : [];
  return {
    enabledFarmIds,
    skipMultiFarmPrompt: source.skipMultiFarmPrompt === true,
    updatedAt: Number(source.updatedAt || 0) || 0,
  };
}

export function readNotifPrefs() {
  try {
    return normalizeNotifPrefs(JSON.parse(localStorage.getItem(NOTIF_PREFS_STORAGE_KEY) || "{}"));
  } catch {
    return normalizeNotifPrefs({});
  }
}

export function writeNotifPrefs(nextValue) {
  const normalized = normalizeNotifPrefs({
    ...nextValue,
    updatedAt: Date.now(),
  });
  localStorage.setItem(NOTIF_PREFS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function updateNotifPrefs(updater) {
  const current = readNotifPrefs();
  const nextValue = typeof updater === "function" ? updater(current) : updater;
  return writeNotifPrefs(nextValue);
}

export function setNotifFarmEnabledLocal(farmId, enabled) {
  const farmKey = String(farmId || "").trim();
  if (!farmKey) return readNotifPrefs();
  return updateNotifPrefs((current) => {
    const enabledSet = new Set(current.enabledFarmIds || []);
    if (enabled) enabledSet.add(farmKey);
    else enabledSet.delete(farmKey);
    return {
      ...current,
      enabledFarmIds: [...enabledSet],
    };
  });
}

export function clearNotifFarmsEnabledLocal() {
  return updateNotifPrefs((current) => ({
    ...current,
    enabledFarmIds: [],
  }));
}

export function resetMultiFarmNotifPromptLocal() {
  return updateNotifPrefs((current) => ({
    ...current,
    skipMultiFarmPrompt: false,
  }));
}

export function setSkipMultiFarmNotifPromptLocal(skipValue) {
  return updateNotifPrefs((current) => ({
    ...current,
    skipMultiFarmPrompt: skipValue === true,
  }));
}

export function getOtherEnabledNotifFarmIdsLocal(currentFarmId) {
  const farmKey = String(currentFarmId || "").trim();
  return readNotifPrefs().enabledFarmIds.filter((farmId) => farmId !== farmKey);
}
