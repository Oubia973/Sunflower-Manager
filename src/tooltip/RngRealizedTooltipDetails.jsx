import React from "react";

function formatPercent(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${number.toLocaleString(undefined, { maximumFractionDigits: digits })}%`
    : "—";
}

export default function RngRealizedTooltipDetails({ contract, fallbackImage }) {
  if (!contract || typeof contract !== "object") return <div>PRNG details unavailable.</div>;
  const realized = contract.realized || {};
  const baseChance = Number(contract.baseChance || 0);
  const actualRate = Number(realized.rate);
  const delta = Number.isFinite(actualRate) ? actualRate - baseChance : 0;
  const rateTone = delta > 0 ? "is-positive" : delta < 0 ? "is-negative" : "is-close";
  const deltaText = `${delta > 0 ? "+" : ""}${formatPercent(delta)}`;
  const hasCounterRange = Number.isFinite(realized.fromCounter) && Number.isFinite(realized.toCounter);
  const counterRange = hasCounterRange
    ? `#${Number(realized.fromCounter).toLocaleString()}–#${Number(realized.toCounter).toLocaleString()}`
    : "";

  return (
    <div className="rng-realized-tooltip">
      <div className="rng-realized-tooltip__title">
        <img src={contract.sourceImage || fallbackImage} alt="" />
        <div>
          <strong>{contract.sourceName || "PRNG proc"}</strong>
          <span>{contract.itemName}{contract.variantName ? ` · ${contract.variantName}` : ""}</span>
        </div>
      </div>

      <div className="rng-realized-tooltip__rates">
        <span><small>Base</small><strong>{formatPercent(baseChance)}</strong></span>
        <span className={rateTone}><small>Past PRNG</small><strong>{formatPercent(actualRate)}</strong></span>
        <span className={rateTone}>
          <small>Diff.</small><strong>{deltaText}</strong>
        </span>
      </div>

      <div className="rng-realized-tooltip__rows">
        <div><span>Sample</span><strong>{Number(realized.hits || 0).toLocaleString()} hits / {Number(realized.actions || 0).toLocaleString()} {contract.actionLabel || "actions"}</strong></div>
        {hasCounterRange ? <div><span>Counters</span><strong>{counterRange}</strong></div> : null}
        {contract.effectLabel ? <div><span>Effect</span><strong>{contract.effectLabel}</strong></div> : null}
      </div>

      {Number(realized.actions || 0) < 20 ? (
        <div className="rng-realized-tooltip__notice is-sample">Small sample: the percentage can vary strongly.</div>
      ) : null}
      <div className={`rng-realized-tooltip__notice ${realized.activationHistoryKnown ? "is-verified" : "is-warning"}`}>
        {realized.activationHistoryKnown
          ? "Always active: this replay matches the procs received."
          : "Exact PRNG replay. Past activation is unknown: a hit was received only if this source was active."}
      </div>
    </div>
  );
}
