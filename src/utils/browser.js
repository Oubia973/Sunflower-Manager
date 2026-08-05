/**
 * Browser detection utilities.
 */

export async function detectBraveBrowser() {
  try {
    return !!(typeof navigator !== "undefined"
      && navigator.brave
      && typeof navigator.brave.isBrave === "function"
      && await navigator.brave.isBrave());
  } catch {
    return false;
  }
}
