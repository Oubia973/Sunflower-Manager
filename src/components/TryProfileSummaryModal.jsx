import React, { useEffect, useMemo, useRef, useState } from "react";
import DList from "../dlist.jsx";
import { imgcancel, imgexchng } from "../constants/images.js";
import {
  normalizeToken,
  inferCategoryTokens,
  BOOST_ITEM_CATEGORY_ALIASES,
} from "../tryNftTaxonomy.js";

function TryProfileSummaryModal({ profile, onClose }) {
  const rows = useMemo(
    () => (Array.isArray(profile?.boostChanges) ? profile.boostChanges : []),
    [profile]
  );
  const impacts = Array.isArray(profile?.impacts) ? profile.impacts : [];
  const compareMode = String(profile?.compareMode || "active");
  const profileName = String(profile?.profileName || "").trim();
  const [impactMetric, setImpactMetric] = useState("dailysfl");
  const boostIconMap = (profile?.boostIconMap && typeof profile.boostIconMap === "object") ? profile.boostIconMap : {};
  const boostCategoryMap = (profile?.boostCategoryMap && typeof profile.boostCategoryMap === "object") ? profile.boostCategoryMap : {};
  const itemIconMap = (profile?.itemIconMap && typeof profile.itemIconMap === "object") ? profile.itemIconMap : {};
  const modalRef = useRef(null);
  const resizeStateRef = useRef(null);
  const [modalSize, setModalSize] = useState({ width: 1200, height: 760 });
  const scopeLabel = (profile?.mode === "all")
    ? "All"
    : (Array.isArray(profile?.parts) ? profile.parts.join(", ") : "");
  const grouped = useMemo(() => {
    const acc = {};
    rows.forEach((r) => {
      if (!acc[r.section]) acc[r.section] = [];
      acc[r.section].push(r);
    });
    return acc;
  }, [rows]);
  const skillsPointsInfo = useMemo(() => {
    const skillRows = rows.filter((r) => String(r?.section || "").toLowerCase() === "skill");
    if (skillRows.length < 1) return null;
    const rowPoints = (r) => {
      const p = Number(r?.points || 0);
      return Number.isFinite(p) && p > 0 ? p : 1;
    };
    const added = skillRows.reduce((n, r) => n + (String(r?.status || "") === "added" ? rowPoints(r) : 0), 0);
    const removed = skillRows.reduce((n, r) => n + (String(r?.status || "") === "removed" ? rowPoints(r) : 0), 0);
    const net = added - removed;
    return { added, removed, net };
  }, [rows]);
  const buildCategoryMap = (sectionName, sectionRows) => {
    const cap = (txt) => {
      const s = String(txt || "").trim();
      if (!s) return "Other";
      return s.charAt(0).toUpperCase() + s.slice(1);
    };
    const resolveRowCategory = (row) => {
      const explicit = String(row?.category || "").trim();
      const fallbackCat = boostCategoryMap?.[`${String(row?.table || "").toLowerCase()}|${String(row?.name || "")}`]
        || boostCategoryMap?.[String(row?.name || "")]
        || "";
      const explicitNorm = normalizeToken(explicit);
      if (explicitNorm && explicitNorm !== "other") return cap(explicit);
      const fallbackNorm = normalizeToken(fallbackCat);
      if (fallbackNorm && fallbackNorm !== "other") return cap(fallbackCat);
      const tokens = [
        ...inferCategoryTokens(row?.boost),
        String(row?.name || ""),
        String(row?.section || ""),
      ]
        .map((v) => normalizeToken(v))
        .filter(Boolean);
      for (const tk of tokens) {
        const mapped = BOOST_ITEM_CATEGORY_ALIASES?.[tk];
        if (mapped) return cap(mapped);
      }
      return "Other";
    };
    const out = {};
    (sectionRows || []).forEach((r) => {
      const key = resolveRowCategory(r);
      if (!out[key]) out[key] = [];
      out[key].push(r);
    });
    return out;
  };
  const formatCat = (cat) => {
    const txt = String(cat || "other").trim();
    if (!txt) return "Other";
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  };
  const normalizeImpactEntry = (entry) => {
    if (Array.isArray(entry)) {
      const hasExtended = entry.length >= 13;
      const yTry = Number(entry?.[1] || 0);
      const yBase = Number(entry?.[2] || 0);
      const yPct = Number(entry?.[3] || 0);
      const hTry = hasExtended ? Number(entry?.[4] || 0) : yTry;
      const hBase = hasExtended ? Number(entry?.[5] || 0) : yBase;
      const hPct = hasExtended ? Number(entry?.[6] || 0) : yPct;
      const dTry = hasExtended ? Number(entry?.[7] || 0) : yTry;
      const dBase = hasExtended ? Number(entry?.[8] || 0) : yBase;
      const dPct = hasExtended ? Number(entry?.[9] || 0) : yPct;
      return {
        name: String(entry?.[0] || ""),
        yield: yTry,
        yieldBase: yBase,
        yieldPct: yPct,
        harvest: hTry,
        harvestBase: hBase,
        harvestPct: hPct,
        dailysfl: dTry,
        dailysflBase: dBase,
        dailysflPct: dPct,
        img: hasExtended ? String(entry?.[10] || "") : String(entry?.[4] || ""),
        cat: hasExtended ? String(entry?.[11] || "other") : String(entry?.[5] || "other"),
        buyit: hasExtended ? Number(entry?.[12] || 0) === 1 : false,
      };
    }
    return entry || {};
  };
  const impactsByCategory = useMemo(() => {
    const out = {};
    impacts.forEach((entry) => {
      const normalized = normalizeImpactEntry(entry);
      const cat = formatCat(normalized?.cat || "other");
      if (!out[cat]) out[cat] = [];
      out[cat].push(normalized);
    });
    return out;
  }, [impacts]);
  const boostSectionFrames = useMemo(() => {
    return Object.entries(grouped).map(([section, sectionRows]) => {
      const categories = Object.entries(buildCategoryMap(section, sectionRows)).map(([cat, catRows]) => ({
        key: `${section}-${cat}`,
        category: cat,
        rows: catRows,
      }));
      return {
        key: `section-${section}`,
        section,
        categories,
      };
    });
  }, [grouped]);
  const impactMetricOptions = [
    { value: "yield", label: "Yield" },
    { value: "harvest", label: "Harvest" },
    { value: "dailysfl", label: "Daily SFL" },
  ];
  const metricLabel = impactMetric === "harvest" ? "Harvest" : impactMetric === "dailysfl" ? "Daily SFL" : "Yield";
  const metricValue = (entry) => {
    if (impactMetric === "harvest") return Number(entry?.harvest || 0);
    if (impactMetric === "dailysfl") return Number(entry?.dailysfl || 0);
    return Number(entry?.yield || 0);
  };
  const metricBaseValue = (entry) => {
    if (impactMetric === "harvest") return Number(entry?.harvestBase || 0);
    if (impactMetric === "dailysfl") return Number(entry?.dailysflBase || 0);
    return Number(entry?.yieldBase || 0);
  };
  const metricPct = (entry) => {
    if (impactMetric === "harvest") return Number(entry?.harvestPct || 0);
    if (impactMetric === "dailysfl") return Number(entry?.dailysflPct || 0);
    return Number(entry?.yieldPct || 0);
  };

  const compareLabel = compareMode === "zero"
    ? "vs zero boost"
    : compareMode === "shared"
      ? "vs active at share time"
      : "vs active";
  const buildBoostTooltip = (row) => {
    const name = String(row?.name || "").trim();
    const boost = String(row?.boost || "").trim();
    if (name && boost) return `${name}\n${boost}`;
    return name || boost || "";
  };
  const buildImpactTooltip = (entry) => {
    const name = String(entry?.name || "").trim();
    const before = Number(entry ? metricBaseValue(entry) : 0).toFixed(2);
    const current = Number(entry ? metricValue(entry) : 0).toFixed(2);
    const pct = Number(entry ? metricPct(entry) : 0);
    const pctText = `${pct >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(1)}%`;
    const parts = [name, `Before: ${before}`, `${metricLabel}: ${current}`, pctText].filter(Boolean);
    return parts.join("\n");
  };
  useEffect(() => {
    const clamp = () => {
      const maxWidth = Math.max(420, Math.floor(window.innerWidth * 0.94));
      const maxHeight = Math.max(320, Math.floor(window.innerHeight * 0.92));
      setModalSize((prev) => ({
        width: Math.min(prev.width || maxWidth, maxWidth),
        height: Math.min(prev.height || maxHeight, maxHeight),
      }));
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);
  useEffect(() => {
    const onMove = (e) => {
      const state = resizeStateRef.current;
      if (!state) return;
      const maxWidth = Math.max(420, Math.floor(window.innerWidth * 0.94));
      const maxHeight = Math.max(320, Math.floor(window.innerHeight * 0.92));
      const nextWidth = Math.min(maxWidth, Math.max(420, state.startWidth + (e.clientX - state.startX)));
      const nextHeight = Math.min(maxHeight, Math.max(320, state.startHeight + (e.clientY - state.startY)));
      setModalSize({ width: nextWidth, height: nextHeight });
    };
    const stopResize = () => {
      resizeStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, []);
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      resizeStateRef.current = null;
    };
  }, []);
  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: modalRef.current?.getBoundingClientRect().width || modalSize.width,
      startHeight: modalRef.current?.getBoundingClientRect().height || modalSize.height,
    };
    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";
  };
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.72)",
      zIndex: 3000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      overflowX: "hidden",
    }}>
      <div
        ref={modalRef}
        style={{
        width: `${modalSize.width}px`,
        height: `${modalSize.height}px`,
        minWidth: 0,
        maxWidth: "94vw",
        maxHeight: "92vh",
        overflow: "hidden",
        display: "inline-flex",
        flexDirection: "column",
        background: "#1f1a1a",
        border: "1px solid #524141",
        borderRadius: 8,
        color: "#e6f2e4",
        position: "relative",
      }}>
        <div style={{
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          paddingRight: 20,
          paddingBottom: 20,
          boxSizing: "border-box",
        }}>
          <div
          style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "9px 10px",
          borderBottom: "1px solid #524141",
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "#1f1a1a",
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{profileName} Summary</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {scopeLabel || "custom"} | Compare: {compareLabel}
              {skillsPointsInfo ? (
                <span style={{ marginLeft: 8 }}>
                  | Skills points: <span style={{ color: "#7fe36f", fontWeight: 700 }}>+{skillsPointsInfo.added}</span>
                  {" / "}
                  <span style={{ color: "#ff7f7f", fontWeight: 700 }}>-{skillsPointsInfo.removed}</span>
                  {" "}(
                  <span style={{ color: skillsPointsInfo.net >= 0 ? "#7fe36f" : "#ff7f7f", fontWeight: 700 }}>
                    {skillsPointsInfo.net >= 0 ? "+" : "-"}{Math.abs(skillsPointsInfo.net)}
                  </span>
                  )
                </span>
              ) : null}
            </div>
          </div>
          <button className="button" onClick={onClose}>
            <img src={imgcancel} alt="Close" className="resico" />
          </button>
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          padding: 10,
          boxSizing: "border-box",
          alignItems: "flex-start",
          flex: "1 1 auto",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            alignItems: "flex-start",
            minWidth: 0,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 0 }}>Boosts</div>
            {rows.length < 1 ? (
              <div>No change on boosts in this profile.</div>
            ) : (
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-start",
                alignContent: "flex-start",
                gap: 8,
                width: "100%",
                maxWidth: "100%",
                minWidth: 0,
              }}>
                {boostSectionFrames.map((sectionFrame) => (
                  <div
                    key={sectionFrame.key}
                    style={{
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 7,
                      padding: 6,
                      background: "rgba(255,255,255,0.02)",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      flex: "0 1 auto",
                      width: "fit-content",
                      maxWidth: "100%",
                      minWidth: 0,
                      alignSelf: "flex-start",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{sectionFrame.section}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, width: "100%", maxWidth: "100%" }}>
                      {sectionFrame.categories.map((frame) => (
                        <div
                          key={frame.key}
                          style={{
                            border: "1px solid rgba(255,255,255,0.16)",
                            borderRadius: 6,
                            padding: 6,
                            background: "rgba(255,255,255,0.015)",
                            width: "fit-content",
                            maxWidth: "100%",
                          }}
                        >
                          <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4, fontWeight: 700 }}>
                            {String(frame.category || "")}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, width: "fit-content", maxWidth: "100%" }}>
                            {frame.rows.map((row, idx) => (
                              (() => {
                                const isAdded = row?.status === "added";
                                const isRemoved = row?.status === "removed";
                                const isNodeRow = String(row?.table || "").toLowerCase() === "spots"
                                  || String(frame.section || "").toLowerCase() === "nodes"
                                  || String(frame.category || "").toLowerCase() === "nodes";
                                const isSkillRow = ["skill", "skilllgc"].includes(String(row?.table || "").toLowerCase())
                                  || String(frame.section || "").toLowerCase().includes("skill")
                                  || String(frame.category || "").toLowerCase().includes("skill");
                                const parsedDiffText = (() => {
                                  const raw = String(row?.diffText || "").trim();
                                  const match = raw.match(/([+-])\s*(\d+(?:\.\d+)?)/);
                                  if (!match) return "";
                                  return `${match[1]}${Number(match[2]).toFixed(0)}`;
                                })();
                                const deltaValue = Number(row?.delta);
                                const fallbackFinalValue = Number(row?.finalValue);
                                const skillPoints = Number(row?.points || 0);
                                const skillPointsText = `${isRemoved ? "-" : "+"}${Math.abs(skillPoints).toFixed(0)}`;
                                const nodeDeltaSign = parsedDiffText.startsWith("-")
                                  ? -1
                                  : (parsedDiffText.startsWith("+") ? 1 : (Number.isFinite(deltaValue) ? Math.sign(deltaValue) : 0));
                                const nodeDeltaText = parsedDiffText
                                  || (Number.isFinite(deltaValue) && deltaValue !== 0
                                    ? `${deltaValue >= 0 ? "+" : "-"}${Math.abs(deltaValue).toFixed(0)}`
                                    : (Number.isFinite(fallbackFinalValue) && fallbackFinalValue !== 0
                                      ? `${fallbackFinalValue >= 0 ? "+" : "-"}${Math.abs(fallbackFinalValue).toFixed(0)}`
                                      : "+0"));
                                const changeColor = (Number.isFinite(deltaValue) ? deltaValue : 0) >= 0 ? "#7fe36f" : "#ff7f7f";
                                const nodeIsPositive = nodeDeltaSign >= 0;
                                const skillIsPositive = !isRemoved;
                                const nodeTierBadge = isNodeRow && ["T2", "T3"].includes(String(row?.nameSuffix || ""))
                                  ? String(row?.nameSuffix || "")
                                  : "";
                                return (
                              <div
                                key={`${frame.key}-${row.name}-${idx}`}
                                style={{
                                  border: isNodeRow
                                    ? nodeIsPositive
                                      ? "1px solid rgba(127, 227, 111, 0.55)"
                                      : "1px solid rgba(255, 127, 127, 0.55)"
                                    : isSkillRow
                                      ? skillIsPositive
                                        ? "1px solid rgba(127, 227, 111, 0.55)"
                                        : "1px solid rgba(255, 127, 127, 0.55)"
                                    : isAdded
                                    ? "1px solid rgba(127, 227, 111, 0.55)"
                                    : isRemoved
                                      ? "1px solid rgba(255, 127, 127, 0.55)"
                                      : "1px solid rgba(255,255,255,0.15)",
                                  borderRadius: 14,
                                  padding: "4px 6px",
                                  fontSize: 12,
                                  background: isNodeRow
                                    ? nodeIsPositive
                                      ? "rgba(70, 160, 85, 0.38)"
                                      : "rgba(170, 60, 60, 0.38)"
                                    : isSkillRow
                                      ? skillIsPositive
                                        ? "rgba(70, 160, 85, 0.38)"
                                        : "rgba(170, 60, 60, 0.38)"
                                    : isAdded
                                    ? "rgba(70, 160, 85, 0.38)"
                                    : isRemoved
                                      ? "rgba(170, 60, 60, 0.38)"
                                      : "rgba(255,255,255,0.03)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minWidth: 30,
                                  minHeight: 30,
                                }}
                                title={buildBoostTooltip(row)}
                                >
                                {(row.img || boostIconMap?.[`${String(row?.table || "").toLowerCase()}|${row.name}`] || boostIconMap?.[row.name]) ? (
                                  <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                                    <img
                                      src={row.img || boostIconMap?.[`${String(row?.table || "").toLowerCase()}|${row.name}`] || boostIconMap?.[row.name]}
                                      alt=""
                                      style={{ width: 17, height: 17, verticalAlign: "middle" }}
                                    />
                                    {nodeTierBadge ? (
                                      <span
                                        style={{
                                          position: "absolute",
                                          top: -11,
                                          left: -6,
                                          transform: "translateY(-1px)",
                                          padding: "1px 5px",
                                          borderRadius: 999,
                                          background: "rgba(10, 10, 10, 0.9)",
                                          border: "1px solid rgba(255,255,255,0.28)",
                                          color: "#fff",
                                          fontSize: 10,
                                          fontWeight: 600,
                                          lineHeight: 1,
                                          letterSpacing: 0.2,
                                          pointerEvents: "none",
                                        }}
                                      >
                                        {nodeTierBadge}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : null}
                                {isNodeRow ? (
                                  <span
                                    style={{
                                      color: changeColor,
                                      fontWeight: 800,
                                      fontSize: 13,
                                      lineHeight: 1,
                                      marginLeft: 4,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {nodeDeltaText}
                                  </span>
                                ) : isSkillRow ? (
                                  <span
                                    style={{
                                      color: skillIsPositive ? "#7fe36f" : "#ff7f7f",
                                      fontWeight: 800,
                                      fontSize: 13,
                                      lineHeight: 1,
                                      marginLeft: 4,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {skillPointsText}
                                  </span>
                                ) : row?.status === "added" ? (
                                  <span style={{ color: "#7fe36f", fontWeight: 800, fontSize: 13, lineHeight: 1, marginLeft: 4, whiteSpace: "nowrap" }}>+</span>
                                ) : row?.status === "removed" ? (
                                  <span style={{ color: "#ff7f7f", fontWeight: 800, fontSize: 13, lineHeight: 1, marginLeft: 4, whiteSpace: "nowrap" }}>-</span>
                                ) : null}
                              </div>
                                );
                              })()
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            alignItems: "flex-start",
            minWidth: 0,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Impacted Items</span>
              <DList
                name="impactMetric"
                options={impactMetricOptions}
                value={impactMetric}
                onChange={(e) => setImpactMetric(String(e?.target?.value || "dailysfl"))}
                height={22}
              />
            </div>
            {impacts.length < 1 ? (
              <div>No impacted item found for this comparison.</div>
            ) : (
            <div style={{
              columnWidth: "250px",
              columnGap: 8,
              width: "100%",
              maxWidth: "100%",
              minWidth: 0,
            }}>
                {Object.entries(impactsByCategory).map(([cat, list]) => (
                  <div
                    key={`impact-${cat}`}
                    style={{
                      display: "inline-block",
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      border: "1px solid rgba(255,255,255,0.16)",
                      borderRadius: 6,
                      padding: 6,
                      background: "rgba(255,255,255,0.02)",
                      minWidth: 0,
                      marginBottom: 8,
                      breakInside: "avoid",
                      WebkitColumnBreakInside: "avoid",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 5, fontWeight: 700 }}>
                      {cat}
                    </div>
                    <table style={{ width: "100%", maxWidth: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "auto" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", fontSize: 10, opacity: 0.75, fontWeight: 600, paddingBottom: 2 }}>Item</th>
                          <th style={{ textAlign: "right", fontSize: 10, opacity: 0.75, fontWeight: 600, paddingBottom: 2 }}>Before</th>
                          <th style={{ textAlign: "right", fontSize: 10, opacity: 0.75, fontWeight: 600, paddingBottom: 2 }}>{metricLabel}</th>
                          <th style={{ textAlign: "right", fontSize: 10, opacity: 0.75, fontWeight: 600, paddingBottom: 2 }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                      {list.map((entry, idx) => {
                        const pct = metricPct(entry);
                        const isPos = pct >= 0;
                        const isZero = Math.abs(pct) < 1e-9;
                        return (
                          <tr key={`${cat}-${String(entry?.name || "")}-${idx}`}>
                            <td style={{ padding: "1px 4px 1px 0", whiteSpace: "nowrap" }} title={buildImpactTooltip(entry)}>
                              {(entry?.img || itemIconMap?.[String(entry?.name || "")]) ? (
                                <img
                                  src={String(entry?.img || itemIconMap?.[String(entry?.name || "")] || "")}
                                  alt=""
                                  style={{ width: 15, height: 15, verticalAlign: "middle", marginRight: 4 }}
                                />
                              ) : null}
                              {Number(entry?.buyit || 0) === 1 ? (
                                <img
                                  src={imgexchng}
                                  alt=""
                                  style={{ width: 12, height: 12, verticalAlign: "middle", marginRight: 3 }}
                                />
                              ) : null}
                            </td>
                            <td style={{ textAlign: "right", padding: "1px 0 1px 4px", fontSize: 11, opacity: 0.85, whiteSpace: "nowrap" }}>
                              {metricBaseValue(entry).toFixed(2)}
                            </td>
                            <td style={{ textAlign: "right", padding: "1px 0 1px 4px", fontSize: 11, opacity: 0.85, whiteSpace: "nowrap" }}>
                              {metricValue(entry).toFixed(2)}
                            </td>
                            <td style={{ textAlign: "right", padding: "1px 0 1px 4px", color: isZero ? "#9aa0a6" : (isPos ? "#7fe36f" : "#ff7f7f"), whiteSpace: "nowrap", fontWeight: 700, fontSize: 11 }}>
                              {(isPos ? "+" : "-") + Math.abs(pct).toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
        <div
          onMouseDown={startResize}
          title="Resize summary"
          style={{
            position: "absolute",
            right: 24,
            bottom: 24,
            width: 20,
            height: 20,
            cursor: "nwse-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(127, 227, 111, 0.92)",
            userSelect: "none",
          }}
        >
          <img
            src="/icon/ui/resize.webp"
            alt=""
            draggable="false"
            style={{
              width: 18,
              height: 18,
              display: "block",
              objectFit: "contain",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default TryProfileSummaryModal;
