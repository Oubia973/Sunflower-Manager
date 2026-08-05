/**
 * Section management utilities.
 */

export function buildSectionsKey(sections) {
  return [...new Set((sections || []).map((s) => String(s || "").trim()).filter(Boolean))]
    .sort()
    .join("|");
}

export function computeRequiredSections(uiState, pageSectionRequirements) {
  if (!pageSectionRequirements || typeof pageSectionRequirements !== "object") return [];
  const selectedInv = String(uiState?.selectedInv || "home");
  const base = pageSectionRequirements?.[selectedInv]
    || pageSectionRequirements?.home
    || [];
  const required = new Set(base);

  // Lists are always loaded lazily through dedicated endpoints.
  if (selectedInv === "toplists") {
    required.delete("toplists");
  }
  return [...required];
}
