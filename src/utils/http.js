/**
 * HTTP utility functions.
 */

export async function formatHttpErrorMessage(response, endpointLabel = "") {
  const endpoint = String(endpointLabel || "").trim();
  const endpointTxt = endpoint ? ` on ${endpoint}` : "";
  let details = "";

  try {
    const contentType = String(response?.headers?.get("content-type") || "").toLowerCase();
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      details = payload?.error || payload?.message || payload?.details || payload?.msg || "";
      if (!details && typeof payload === "string") details = payload;
      if (!details && payload && typeof payload === "object") details = JSON.stringify(payload);
    } else {
      details = await response.text();
    }
  } catch {
    details = "";
  }

  details = String(details || "").replace(/\s+/g, " ").trim();
  if (details.startsWith("<!DOCTYPE") || details.startsWith("<html")) {
    details = "Internal server error";
  }
  if (details.length > 220) {
    details = `${details.slice(0, 217)}...`;
  }

  const base = `HTTP ${response?.status || "?"}${endpointTxt}`;
  return details ? `${base}: ${details}` : base;
}
