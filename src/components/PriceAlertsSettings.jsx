import React, { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { fetchJson } from "../services/apiClient.js";
import { promptConfirm } from "../promptW.js";
import DList from "../dlist.jsx";
import { imgcalendar, imgcancel, imgconfirm, imgedit, imgexchng, imgpriceDown, imgpriceUp } from "../constants/images.js";

const PERIODS = ["24h", "3d", "7d", "30d"];
const MAX_ALERTS = 10;

function newRuleId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `price_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanRule(rule) {
  return {
    id: String(rule.id || newRuleId()),
    item: String(rule.item || ""),
    kind: rule.kind === "change" ? "change" : "price",
    direction: String(rule.direction || (rule.kind === "change" ? "up" : "below")),
    threshold: Number(rule.threshold),
    ...(rule.kind === "change" ? { period: PERIODS.includes(rule.period) ? rule.period : "24h" } : {}),
    enabled: rule.enabled !== false,
  };
}

function formatNumber(value, digits = 6) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  return number.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function hasNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function ruleLabel(rule) {
  if (rule.kind === "price") {
    return `${rule.direction === "above" ? "Above" : "Below"} ${formatNumber(rule.threshold)} FLOWER`;
  }
  return `${rule.direction === "up" ? "Increase" : "Decrease"} of ${formatNumber(rule.threshold, 2)}% over ${rule.period}`;
}

export default function PriceAlertsSettings({ API_URL, dataSet, itemTable, isAbo, deviceId: deviceIdProp }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [item, setItem] = useState("");
  const [kind, setKind] = useState("price");
  const [direction, setDirection] = useState("below");
  const [threshold, setThreshold] = useState("");
  const [period, setPeriod] = useState("24h");

  const farmId = String(dataSet?.farmId || "").trim();
  const deviceId = String(deviceIdProp || dataSet?.deviceId || "").trim();
  const type = Capacitor.isNativePlatform() ? "fcm" : "web";
  const canConfigure = !!isAbo && !!dataSet?.useNotifications && !!farmId && !!deviceId;
  const itemOptions = useMemo(() => Object.entries(itemTable || {})
    .filter(([, value]) => Number.isFinite(Number(value?.id)) && (
      Number(value?.costp2pt) > 0
      || PERIODS.some((entry) => hasNumber(value?.[`cost${entry}`]))
    ))
    .map(([name, value]) => ({
      value: name,
      label: name,
      searchText: name,
      iconSrc: value?.img || undefined,
    }))
    .sort((left, right) => left.label.localeCompare(right.label)), [itemTable]);
  const itemNames = useMemo(() => itemOptions.map((option) => option.value), [itemOptions]);
  const alertTypeOptions = useMemo(() => [
    { value: "price", label: "Target price", iconSrc: imgexchng },
    { value: "change", label: "Price change", iconSrc: imgpriceUp },
  ], []);
  const directionOptions = useMemo(() => kind === "price" ? [
    { value: "below", label: "Goes below", iconSrc: imgpriceDown },
    { value: "above", label: "Goes above", iconSrc: imgpriceUp },
  ] : [
    { value: "up", label: "Increases by", iconSrc: imgpriceUp },
    { value: "down", label: "Decreases by", iconSrc: imgpriceDown },
  ], [kind]);
  const periodOptions = useMemo(() => PERIODS.map((value) => ({
    value,
    label: value,
    iconSrc: imgcalendar,
  })), []);

  useEffect(() => {
    let cancelled = false;
    if (!canConfigure) {
      setRules([]);
      setError("");
      return () => { cancelled = true; };
    }
    setLoading(true);
    fetchJson(API_URL, "/price-alerts-status", {
      method: "POST",
      body: { farmId, deviceId, type },
    }).then((response) => {
      if (!cancelled) setRules((response?.rules || []).map(cleanRule));
    }).catch((requestError) => {
      if (!cancelled) setError(requestError?.message || "Unable to load price alerts.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [API_URL, canConfigure, farmId, deviceId, type]);

  const resetForm = () => {
    setEditingId("");
    setItem("");
    setKind("price");
    setDirection("below");
    setThreshold("");
    setPeriod("24h");
  };

  const persist = async (nextRules) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetchJson(API_URL, "/price-alerts-subscription", {
        method: "POST",
        body: { farmId, deviceId, type, rules: nextRules.map(cleanRule) },
      });
      const saved = (response?.rules || nextRules).map(cleanRule);
      setRules(saved);
      return true;
    } catch (requestError) {
      setError(requestError?.message || "Unable to save price alerts.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submitRule = async (event) => {
    event.preventDefault();
    const numericThreshold = Number(threshold);
    if (!itemNames.includes(item)) return setError("Choose a valid item.");
    if (!(numericThreshold > 0)) return setError("Enter a value greater than zero.");
    if (!editingId && rules.length >= MAX_ALERTS) return setError("The limit of 10 alerts has been reached.");
    const nextRule = cleanRule({
      id: editingId || newRuleId(), item, kind, direction, threshold: numericThreshold, period, enabled: true,
    });
    const nextRules = editingId
      ? rules.map((rule) => rule.id === editingId ? { ...nextRule, enabled: rule.enabled } : rule)
      : [...rules, nextRule];
    if (await persist(nextRules)) resetForm();
  };

  const beginEdit = (rule) => {
    setEditingId(rule.id);
    setItem(rule.item);
    setKind(rule.kind);
    setDirection(rule.direction);
    setThreshold(String(rule.threshold));
    setPeriod(rule.period || "24h");
    setError("");
  };

  const removeRule = async (rule) => {
    const confirmed = await promptConfirm(
      `Delete the price alert for ${rule.item}?`,
      "Delete price alert",
      "Delete",
      "Cancel"
    );
    if (!confirmed) return;
    if (await persist(rules.filter((entry) => entry.id !== rule.id)) && editingId === rule.id) resetForm();
  };

  const currentItem = itemTable?.[item];
  const currentValue = kind === "price" ? currentItem?.costp2pt : currentItem?.[`cost${period}`];

  return (
    <div className="price-alerts-settings">
      <div className="price-alerts-heading">
        <strong>Price Alerts</strong>
        <span>{rules.length} / {MAX_ALERTS}</span>
      </div>

      {!isAbo ? <p className="price-alerts-note">Price alerts are available to supporter farms.</p> : null}
      {isAbo && !dataSet?.useNotifications ? <p className="price-alerts-note">Enable notifications to configure price alerts.</p> : null}
      {isAbo && dataSet?.useNotifications && (!farmId || !deviceId) ? <p className="price-alerts-note">Load a farm before configuring price alerts.</p> : null}

      {canConfigure ? (
        <>
          <form className="price-alert-form" onSubmit={submitRule}>
            <div className="price-alert-field">
              <span>Item</span>
              <DList
                options={itemOptions}
                value={item}
                onChange={setItem}
                placeholder="Search for an item..."
                searchable
                emitEvent={false}
                clearable
                maxListHeight={320}
              />
            </div>

            <div className="price-alert-field">
              <span>Alert type</span>
              <DList options={alertTypeOptions} value={kind} emitEvent={false} onChange={(nextKind) => {
                setKind(nextKind);
                setDirection(nextKind === "change" ? "up" : "below");
              }} />
            </div>

            <div className="price-alert-field">
              <span>Condition</span>
              <DList options={directionOptions} value={direction} emitEvent={false} onChange={setDirection} />
            </div>

            <label className="price-alert-value-field">
              {kind === "price" ? "Value (FLOWER)" : "Change (%)"}
              <input type="number" min="0" step="any" value={threshold}
                onChange={(event) => setThreshold(event.target.value)} disabled={saving || loading} />
            </label>

            {kind === "change" ? <div className="price-alert-field">
              <span>Period</span>
              <DList options={periodOptions} value={period} emitEvent={false} onChange={setPeriod} />
            </div> : null}

            {item ? <div className="price-alert-current">
              Current {kind === "price" ? "price" : `${period} change`}: {formatNumber(currentValue, kind === "price" ? 6 : 1)}{kind === "price" && hasNumber(currentValue) ? " FLOWER" : kind === "change" && hasNumber(currentValue) ? "%" : ""}
            </div> : null}

            <div className="price-alert-form-actions">
              {editingId ? <button type="button" className="button small-btn price-alert-confirm-button"
                onClick={resetForm} disabled={saving} title="Cancel" aria-label="Cancel editing">
                <img src={imgcancel} alt="" className="price-alert-confirm-icon" />
              </button> : null}
              <button type="submit" className="button small-btn price-alert-confirm-button"
                aria-label={saving ? "Saving" : editingId ? "Save changes" : "Add alert"}
                title={saving ? "Saving..." : editingId ? "Save changes" : "Add alert"}
                disabled={saving || loading || (!editingId && rules.length >= MAX_ALERTS)}>
                <img src={imgconfirm} alt="" className="price-alert-confirm-icon" />
              </button>
            </div>
          </form>

          {error ? <p className="price-alerts-error">{error}</p> : null}
          {loading ? <p className="price-alerts-note">Loading price alerts...</p> : null}

          <div className="price-alert-list">
            {rules.map((rule) => (
              <div className={`price-alert-row ${rule.enabled ? "" : "is-disabled"}`} key={rule.id}>
                <div className="price-alert-row-summary">
                  <img src={itemTable?.[rule.item]?.img || imgexchng} alt="" className="price-alert-item-icon" />
                  <div>
                    <strong>{rule.item}</strong>
                    <span className="price-alert-rule-label">
                      <img
                        src={(rule.direction === "above" || rule.direction === "up") ? imgpriceUp : imgpriceDown}
                        alt=""
                        className="price-alert-direction-icon"
                      />
                      {ruleLabel(rule)}
                    </span>
                  </div>
                </div>
                <div className="price-alert-row-actions">
                  <label className="price-alert-toggle">
                    <input type="checkbox" checked={rule.enabled} disabled={saving}
                      onChange={() => persist(rules.map((entry) => entry.id === rule.id ? { ...entry, enabled: !entry.enabled } : entry))} />
                    {rule.enabled ? "Active" : "Paused"}
                  </label>
                  <button type="button" className="button small-btn price-alert-row-icon-button"
                    onClick={() => beginEdit(rule)} disabled={saving} title="Edit" aria-label={`Edit ${rule.item} alert`}>
                    <img src={imgedit} alt="" />
                  </button>
                  <button type="button" className="button small-btn price-alert-row-icon-button"
                    onClick={() => removeRule(rule)} disabled={saving} title="Delete" aria-label={`Delete ${rule.item} alert`}>
                    <img src={imgcancel} alt="" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
