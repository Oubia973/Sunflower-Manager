import React, { useEffect, useMemo, useState } from "react";
import { frmtNb } from "../fct.js";
import { imgCoins, imgSFL, imgna } from "../constants/images.js";
import { getDailyCoinFlow, getTodayDeliverySummary } from "../utils/coinActivity.js";

function Metric({ label, value, suffix = imgCoins, tone = "" }) {
  return (
    <div className={`coin-economy-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}{suffix}</strong>
    </div>
  );
}

export default function CoinEconomySummary({
  activity,
  farmId,
  coinsRatio,
  bestCoinRatio,
  isAbo,
  includeDeliveries,
  includeDig,
  showBetty,
  onOptionChange,
  onFlowHelp,
}) {
  const [flow, setFlow] = useState(null);

  useEffect(() => {
    setFlow(getDailyCoinFlow(activity, farmId));
  }, [activity, farmId]);

  const deliveries = useMemo(() => getTodayDeliverySummary(activity), [activity]);
  const digValue = Number(activity?.dig?.valueCoins || 0);
  const digCostFlower = Number(activity?.dig?.toolCostCoins || 0) / Math.max(1, Number(coinsRatio || 1000));
  const deliveryRatio = deliveries.costFlower > 0 ? deliveries.coins / deliveries.costFlower : 0;
  const digRatio = digCostFlower > 0 ? digValue / digCostFlower : 0;
  const bettyRatio = Number(bestCoinRatio?.ratio || 0);
  const activityCoins = (includeDeliveries ? deliveries.coins : 0) + (includeDig ? digValue : 0);
  const activityCostFlower = (includeDeliveries ? deliveries.costFlower : 0) + (includeDig ? digCostFlower : 0);
  const activityRatio = activityCostFlower > 0 ? activityCoins / activityCostFlower : 0;
  const trackingLabel = flow?.startedNow
    ? "Tracking starts with this scan"
    : "Since the first scan on this device today";

  if (!activity) return null;

  return (
    <details className="coin-economy-summary">
      <summary>
        <span>Activity ratio</span>
        <strong>{activityRatio > 0 ? <>{frmtNb(activityRatio, 0)}{imgCoins}/{imgSFL}</> : "View details"}</strong>
      </summary>
      <div className="coin-economy-body">
        <div className="coin-economy-caption">{trackingLabel}</div>
        <div className="coin-economy-source-settings">
          <span>Included in ratio</span>
          <div className="coin-economy-sources" aria-label="Coin ratio sources">
            <label><input type="checkbox" name="coinRatioIncludeDeliveries" checked={includeDeliveries} onChange={onOptionChange} />Deliveries</label>
            <label><input type="checkbox" name="coinRatioIncludeDig" checked={includeDig} onChange={onOptionChange} />Dig value</label>
          </div>
          <label className="coin-economy-betty-toggle"><input type="checkbox" name="coinRatioShowBetty" checked={showBetty} onChange={onOptionChange} />Show Betty estimates</label>
        </div>
        <div className="coin-economy-flow-header">
          <span>Coin flow</span>
          <button
            type="button"
            className="button small-btn"
            aria-haspopup="dialog"
            aria-label="Explain received, spent and net Coins"
            title="Explain Coin flow"
            onClick={onFlowHelp}
          ><img src={imgna} alt="?" className="itico" /></button>
        </div>
        <div className="coin-economy-grid">
          <Metric label="Received" value={frmtNb(flow?.earned || 0, 0)} />
          <Metric label="Spent" value={frmtNb(flow?.spent || 0, 0)} tone="spent" />
          <Metric label="Net" value={frmtNb(flow?.net || 0, 0)} tone={Number(flow?.net || 0) < 0 ? "spent" : "positive"} />
        </div>

        <div className="coin-economy-activity-table">
          <div className="coin-economy-activity-head"><span>Activity</span><span>Ratio</span><span>Coins</span></div>
          <div className={`coin-economy-activity-row${includeDeliveries ? "" : " is-excluded"}`}>
            <span>Deliveries</span>
            <strong>{deliveryRatio > 0 ? <>{frmtNb(deliveryRatio, 0)}{imgCoins}/{imgSFL}</> : "\u2014"}</strong>
            <strong>{frmtNb(deliveries.coins, 0)}{imgCoins}</strong>
          </div>
          <div className={`coin-economy-activity-row${includeDig ? "" : " is-excluded"}`}>
            <span>Dig</span>
            <strong>{digRatio > 0 ? <>{frmtNb(digRatio, 0)}{imgCoins}/{imgSFL}</> : "\u2014"}</strong>
            <strong>{frmtNb(digValue, 0)}{imgCoins}</strong>
          </div>
          {showBetty ? <div className="coin-economy-activity-row">
            <span>Betty</span>
            <strong>{bettyRatio > 0 ? <>{frmtNb(bettyRatio, 0)}{imgCoins}/{imgSFL}</> : "\u2014"}</strong>
            <strong>{frmtNb(flow?.bettyValueCoins || 0, 0)}{imgCoins}</strong>
          </div> : null}
        </div>

        {activityRatio > 0 ? (
          <div className="coin-economy-ratio">
            <span>Selected ratio <span className="coin-economy-ratio-detail">{frmtNb(activityCoins, 0)}{imgCoins} / {frmtNb(activityCostFlower)}{imgSFL}</span></span>
            <strong>{frmtNb(activityRatio, 0)}{imgCoins}/{imgSFL}</strong>
          </div>
        ) : null}

        {!isAbo ? <div className="coin-economy-vip">Supporter Activity unlocks 7/30-day history and trends.</div> : null}
      </div>
    </details>
  );
}
