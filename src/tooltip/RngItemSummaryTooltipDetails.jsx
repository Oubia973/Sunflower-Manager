import React from "react";

function formatPercent(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${number.toLocaleString(undefined, { maximumFractionDigits: digits })}%`
    : "—";
}

function rateTone(rule) {
  const actual = Number(rule?.realized?.rate);
  const base = Number(rule?.chance);
  if (!Number.isFinite(actual) || !Number.isFinite(base)) return "is-neutral";
  if (actual > base) return "is-positive";
  if (actual < base) return "is-negative";
  return "is-neutral";
}

export default function RngItemSummaryTooltipDetails({ contract, fallbackImage }) {
  if (!contract || typeof contract !== "object") return <div>PRNG summary unavailable.</div>;
  const variants = Array.isArray(contract.variants) ? contract.variants : [];
  const sourceCount = variants.reduce((total, variant) => total + (variant.rules?.length || 0), 0);

  return (
    <div className="rng-summary-tooltip">
      <header className="rng-summary-tooltip__header">
        <img src={contract.image || fallbackImage} alt="" />
        <div>
          <small>RNG REPORT</small>
          <strong>{contract.name || "Item"}</strong>
        </div>
        <span>{sourceCount} source{sourceCount === 1 ? "" : "s"}</span>
      </header>

      {variants.map((variant) => {
        const showVariantTitle = variant.tier > 0 || variants.length > 1 || variant.name !== contract.name;
        return (
        <section className={`rng-summary-tooltip__variant ${showVariantTitle ? "" : "is-titleless"}`} key={variant.name}>
          {showVariantTitle ? (
            <div className="rng-summary-tooltip__variant-title">
              {variant.image ? <img src={variant.image} alt="" /> : null}
              <strong>{variant.tier > 0 ? `T${variant.tier} · ${variant.name}` : variant.name}</strong>
            </div>
          ) : null}
          {(variant.rules || []).map((rule) => {
            const hasActual = Number(rule?.realized?.actions || 0) > 0 && Number.isFinite(Number(rule?.realized?.rate));
            const nextProcs = (rule.procs || []).slice(0, 3);
            return (
              <div className="rng-summary-tooltip__source" key={`${rule.sourceTable || "source"}:${rule.name}`}>
                <img src={rule.img || fallbackImage} alt="" />
                <div className="rng-summary-tooltip__source-main">
                  <strong>{rule.name}</strong>
                  <small>{rule.effectLabel || `+${Number(rule.amount || 0).toLocaleString()}`}</small>
                </div>
                <div className={`rng-summary-tooltip__odds ${rateTone(rule)}`}>
                  <span>{rule.displayMode === "result" ? "Result roll" : `Base ${formatPercent(rule.chance)}`}</span>
                  {hasActual ? <strong><small>Real</small> {formatPercent(rule.realized.rate)}</strong> : null}
                </div>
                <div className="rng-summary-tooltip__procs">
                  {nextProcs.length > 0
                    ? <span>Next in {nextProcs.map((proc) => proc.distance).join(", ")} {variant.actionLabel || contract.actionLabel || "actions"}</span>
                    : <small>No proc in range</small>}
                </div>
              </div>
            );
          })}
        </section>
        );
      })}

    </div>
  );
}
