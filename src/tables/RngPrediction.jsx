import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppCtx } from "../context/AppCtx";
import { selectCurrentProjection } from "../utils/farmState.js";
import { imgna, imglightning } from "../constants/images.js";
import "./RngPrediction.css";

const STORAGE_KEY = "sflman:rngprediction:open-categories";
const SOURCE_FILTERS = [
  { value: "all", label: "All" },
  { value: "boost", label: "Boosts" },
  { value: "skill", label: "Skills" },
  { value: "other", label: "Other" },
];

function readOpenCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

function procTone(distance) {
  if (distance <= 2) return "now";
  if (distance <= 10) return "soon";
  if (distance <= 50) return "later";
  return "far";
}

function getVisibleRules(item, activeOnly, sourceFilter) {
  return (Array.isArray(item?.rules) ? item.rules : []).filter((rule) => (
    (!activeOnly || rule.active)
    && (sourceFilter === "all" || rule.sourceType === sourceFilter)
  ));
}

function getNearestRule(rules) {
  const candidates = rules
    .flatMap((rule) => (rule.procs || []).map((proc) => ({ rule, proc })))
    .sort((a, b) => a.proc.distance - b.proc.distance);
  return candidates.find((entry) => entry.rule.active) || candidates[0] || null;
}

function formatChance(chance) {
  return `${Number(chance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function realizedTone(rule) {
  const realized = rule?.realized;
  if (!realized || realized.actions < 20 || !Number.isFinite(realized.rate)) return "weak";
  const delta = realized.rate - Number(rule.chance || 0);
  if (delta > 2) return "above";
  if (delta < -2) return "below";
  return "close";
}

function BaitIcons({ baits, label }) {
  if (!Array.isArray(baits) || baits.length < 1) return null;
  return (
    <span className="rng-bait-group">
      <small>{label}</small>
      <span className="rng-bait-icons">
        {baits.map((bait) => <img key={bait.name} src={bait.img || imgna} alt={bait.name} title={bait.name} />)}
      </span>
    </span>
  );
}

function FishingMapBlock({ item, forceOpen }) {
  const [open, setOpen] = useState(false);
  const expanded = forceOpen || open;
  const progress = item.caught
    ? "Caught"
    : `${Number(item.mapPieces || 0)}/${Number(item.requiredMapPieces || 9)}`;
  return (
    <div className={`rng-item rng-fishing-map ${expanded ? "is-open" : ""}`}>
      <button className="rng-item-summary" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={expanded}>
        <span className="rng-chevron" aria-hidden="true">›</span>
        <img src={item.img || imgna} alt="" className="rng-item-icon" title={item.name} />
        <span className="rng-item-name" title={item.name}>{item.name}</span>
        <span className={`rng-map-progress ${item.caught ? "is-caught" : ""}`}>{progress}</span>
        <span className="rng-map-best" title="Best base chance per triggering fish caught">
          <small>best</small><strong>{formatChance(item.bestChance)}</strong>
        </span>
      </button>
      {expanded ? (
        <div className="rng-fishing-details">
          <div className="rng-fishing-note">Base chance per triggering fish caught · server-side roll</div>
          {item.triggers.map((trigger) => (
            <div className="rng-fishing-trigger" key={trigger.name}>
              <img src={trigger.img || imgna} alt="" className="rng-trigger-icon" title={trigger.name} />
              <span className="rng-trigger-name" title={trigger.name}>{trigger.name}</span>
              <span className="rng-trigger-chance">{formatChance(trigger.chance)}</span>
              <span className="rng-trigger-average" title="Average number of this fish needed for one map piece">~{Number(trigger.averageCatches).toLocaleString()} catches</span>
              <span className="rng-trigger-count" title={`${trigger.name} caught`}>#{Number(trigger.caught || 0).toLocaleString()}</span>
              <span className="rng-trigger-baits">
                <BaitIcons baits={trigger.baits} label="Baits" />
                <BaitIcons baits={trigger.guaranteedBaits} label="Guaranteed" />
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OddsOverviewBlock({ item, activeOnly, sourceFilter, forceOpen }) {
  const [open, setOpen] = useState(false);
  const expanded = forceOpen || open;
  const triggers = (item.triggers || []).filter((trigger) => (
    (!activeOnly || trigger.active)
    && (sourceFilter === "all" || trigger.sourceType === sourceFilter)
  ));
  const bestChance = triggers.length > 0 ? Math.max(...triggers.map((trigger) => Number(trigger.chance || 0))) : 0;
  return (
    <div className={`rng-item rng-odds-overview ${expanded ? "is-open" : ""}`}>
      <button className="rng-item-summary" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={expanded}>
        <span className="rng-chevron" aria-hidden="true">›</span>
        <img src={item.img || imgna} alt="" className="rng-item-icon" title={item.name} />
        <span className="rng-item-name" title={item.name}>{item.name}</span>
        <span className="rng-map-best"><small>best</small><strong>{formatChance(bestChance)}</strong></span>
      </button>
      {expanded ? (
        <div className="rng-odds-details">
          <div className="rng-fishing-note">{item.note}</div>
          {triggers.map((trigger) => (
            <div className={`rng-odds-trigger ${trigger.active ? "" : "is-inactive"}`} key={trigger.name}>
              <img src={trigger.img || imgna} alt="" className="rng-trigger-icon" title={trigger.name} />
              <span className="rng-trigger-name" title={trigger.name}>{trigger.name}</span>
              <strong className="rng-trigger-chance">{formatChance(trigger.chance)}</strong>
              <span className="rng-odds-effect">{trigger.effectLabel}</span>
              {trigger.modifiers?.length > 0 ? (
                <span className="rng-odds-modifiers" title={trigger.modifiers.map((modifier) => modifier.name).join(" · ")}>
                  {trigger.modifiers.map((modifier) => <img key={modifier.name} src={modifier.img || imgna} alt={modifier.name} />)}
                </span>
              ) : null}
              {!trigger.active ? <small className="rng-odds-off">OFF</small> : null}
            </div>
          ))}
          {triggers.length < 1 ? <div className="rng-empty-rules">No source matches the current filters.</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function ProcPills({ procs, actionLabel, displayMode }) {
  if (!Array.isArray(procs) || procs.length < 1) {
    return <span className="rng-no-proc">No proc in range</span>;
  }
  return (
    <span className="rng-procs" aria-label={`Next ${actionLabel || "actions"}`}>
      {procs.map((proc) => (
        <span
          key={`${proc.counter}-${proc.distance}`}
          className={`rng-proc rng-proc--${procTone(proc.distance)}`}
          title={displayMode === "result"
            ? `${proc.result} on ${actionLabel || "action"} #${proc.actionNumber}`
            : `In ${proc.distance} ${actionLabel || "actions"} · action #${proc.actionNumber}`}
        >
          {displayMode === "result" ? proc.result : proc.distance}
        </span>
      ))}
    </span>
  );
}

function RuleRow({ rule, actionLabel, itemName, variantName }) {
  const { actions: { handleTooltip } } = useAppCtx();
  const realized = rule?.realized;
  const showRealized = rule.displayMode !== "result"
    && realized?.actions > 0
    && Number.isFinite(realized?.rate);
  return (
    <div className={`rng-rule rng-rule--${rule.sourceType || "other"} ${rule.active ? "is-active" : "is-inactive"}`}>
      <img src={rule.img || imglightning} alt="" className="rng-rule-icon" title={rule.name} />
      <div className="rng-rule-name" title={rule.name}>
        <span>{rule.name}</span>
        {rule.scope ? <small>{rule.scope}</small> : null}
      </div>
      <span className="rng-rule-metric" title={rule.effectLabel || ""}>{rule.effectLabel || `+${Number(rule.amount || 0).toLocaleString()}`}</span>
      <span className="rng-rule-chance">
        <span className="rng-chance-base">{rule.displayMode === "result" ? "—" : `${Number(rule.chance || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}</span>
        {showRealized ? (
          <button
            type="button"
            className={`rng-chance-actual rng-chance-actual--${realizedTone(rule)} tooltipcell`}
            aria-label={`Show realized PRNG details for ${rule.name}`}
            onClick={(event) => {
              event.stopPropagation();
              handleTooltip(rule.name, "rngrealized", {
                sourceName: rule.name,
                sourceImage: rule.img,
                itemName,
                variantName,
                actionLabel,
                baseChance: rule.chance,
                effectLabel: rule.effectLabel || `+${Number(rule.amount || 0).toLocaleString()}`,
                realized,
              }, event);
            }}
          >
            {realized.rate.toLocaleString(undefined, { maximumFractionDigits: 1 })}%<small>actual</small>
          </button>
        ) : null}
      </span>
      {!rule.active ? <span className="rng-inactive" title="This source is not active">OFF</span> : null}
      <ProcPills procs={rule.procs} actionLabel={actionLabel} displayMode={rule.displayMode} />
    </div>
  );
}

function ItemBlock({ item, activeOnly, sourceFilter, forceOpen }) {
  const { actions: { handleTooltip } } = useAppCtx();
  const [open, setOpen] = useState(false);
  const rules = getVisibleRules(item, activeOnly, sourceFilter);
  const variants = (Array.isArray(item?.variants) && item.variants.length > 0)
    ? item.variants.map((variant) => ({ ...variant, rules: getVisibleRules(variant, activeOnly, sourceFilter) }))
    : [{ name: item.name, tier: 0, img: item.img, counter: item.counter, counterName: item.counterName, actionLabel: item.actionLabel, rules }];
  const nearest = getNearestRule(rules);
  const expanded = forceOpen || open;
  return (
    <div className={`rng-item ${expanded ? "is-open" : ""}`}>
      <button className="rng-item-summary" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={expanded}>
        <span className="rng-chevron" aria-hidden="true">›</span>
        <img
          src={item.img || imgna}
          alt=""
          className="rng-item-icon tooltipcell"
          title={`Show ${item.name} RNG summary`}
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            handleTooltip(item.name, "rngsummary", {
              name: item.name,
              image: item.img,
              actionLabel: item.actionLabel,
              variants: variants.map((variant) => ({
                name: variant.name,
                tier: variant.tier,
                image: variant.img,
                counter: variant.counter,
                actionLabel: variant.actionLabel,
                rules: variant.rules,
              })),
            }, event);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            handleTooltip(item.name, "rngsummary", {
              name: item.name,
              image: item.img,
              actionLabel: item.actionLabel,
              variants: variants.map((variant) => ({
                name: variant.name,
                tier: variant.tier,
                image: variant.img,
                counter: variant.counter,
                actionLabel: variant.actionLabel,
                rules: variant.rules,
              })),
            }, event);
          }}
        />
        <span className="rng-item-name" title={item.name}>{item.name}</span>
        <span className="rng-item-counter" title={item.counterName}>#{Number(item.counter || 0).toLocaleString()}</span>
        {nearest ? (
          <span className={`rng-nearest ${nearest.rule.active ? "" : "is-inactive"}`} title={`${nearest.rule.name}: in ${nearest.proc.distance} ${item.actionLabel}${nearest.rule.active ? "" : " (inactive)"}`}>
            <img src={nearest.rule.img || imglightning} alt="" />
            <span>{nearest.rule.variantTier ? `T${nearest.rule.variantTier} · ` : ""}{nearest.rule.name}</span>
            <strong className={`rng-proc rng-proc--${procTone(nearest.proc.distance)}`}>
              {nearest.rule.displayMode === "result" ? nearest.proc.result : nearest.proc.distance}
            </strong>
          </span>
        ) : <span className="rng-nearest rng-nearest--empty">No active proc</span>}
      </button>
      {expanded ? (
        <div className="rng-rule-list">
          <div className="rng-rule-head" aria-hidden="true">
            <span>Source</span><span>Gain</span><span>Base / actual</span><span>Next {item.actionLabel}</span>
          </div>
          {variants.map((variant) => (
            <React.Fragment key={variant.name}>
              {variant.tier > 0 ? (
                <div className="rng-node-head">
                  <img src={variant.img || item.img || imgna} alt="" />
                  <strong>T{variant.tier}</strong>
                  <span>{variant.name}</span>
                  {variant.nodeCount > 0 ? <small>×{variant.nodeCount}</small> : null}
                  <em title={variant.counterName}>#{Number(variant.counter || 0).toLocaleString()}</em>
                </div>
              ) : null}
              {variant.rules.map((rule) => (
                <RuleRow
                  key={`${variant.name}:${rule.sourceTable}:${rule.name}`}
                  rule={rule}
                  actionLabel={variant.actionLabel || item.actionLabel}
                  itemName={item.name}
                  variantName={variant.tier > 0 ? variant.name : ""}
                />
              ))}
            </React.Fragment>
          ))}
          {rules.length < 1 ? <div className="rng-empty-rules">No PRNG source matches the current filters.</div> : null}
        </div>
      ) : null}
    </div>
  );
}

function PredictionItemBlock(props) {
  if (props.item.viewType === "fishingMap") return <FishingMapBlock item={props.item} forceOpen={props.forceOpen} />;
  if (props.item.viewType === "oddsOverview") return <OddsOverviewBlock {...props} />;
  return <ItemBlock {...props} />;
}

function SubcategoryBlock({ group, activeOnly, sourceFilter, forceOpen }) {
  const [open, setOpen] = useState(false);
  const expanded = forceOpen || open;
  if (!group.label) {
    return group.items.map((item) => (
      <PredictionItemBlock key={item.name} item={item} activeOnly={activeOnly} sourceFilter={sourceFilter} forceOpen={forceOpen} />
    ));
  }
  return (
    <div className={`rng-subcategory ${expanded ? "is-open" : ""}`}>
      <button type="button" className="rng-subcategory-title" onClick={() => setOpen((value) => !value)} aria-expanded={expanded}>
        <span className="rng-chevron" aria-hidden="true">›</span>
        <strong>{group.label}</strong>
        <span className="rng-subcategory-count">{group.items.length}</span>
      </button>
      {expanded ? group.items.map((item) => (
        <PredictionItemBlock key={item.name} item={item} activeOnly={activeOnly} sourceFilter={sourceFilter} forceOpen={forceOpen} />
      )) : null}
    </div>
  );
}

export default function RngPredictionTable() {
  const { data: { dataSetFarm }, ui: { selectedInv } } = useAppCtx();
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [openCategories, setOpenCategories] = useState(readOpenCategories);
  const pageRef = useRef(null);
  const toolbarRef = useRef(null);
  const defaultCategoryOpenedRef = useRef(false);
  const prediction = selectCurrentProjection(dataSetFarm, "rngPredictionData") || {};
  const categories = Array.isArray(prediction?.categories) ? prediction.categories : [];

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return categories.map((category) => {
      const items = (category.items || []).filter((item) => {
        const isFishingMap = item.viewType === "fishingMap";
        const isOddsOverview = item.viewType === "oddsOverview";
        const rules = getVisibleRules(item, activeOnly, sourceFilter);
        const oddsTriggers = (item.triggers || []).filter((trigger) => (
          (!activeOnly || trigger.active)
          && (sourceFilter === "all" || trigger.sourceType === sourceFilter)
        ));
        const matchesQuery = !query
          || String(item.name || "").toLocaleLowerCase().includes(query)
          || (item.variants || []).some((variant) => String(variant.name || "").toLocaleLowerCase().includes(query))
          || rules.some((rule) => String(rule.name || "").toLocaleLowerCase().includes(query))
          || oddsTriggers.some((trigger) => String(trigger.name || "").toLocaleLowerCase().includes(query))
          || (item.triggers || []).some((trigger) => (
            String(trigger.name || "").toLocaleLowerCase().includes(query)
            || [...(trigger.baits || []), ...(trigger.guaranteedBaits || [])]
              .some((bait) => String(bait.name || "").toLocaleLowerCase().includes(query))
          ));
        return matchesQuery && (isFishingMap || (isOddsOverview && oddsTriggers.length > 0) || showEmpty || rules.length > 0);
      });
      return { ...category, items };
    }).filter((category) => category.items.length > 0);
  }, [categories, search, activeOnly, sourceFilter, showEmpty]);

  useEffect(() => {
    if (defaultCategoryOpenedRef.current || filteredCategories.length < 1) return;
    defaultCategoryOpenedRef.current = true;
    if (openCategories.size > 0) return;
    setOpenCategories(new Set([filteredCategories[0].key]));
  }, [filteredCategories, openCategories.size]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...openCategories])); } catch { /* optional */ }
  }, [openCategories]);

  useEffect(() => {
    const page = pageRef.current;
    const toolbar = toolbarRef.current;
    if (!page || !toolbar) return undefined;
    const updateStickyOffset = () => {
      page.style.setProperty("--rng-toolbar-sticky-height", `${toolbar.offsetHeight}px`);
    };
    updateStickyOffset();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateStickyOffset);
    observer?.observe(toolbar);
    window.addEventListener("resize", updateStickyOffset);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateStickyOffset);
    };
  }, []);

  if (selectedInv !== "rngprediction") return null;
  if (prediction?.restricted) return <div className="rng-access-message">RNG is available to subscribed farms only.</div>;
  if (categories.length < 1) return <div className="rng-access-message">Loading RNG predictions...</div>;

  const toggleCategory = (categoryKey) => {
    setOpenCategories((previous) => {
      const next = new Set(previous);
      if (next.has(categoryKey)) next.delete(categoryKey); else next.add(categoryKey);
      return next;
    });
  };
  const allVisibleOpen = filteredCategories.length > 0 && filteredCategories.every((category) => openCategories.has(category.key));
  const setAllCategories = () => setOpenCategories(allVisibleOpen ? new Set() : new Set(filteredCategories.map((category) => category.key)));

  return (
    <section className="rng-page" ref={pageRef}>
      <div className="rng-toolbar" ref={toolbarRef}>
        <div className="rng-toolbar-top">
          <label className="rng-search">
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Item or PRNG source" />
          </label>
          <button type="button" className="rng-expand-all" onClick={setAllCategories}>{allVisibleOpen ? "Collapse" : "Expand"}</button>
        </div>
        <div className="rng-filter-row">
          <div className="rng-segmented" aria-label="PRNG source filter">
            {SOURCE_FILTERS.map((option) => (
              <button key={option.value} type="button" className={sourceFilter === option.value ? "is-selected" : ""} onClick={() => setSourceFilter(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          <label className="rng-check"><input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} /> Active only</label>
          <label className="rng-check"><input type="checkbox" checked={showEmpty} onChange={(event) => setShowEmpty(event.target.checked)} /> Empty items</label>
          <span className="rng-horizon">3 procs · {Number(prediction.horizon || 0).toLocaleString()} actions</span>
        </div>
      </div>

      <div className="rng-categories">
        {filteredCategories.map((category) => {
          const categoryOpen = openCategories.has(category.key) || search.trim().length > 0;
          const isFishingCategory = category.items.some((item) => item.viewType === "fishingMap");
          const isOddsCategory = category.items.some((item) => item.viewType === "oddsOverview");
          const ruleCount = category.items.reduce((total, item) => {
            if (item.viewType !== "oddsOverview") return total + getVisibleRules(item, activeOnly, sourceFilter).length;
            return total + (item.triggers || []).filter((trigger) => (
              (!activeOnly || trigger.active)
              && (sourceFilter === "all" || trigger.sourceType === sourceFilter)
            )).length;
          }, 0);
          const itemGroups = category.items.reduce((groups, item) => {
            const key = item.subcategoryKey || "items";
            if (!groups.has(key)) groups.set(key, { key, label: item.subcategoryLabel || "", items: [] });
            groups.get(key).items.push(item);
            return groups;
          }, new Map());
          return (
            <div className={`rng-category ${isFishingCategory ? "rng-category--fishing" : ""} ${categoryOpen ? "is-open" : ""}`} key={category.key}>
              <button type="button" className="rng-category-summary" onClick={() => toggleCategory(category.key)} aria-expanded={categoryOpen}>
                <span className="rng-chevron" aria-hidden="true">›</span>
                <span className="rng-category-icons" aria-hidden="true">
                  {category.items.slice(0, 3).map((item) => <img key={item.name} src={item.img || imgna} alt="" />)}
                </span>
                <strong>{category.label}</strong>
                <span>{category.items.length} items</span>
                <span>{isFishingCategory || isOddsCategory ? "server odds" : `${ruleCount} sources`}</span>
              </button>
              {categoryOpen ? (
                <div className="rng-items">
                  {[...itemGroups.values()].map((group) => (
                    <SubcategoryBlock
                      key={group.key}
                      group={group}
                      activeOnly={activeOnly}
                      sourceFilter={sourceFilter}
                      forceOpen={search.trim().length > 0}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {filteredCategories.length < 1 ? <div className="rng-access-message">No item matches these filters.</div> : null}
      </div>
    </section>
  );
}
