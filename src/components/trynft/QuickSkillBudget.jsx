import React, { useEffect, useState } from "react";
import { fetchJson } from "../../services/apiClient.js";
import { buildSkillBudgetRequestState } from "./skillBudgetRequest.js";

export default function QuickSkillBudget({ state, API_URL, enabled }) {
  const request = buildSkillBudgetRequestState(state);
  const [preview, setPreview] = useState(null);
  const [failedSignature, setFailedSignature] = useState("");
  const signature = request.signature;
  const bodySignature = JSON.stringify({
    activeLevels: request.activeLevels,
    selectedLevels: request.selectedLevels,
    availablePoints: request.availablePoints,
    availableShards: request.availableShards,
  });
  useEffect(() => {
    if (!enabled) return undefined;
    let current = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const summary = await fetchJson(API_URL, "/getskillbudgetcalc", {
          method: "POST", signal: controller.signal, timeoutMs: 10000,
          body: JSON.parse(bodySignature),
        });
        if (!Number.isFinite(summary?.remainingPoints) || !Number.isFinite(summary?.remainingShards)) throw new Error("Missing skill budget");
        if (current) { setPreview({ signature, summary }); setFailedSignature(""); }
      } catch {
        if (current) setFailedSignature(signature);
      }
    }, 400);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [API_URL, enabled, signature, bodySignature]);
  if (!enabled) return null;
  const summary = preview?.signature === signature ? preview.summary : null;
  const placeholder = failedSignature === signature ? "?" : "?";
  const points = summary?.remainingPoints;
  const shards = summary?.remainingShards;
  return (
    <div className="quick-try-skill-budget" role="status" aria-live="polite" title={failedSignature === signature ? "Skill budget unavailable" : "Remaining points and shards for this Tryset"}>
      <span>Points <strong style={{ color: points < 0 ? "#ff8e8e" : "#7fe36f" }}>{summary ? points.toLocaleString("en-US") : placeholder}</strong></span>
      <span>Shards <strong style={{ color: shards < 0 ? "#ff8e8e" : "#86bdff" }}>{summary ? shards.toLocaleString("en-US") : placeholder}</strong></span>
    </div>
  );
}
