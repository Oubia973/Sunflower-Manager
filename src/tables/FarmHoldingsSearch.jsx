import React, { useEffect, useMemo, useState } from "react";
import DList from "../dlist.jsx";
import { imgsave } from "../constants/images.js";
import { useAppCtx } from "../context/AppCtx";
import { buildApiUrl, fetchJson } from "../services/apiClient.js";

const pendingCatalogs = new Map();
const PICKER_PAGE_SIZE = 40;

function ResultsTable({ rows, items, sortBy, sortDirection, onSort }) {
  const header = (key, label) => <th scope="col" key={key} aria-sort={sortBy === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
    <button type="button" className="farm-holdings-sort" onClick={() => onSort(key)}>{label}<span aria-hidden="true">{sortBy === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span></button>
  </th>;
  return <div className="farm-holdings-results" role="region" aria-label="Farm search results" tabIndex={0}>
      <table className="table"><thead><tr>{header("farmId", "Farm ID")}{header("username", "Name")}{items.map((item) => header(item.name, item.name))}</tr></thead><tbody>{rows.map((row) => <tr key={row.farmId}><td>{row.farmId}</td><td>{row.username}</td>{items.map((item) => <td key={item.name}>{row.quantities?.[item.name] ?? "—"}</td>)}</tr>)}</tbody></table>
    </div>;
}

function fetchCatalog(apiUrl, farmId, username) {
  const key = `${apiUrl}:${farmId}:${username}`;
  if (!pendingCatalogs.has(key)) {
    const request = fetchJson(apiUrl, "/internal/farm-holdings/catalog", { method: "POST", body: { farmId, username }, timeoutMs: 65_000 });
    pendingCatalogs.set(key, request);
    request.finally(() => { if (pendingCatalogs.get(key) === request) pendingCatalogs.delete(key); }).catch(() => {});
  }
  return pendingCatalogs.get(key);
}

export default function FarmHoldingsSearch() {
  const { data: { dataSetFarm, dataSet }, config: { API_URL } } = useAppCtx();
  const searchApiUrl = process.env.NODE_ENV === "development" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname) ? "http://127.0.0.1:2003" : API_URL;
  const farmId = String(dataSetFarm?.frmid || dataSet?.options?.farmId || "");
  const username = dataSetFarm?.username || "unknown";
  const isAbo = !!(dataSetFarm?.isabo ?? dataSet?.options?.isAbo);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryItems, setCategoryItems] = useState({});
  const [category, setCategory] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PICKER_PAGE_SIZE);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState("");
  const [farmCount, setFarmCount] = useState(null);
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("ALL");
  const [sortBy, setSortBy] = useState("farmId");
  const [sortDirection, setSortDirection] = useState("asc");
  const [rows, setRows] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [pageCursors, setPageCursors] = useState([""]);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(null);
  const [exportMaxRows, setExportMaxRows] = useState(1_000);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportPhase, setExportPhase] = useState("");
  const [exportBytes, setExportBytes] = useState(0);
  const [exportSeconds, setExportSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!exporting) return undefined;
    const interval = setInterval(() => setExportSeconds((seconds) => seconds + 1), 1000);
    return () => clearInterval(interval);
  }, [exporting]);

  useEffect(() => {
    if (!isAbo || !farmId) return undefined;
    let cancelled = false;
    let retryTimer;
    const loadCatalog = () => {
      fetchCatalog(searchApiUrl, farmId, username).then((data) => {
        if (cancelled) return;
        setCatalog(Array.isArray(data?.items) ? data.items : []);
        setCatalogLoaded(true);
        setSnapshotDate(String(data?.snapshotDate || ""));
        setFarmCount(Number.isSafeInteger(data?.farmCount) ? data.farmCount : null);
        setError("");
      }).catch((requestError) => {
        if (cancelled) return;
        if (requestError?.status === 503 && requestError?.message === "INDEX_PREPARING") {
          setError("Preparing the farm index…");
          retryTimer = setTimeout(loadCatalog, requestError.retryAfterMs || 5000);
          return;
        }
        setCatalogLoaded(true);
        setError("Search is not available in this environment yet.");
      });
    };
    loadCatalog();
    fetchJson(API_URL, "/getcatalogcategories", { method: "POST", body: { username } }).then((data) => {
      if (!cancelled) setCategories((data?.categories || []).map((entry) => String(entry?.category || "")).filter((name) => name && name !== "Other" && name !== "Top lists"));
    }).catch(() => {});
    return () => { cancelled = true; clearTimeout(retryTimer); };
  }, [API_URL, farmId, isAbo, searchApiUrl, username]);

  useEffect(() => {
    if (!category || categoryItems[category]) return undefined;
    let cancelled = false;
    setCategoryLoading(true);
    fetchJson(API_URL, "/getcatalogcategory", { method: "POST", body: { category, username } }).then((data) => {
      if (!cancelled) setCategoryItems((previous) => ({ ...previous, [category]: new Set((data?.items || []).map((item) => String(item?.key || ""))) }));
    }).catch(() => {
      if (!cancelled) setCategoryItems((previous) => ({ ...previous, [category]: new Set() }));
    }).finally(() => { if (!cancelled) setCategoryLoading(false); });
    return () => { cancelled = true; };
  }, [API_URL, category, categoryItems, username]);

  const selectedNames = useMemo(() => new Set(items.map((item) => item.name)), [items]);
  const categoryOptions = useMemo(() => [...new Set([...categories, ...catalog.map((item) => item.category).filter(Boolean)])].sort((a, b) => a.localeCompare(b)), [categories, catalog]);
  const candidates = useMemo(() => {
    const query = itemQuery.trim().toLocaleLowerCase();
    const names = category ? categoryItems[category] : null;
    return catalog.filter((item) => !selectedNames.has(item.name) && (!category || item.category === category || names?.has(item.name)) &&
      (!query || item.name.toLocaleLowerCase().includes(query)))
      .sort((a, b) => query ? a.name.localeCompare(b.name) :
        Number(b.holder_count || 0) - Number(a.holder_count || 0) || a.name.localeCompare(b.name));
  }, [catalog, category, categoryItems, itemQuery, selectedNames]);

  if (!isAbo) return <section className="farm-holdings-notice">
    <span className="farm-holdings-eyebrow">ACTIVE FARMS</span><h2>Explore every active farm</h2>
    <p>Search by item and minimum quantity across the latest active-farm snapshot. This feature is available with a subscription.</p>
    <span className="farm-holdings-notice-badge">Subscriber access</span>
  </section>;

  function clearResults() { setRows([]); setNextCursor(null); setPageCursors([""]); setPageIndex(0); setTotalMatches(null); setSearched(false); }
  function addItem(name) {
    if (items.length >= 5 || selectedNames.has(name)) return;
    setItems((previous) => [...previous, { name, min: 1 }]);
    clearResults();
  }
  async function search(after = "", targetPage = 0, orderBy = sortBy, direction = sortDirection) {
    const chosen = items.map((item) => ({ name: item.name, min: Number(item.min) }));
    if (!chosen.length || chosen.some((item) => !(item.min > 0))) {
      setError("Choose at least one item and a positive minimum quantity.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchJson(searchApiUrl, "/internal/farm-holdings/search", {
        method: "POST", timeoutMs: 65_000, body: { farmId, username, mode, items: chosen, pageSize: 50, cursor: after, sortBy: orderBy, sortDirection: direction },
      });
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setSnapshotDate(String(data?.snapshotDate || ""));
      setNextCursor(data?.nextCursor || null);
      setTotalMatches(Number.isSafeInteger(data?.totalMatches) ? data.totalMatches : null);
      setExportMaxRows(Number.isSafeInteger(data?.exportMaxRows) && data.exportMaxRows > 0 ? Math.min(data.exportMaxRows, 1_000) : 1_000);
      setPageCursors((previous) => targetPage === 0 ? [""] : [...previous.slice(0, targetPage), after]);
      setPageIndex(targetPage);
      setSearched(true);
    } catch (requestError) {
      setError(requestError?.status === 403 ? "Subscriber access is required." : "Search could not be completed.");
    } finally { setLoading(false); }
  }
  function changeSort(key) {
    if (loading) return;
    const direction = sortBy === key && sortDirection === "asc" ? "desc" : "asc";
    setSortBy(key);
    setSortDirection(direction);
    clearResults();
    search("", 0, key, direction);
  }
  async function exportResults(format) {
    if (!searched || exporting || loading || !items.length || totalMatches > exportMaxRows) return;
    setExporting(true);
    setExportPhase("preparing");
    setExportBytes(0);
    setExportSeconds(0);
    setError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5 * 60_000);
    try {
      const response = await fetch(buildApiUrl(searchApiUrl, "/internal/farm-holdings/export"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId, username, mode, items: items.map((item) => ({ name: item.name, min: Number(item.min) })), sortBy, sortDirection, format }),
        signal: controller.signal,
      });
      if (!response.ok) { const error = new Error("Export failed"); error.status = response.status; throw error; }
      setExportPhase("downloading");
      let blob;
      if (response.body?.getReader) {
        const reader = response.body.getReader();
        const chunks = [];
        let received = 0;
        let reading = true;
        while (reading) {
          const { done, value } = await reader.read();
          if (done) reading = false;
          else {
            chunks.push(value);
            received += value.byteLength;
            setExportBytes(received);
          }
        }
        blob = new Blob(chunks, { type: response.headers.get("Content-Type") || "text/csv;charset=utf-8" });
      } else {
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `active-farms.${format === "tsv" ? "tsv" : "csv"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(requestError?.status === 403 ? "Subscriber access is required." : requestError?.status === 422 ? `Export is limited to ${exportMaxRows.toLocaleString()} farms. Refine your search.` : requestError?.name === "AbortError" ? "Export timed out." : "Export could not be completed.");
    } finally {
      clearTimeout(timer);
      setExporting(false);
      setExportPhase("");
    }
  }

  return <section className="farm-holdings-search">
    <header className="farm-holdings-heading">
      <div><span className="farm-holdings-eyebrow">ACTIVE FARM INDEX</span><h2>Find farms by item</h2><p>Pick up to five items, set a minimum for each, then search the latest snapshot.</p></div>
      <div className="farm-holdings-snapshot"><strong>{snapshotDate || (catalogLoaded ? "Unavailable" : error === "Preparing the farm index…" ? "Preparing…" : "Loading…")}</strong><small>{farmCount == null ? (catalogLoaded ? "Farm count unavailable" : "Preparing farm count") : `${farmCount.toLocaleString()} farms`}</small><small>{catalog.length ? `${catalog.length.toLocaleString()} searchable items` : catalogLoaded ? "Catalog unavailable" : "Preparing catalog"}</small></div>
    </header>
    <div className="farm-holdings-picker">
      <button type="button" className="farm-holdings-picker-toggle" aria-expanded={pickerOpen} aria-controls="farm-holdings-picker-body" onClick={() => setPickerOpen((open) => !open)}>
        <strong>Choose items</strong><span>{items.length} / 5 selected{!pickerOpen && items.length ? ` · ${items.map((item) => item.name).join(", ")}` : ""}</span><span className="farm-holdings-picker-chevron" aria-hidden="true">⌄</span>
      </button>
      <div id="farm-holdings-picker-body" hidden={!pickerOpen}>
      <label className="farm-holdings-search-field"><span aria-hidden="true">⌕</span><input type="search" value={itemQuery} onChange={(event) => { setItemQuery(event.target.value); setVisibleCount(PICKER_PAGE_SIZE); }} placeholder="Search an item by name…" aria-label="Search an item by name" /></label>
      {categoryOptions.length > 0 && <div className="farm-holdings-categories" role="group" aria-label="Item categories">
        <button type="button" className={!category ? "is-active" : ""} aria-pressed={!category} onClick={() => { setCategory(""); setVisibleCount(PICKER_PAGE_SIZE); }}>All items</button>
        {categoryOptions.map((name) => <button type="button" key={name} className={category === name ? "is-active" : ""} aria-pressed={category === name} onClick={() => { setCategory(name); setVisibleCount(PICKER_PAGE_SIZE); }}>{name}</button>)}
      </div>}
      <div className="farm-holdings-candidate-head"><span>{categoryLoading ? "Loading category…" : `${candidates.length} matching items`}</span>{items.length >= 5 && <span>Maximum of five items selected</span>}</div>
      <div className="farm-holdings-candidates">
        {candidates.slice(0, visibleCount).map((item) => <button type="button" key={item.name} disabled={items.length >= 5} onClick={() => addItem(item.name)} title={`Add ${item.name}`}><span aria-hidden="true">+</span>{item.name}</button>)}
        {!candidates.length && !categoryLoading && <p className="farm-holdings-empty">No matching items. Try another name or category.</p>}
      </div>
      {candidates.length > visibleCount && <button type="button" className="farm-holdings-more" onClick={() => setVisibleCount((count) => count + PICKER_PAGE_SIZE)}>Show more items</button>}
      </div>
    </div>
    <div className="farm-holdings-query">
      <div className="farm-holdings-section-title"><strong>Your search</strong><span>Minimum quantity per item</span></div>
      {items.length ? <div className="farm-holdings-selected">{items.map((item) => <div className="farm-holdings-selected-item" key={item.name}>
        <strong>{item.name}</strong><label>Min. <input type="number" min="0.001" step="any" value={item.min} aria-label={`Minimum quantity for ${item.name}`} onChange={(event) => { setItems((previous) => previous.map((entry) => entry.name === item.name ? { ...entry, min: event.target.value } : entry)); clearResults(); }} /></label>
        <button type="button" aria-label={`Remove ${item.name}`} onClick={() => { setItems((previous) => previous.filter((entry) => entry.name !== item.name)); if (sortBy === item.name) { setSortBy("farmId"); setSortDirection("asc"); } clearResults(); }}>×</button>
      </div>)}</div> : <p className="farm-holdings-empty">Choose an item above to build your search.</p>}
      <div className="farm-holdings-actions"><div className="farm-holdings-match" role="group" aria-label="Match mode">
        <button type="button" aria-pressed={mode === "ALL"} onClick={() => { setMode("ALL"); clearResults(); }}>All items</button>
        <button type="button" aria-pressed={mode === "ANY"} onClick={() => { setMode("ANY"); clearResults(); }}>Any item</button>
      </div><button type="button" className="farm-holdings-submit" disabled={loading || exporting || !catalog.length || !items.length} onClick={() => search()}>{loading ? "Searching…" : "Search farms"}</button>
      <fieldset className="farm-holdings-export" disabled={loading || exporting || !searched || !totalMatches || totalMatches > exportMaxRows}>
        <DList options={[{ value: "csv-excel", label: "CSV Excel" }, { value: "csv-standard", label: "CSV standard" }, { value: "tsv", label: "TSV" }]}
          value="" onChange={exportResults} emitEvent={false} closeOnSelect={true} iconOnly listIcon={imgsave}
          placeholder="Export results" ariaLabel="Export all matching farms" width={36} height={31} menuMinWidth={150} />
      </fieldset></div>
      {searched && totalMatches > exportMaxRows && <p className="farm-holdings-export-limit">Export is limited to {exportMaxRows.toLocaleString()} farms. Refine your search.</p>}
      {exporting && <span className="farm-holdings-export-status" role="status" aria-live="polite">{exportPhase === "preparing" ? "Preparing export" : `Downloading ${Math.max(1, Math.ceil(exportBytes / 1024)).toLocaleString()} KB`}… {exportSeconds}s</span>}
    </div>
    {error && <p className="farm-holdings-error" role="alert">{error}</p>}
    {searched && <div className="farm-holdings-result-heading"><strong>{totalMatches == null ? "Results" : `${totalMatches.toLocaleString()} matching farms`}</strong><span>{rows.length ? `Showing ${(pageIndex * 50 + 1).toLocaleString()}–${(pageIndex * 50 + rows.length).toLocaleString()}` : "No farms on this page"} · sorted by {sortBy === "farmId" ? "farm ID" : sortBy === "username" ? "name" : sortBy} {sortDirection === "asc" ? "↑" : "↓"}</span></div>}
    {rows.length > 0 && <ResultsTable rows={rows} items={items} sortBy={sortBy} sortDirection={sortDirection} onSort={changeSort} />}
    {searched && !rows.length && <p className="farm-holdings-empty">No farms found for this search.</p>}
    {searched && (rows.length > 0 || pageIndex > 0 || nextCursor) && <nav className="farm-holdings-pagination" aria-label="Search result pages">
      <button type="button" disabled={loading || pageIndex === 0} onClick={() => search(pageCursors[pageIndex - 1], pageIndex - 1)}>← Previous 50 farms</button>
      <span>Page {pageIndex + 1}{totalMatches == null ? "" : `/${Math.max(1, Math.ceil(totalMatches / 50))}`}</span>
      <button type="button" disabled={loading || !nextCursor} onClick={() => search(nextCursor, pageIndex + 1)}>Next 50 farms →</button>
    </nav>}
  </section>;
}
