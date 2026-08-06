/**
 * API and configuration constants for the application.
 */

export const API_URL = String(process.env.REACT_APP_API_URL || "").replace(/\/$/, "");
export const LOAD_FARM_COOLDOWN_MS = 6000;
export const LOAD_FARM_SPAM_WINDOW_MS = 2500;
export const LOAD_FARM_SPAM_THRESHOLD = 4;
export const AUCTION_NOTIF_SYNC_DEBOUNCE_MS = 4000;
export const NOTIF_PREFS_STORAGE_KEY = "SFLManNotifPrefs";
export const onDev = false;
export let vversion = 0.09;
