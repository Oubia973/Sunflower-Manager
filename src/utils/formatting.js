/**
 * Formatting utilities for display values.
 */

export function formatVipRemaining(expiresAt) {
  const ts = new Date(expiresAt).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return "";
  const diffMs = ts - Date.now();
  if (diffMs <= 0) return "Expired";
  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}j`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days < 1) parts.push(`${minutes}m`);
  return parts.join(" ");
}

export function formatVipPromptMessage({ farmId, username, isAbo, aboExpiresAt }) {
  const lines = [
    `Your contribution helps keep the server running`,
    `your farm stays updated in real time, with no loading delays`,
    `you will have access to your farm's data history since the beginning of the chapter`,
    `including harvests, daily profits and losses, as well as tickets obtained and their price`,
    `your trades history begins the day you become a Supporter`,
    `you get access to upcoming features, including an AI that analyzes your farm and provides personalized advice (in progress)`,
    `1 USD contribution gives you 30 Supporter days`,
    `minimum donation is 0.1 USD for 3 Supporter days`,
    ``,
    `Farm: ${String(username || "").trim() || "Unknown"} (${Number(farmId || 0) || 0})`,
    `Subscribed: ${isAbo ? "Yes" : "No"}`,
  ];
  if (!isAbo) {
    lines.push("Choose Polygon or Base for your donation.");
  }
  if (isAbo) {
    if (Number(aboExpiresAt || 0) > 0) {
      const remaining = formatVipRemaining(aboExpiresAt);
      const expiryDate = new Date(aboExpiresAt).toLocaleString("en-US");
      lines.push(`Time remaining: ${remaining || "Unknown"}`);
      lines.push(`Expires at: ${expiryDate}`);
    } else {
      lines.push("Subscription: Lifetime");
    }
  }
  return lines.join("\n");
}
