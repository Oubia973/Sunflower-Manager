import React, { useState, useEffect, useMemo } from 'react';
import Graph from './graph.js';
import DList from "./dlist.jsx";
import { imgna, imgcancel, normalizeServerImagesDeep, normalizeServerImageUrl } from "./constants/images.js";
import { fetchJson } from "./services/apiClient.js";

function parseGraphDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const raw = String(value || "").trim();
  if (!raw) return null;

  const iso = new Date(raw);
  if (!Number.isNaN(iso.getTime())) return iso;

  const hourMatch = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2})$/);
  if (hourMatch) {
    const [, datePart, hourPart] = hourMatch;
    const d = new Date(`${datePart}T${hourPart}:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const minuteMatch = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})$/);
  if (minuteMatch) {
    const [, datePart, hourPart, minutePart] = minuteMatch;
    const d = new Date(`${datePart}T${hourPart}:${minutePart}:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function downsampleGraphResponse(rows, graphRange) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const stepMsByRange = {
    "7d": 12 * 60 * 60 * 1000,
    "3m": 3 * 24 * 60 * 60 * 1000,
  };
  const stepMs = stepMsByRange[graphRange];
  if (!stepMs) return rows;

  const rowsById = new Map();
  for (const row of rows) {
    const idKey = String(row?.id ?? "");
    if (!rowsById.has(idKey)) rowsById.set(idKey, []);
    rowsById.get(idKey).push(row);
  }

  const sampled = [];
  for (const idRows of rowsById.values()) {
    const sorted = [...idRows]
      .map((row) => ({ row, parsedDate: parseGraphDate(row?.date) }))
      .filter(({ parsedDate }) => parsedDate)
      .sort((a, b) => a.parsedDate - b.parsedDate);
    let lastKeptTs = null;

    for (let i = 0; i < sorted.length; i += 1) {
      const { row, parsedDate } = sorted[i];
      const ts = parsedDate.getTime();
      const isLast = i === sorted.length - 1;
      if (lastKeptTs === null || (ts - lastKeptTs) >= stepMs || isLast) {
        sampled.push(row);
        lastKeptTs = ts;
      }
    }
  }

  return sampled;
}

function extractGraphMetaFromFarmState(farmState) {
  const sources = [
    farmState,
    farmState?.invData,
    farmState?.cookData,
    farmState?.fishData,
    farmState?.bountyData,
    farmState?.craftData,
    farmState?.flowerData,
    farmState?.expandPageData,
    farmState?.animalData,
    farmState?.petData,
    farmState?.mapData,
    farmState?.cropMachineData,
    farmState?.buyNodesData,
  ];
  const out = {};
  const upsert = (itemName, itemData) => {
    const id = Number(itemData?.id);
    if (!Number.isFinite(id)) return;
    out[id] = {
      id,
      name: itemName,
      color: itemData?.color || "#6b7280",
      cat: itemData?.cat || "",
      img: itemData?.img || imgna,
      active: Number(itemData?.supply || 0),
      inactive: Number(itemData?.inactive || 0),
      listed: Number(itemData?.listed || 0),
    };
  };
  sources.forEach((src) => {
    const tables = src?.itables;
    if (!tables || typeof tables !== "object") return;
    const it = tables?.it || {};
    const petit = tables?.petit || {};
    Object.keys(it).forEach((name) => upsert(name, it[name]));
    Object.keys(petit).forEach((name) => upsert(name, petit[name]));
  });
  return out;
}

function buildQuantityItemOptions(rows, graphMetaById) {
  const seen = new Set();
  const options = [];
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const id = Number(row?.id);
    if (!Number.isFinite(id) || seen.has(id)) return;
    seen.add(id);
    const meta = graphMetaById?.[id] || graphMetaById?.[String(id)] || {};
    const label = String(meta?.name || row?.name || `#${id}`).trim();
    const iconSrc = normalizeServerImageUrl(meta?.img || row?.img || imgna);
    options.push({
      value: String(id),
      label,
      iconSrc,
    });
  });
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

function ModalGraph({ onClose, graphtype, frmid, dataSetFarm, API_URL, username }) {
  const GRAPH_CATEGORY_KEYS = ["all", "crops", "wood minerals", "fruits honey", "animals", "pets", "boost"];
  const [chartData, setChartData] = useState([]);
  const [sharedChartDataRaw, setSharedChartDataRaw] = useState([]);
  const [sharedChartData, setSharedChartData] = useState([]);
  const [boostChartDataRaw, setBoostChartDataRaw] = useState([]);
  const [boostChartData, setBoostChartData] = useState([]);
  const [boostDataCache, setBoostDataCache] = useState({});
  const [Graphstartdate, setGraphstartdate] = useState('31d');
  const [selectedCategory, setSelectedCategory] = useState('crops');
  const [legendResetToken, setLegendResetToken] = useState(0);
  const [graphMetaById, setGraphMetaById] = useState({});
  const [graphLoadingCount, setGraphLoadingCount] = useState(0);
  const [selectedQuantityItemId, setSelectedQuantityItemId] = useState("");
  const [quantityDisplayMode, setQuantityDisplayMode] = useState("auto");
  const isGraphLoading = graphLoadingCount > 0;
  const visibleCategoryKeys = GRAPH_CATEGORY_KEYS.filter((category) => category !== "all");
  const quantityItemOptions = useMemo(
    () => buildQuantityItemOptions(chartData, graphMetaById),
    [chartData, graphMetaById]
  );
  useEffect(() => {
    const localMeta = extractGraphMetaFromFarmState(dataSetFarm);
    if (!localMeta || Object.keys(localMeta).length < 1) return;
    setGraphMetaById((prev) => ({ ...localMeta, ...(prev || {}) }));
  }, [dataSetFarm]);
  const closeModal = () => {
    onClose();
  };
  const [vals, setVals] = useState("price");
  const handlePriceClick = () => {
    //graphtype = "Marketplace";
    //ReqGraph();
    setVals("price");
  };
  const handleSupplyClick = () => {
    //graphtype = "OpenSea";
    //ReqGraph();
    setVals("supply");
  };
  const handleTradesClick = () => {
    setVals("ntrade");
  };
  const handleChangeGraphdate = (event) => {
    const selectedValue = event.target.value;
    setGraphstartdate(selectedValue);
  };
  const handleChangeQuantityItem = (event) => {
    const selectedValue = String(event?.target?.value || "");
    setSelectedQuantityItemId(selectedValue);
    setQuantityDisplayMode("on");
  };
  const handleSoloQuantityItem = (itemId) => {
    if (quantityDisplayMode !== "auto") return;
    const nextId = String(itemId ?? "");
    if (nextId) setSelectedQuantityItemId(nextId);
  };
  async function ReqGraph(fetchMode = "shared") {
    try {
      const boostCacheKey = `${String(graphtype || "")}|${String(Graphstartdate || "")}`;
      if (fetchMode === "boost" && Array.isArray(boostDataCache?.[boostCacheKey])) {
        setBoostChartData(boostDataCache[boostCacheKey]);
        return;
      }
      setGraphLoadingCount((prev) => prev + 1);

      let graphstart = "";
      var xformdate = "";
      let xinterval = "";
      if (Graphstartdate === "24h") {
        const currentDate = new Date();
        graphstart = new Date(currentDate);
        graphstart.setDate(currentDate.getDate() - 1);
        xformdate = "H";
      }
      if (Graphstartdate === "7d") {
        const currentDate = new Date();
        graphstart = new Date(currentDate);
        graphstart.setDate(currentDate.getDate() - 7);
        xformdate = "H";
        xinterval = "12h";
      }
      if (Graphstartdate === "31d") {
        const currentDate = new Date();
        graphstart = new Date(currentDate);
        graphstart.setDate(currentDate.getDate() - 31);
        xformdate = "D";
      }
      if (Graphstartdate === "3m") {
        const currentDate = new Date();
        graphstart = new Date(currentDate);
        graphstart.setDate(currentDate.getDate() - 93);
        xformdate = "D";
        xinterval = "3d";
      }
      let endpoint = "";
      if (fetchMode === "boost") {
        endpoint = "/getHB";
      } else {
        if (graphtype === "Marketplace") { endpoint = "/getHT" }
        if (graphtype === "Nifty") { endpoint = "/getHN" }
        if (graphtype === "OpenSea") { endpoint = "/getHO" }
      }
      const responseData = await fetchJson(API_URL, endpoint, {
        method: 'GET',
        headers: {
          xformdate: xformdate,
          xinterval: xinterval,
          xgraphdate: graphstart.toISOString(),
          frmid: frmid,
          username: username,
          xsource: graphtype,
        },
        timeoutMs: 30_000,
      });
        const sampledRows = (fetchMode === "boost")
          ? (Array.isArray(responseData) ? responseData : [])
          : downsampleGraphResponse(responseData, Graphstartdate);
        if (fetchMode === "boost") {
          setBoostChartDataRaw(Array.isArray(responseData) ? responseData : []);
          setBoostChartData(sampledRows);
          setBoostDataCache((prev) => ({ ...(prev || {}), [boostCacheKey]: sampledRows }));
        } else {
          setSharedChartDataRaw(Array.isArray(responseData) ? responseData : []);
          setSharedChartData(sampledRows);
        }

        const localMeta = extractGraphMetaFromFarmState(dataSetFarm);
        const nextMeta = { ...localMeta, ...graphMetaById };
        const rowIds = [...new Set(sampledRows.map((row) => Number(row?.id)).filter((id) => Number.isFinite(id)))];
        const missingIds = rowIds.filter((id) => !nextMeta[id]);
        const idsToFetch = fetchMode === "boost" ? rowIds : missingIds;
        if (idsToFetch.length > 0) {
          const payload = await fetchJson(API_URL, "/getGraphMeta", {
            method: 'POST',
            headers: {
              frmid: frmid,
              username: username
            },
            body: { ids: idsToFetch },
          });
            const fetched = (payload && typeof payload === "object" && payload.items && typeof payload.items === "object")
              ? normalizeServerImagesDeep(payload.items)
              : {};
            Object.keys(fetched).forEach((idKey) => {
              nextMeta[idKey] = fetched[idKey];
            });
        }
        setGraphMetaById(nextMeta);
    } catch (error) {
      console.log(`Error : ${error}`);
    } finally {
      setGraphLoadingCount((prev) => Math.max(0, prev - 1));
    }
  }
  useEffect(() => {
    ReqGraph("shared");
  }, [Graphstartdate, graphtype]);

  useEffect(() => {
    if (selectedCategory !== "boost") return;
    ReqGraph("boost");
  }, [selectedCategory, Graphstartdate, graphtype]);

  useEffect(() => {
    setChartData(selectedCategory === "boost" ? boostChartData : sharedChartData);
  }, [selectedCategory, boostChartData, sharedChartData]);
  useEffect(() => {
    if (quantityItemOptions.length < 1) {
      if (selectedQuantityItemId) setSelectedQuantityItemId("");
      return;
    }
    const hasSelected = quantityItemOptions.some((opt) => opt.value === selectedQuantityItemId);
    if (!hasSelected) {
      setSelectedQuantityItemId(quantityItemOptions[0].value);
    }
  }, [quantityItemOptions, selectedQuantityItemId]);
  return (
    <div className="modalgraph">
      <div className="modalgraph-buttons">
        <div className="modalgraph-header-left">
          <button onClick={closeModal} className="button"><img src={imgcancel} alt="" className="resico" /></button>
          <button type="button" onClick={handlePriceClick} className={`graph-mode-btn ${vals === "price" ? "is-active" : ""}`}>Prices</button>
          <button type="button" onClick={handleSupplyClick} className={`graph-mode-btn ${vals === "supply" ? "is-active" : ""}`}>Supply</button>
          <DList
            name="Graphstartdate"
            title="Graph period"
            options={[
              { value: "24h", label: "24h" },
              { value: "7d", label: "7 days" },
              { value: "31d", label: "1 month" },
              { value: "3m", label: "3 month" },
            ]}
            value={Graphstartdate}
            onChange={handleChangeGraphdate}
            height={22}
          />
          <button type="button" className="graph-mode-btn graph-mode-btn-reset" onClick={() => setLegendResetToken((prev) => prev + 1)}>Reset</button>
          {graphtype === "Marketplace" && selectedCategory !== "boost" && quantityItemOptions.length > 0 ? (
            <div className="quantity-selector-group">
              <DList
                name="quantityItem"
                title="Quantity sold"
                options={quantityItemOptions}
                value={selectedQuantityItemId}
                onChange={handleChangeQuantityItem}
                searchable={true}
                clearable={false}
                height={22}
              />
              <div className="quantity-display-control" role="group" aria-label="Quantity sold display mode">
                {[
                  { value: "off", label: "×", title: "Off — hide quantity sold" },
                  { value: "on", label: "●", title: "On — show the manually selected item" },
                  { value: "auto", label: "A", title: "Auto — follow the item selected with Only show this" },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    className={`quantity-display-btn ${quantityDisplayMode === mode.value ? "is-active" : ""}`}
                    title={mode.title}
                    aria-pressed={quantityDisplayMode === mode.value}
                    onClick={() => setQuantityDisplayMode(mode.value)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="modalgraph-header-right">
          {visibleCategoryKeys.map((category) => (
            <button
              key={category}
              type="button"
              className={`graph-tab-btn ${selectedCategory === category ? "is-active" : ""}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        {/* <button onClick={handlePriceClick}>Prices</button>
        {(graphtype === "OpenSea") && <button onClick={handleSupplyClick}>Supply</button>}
        {(graphtype === "Trader" || graphtype === "OpenSea") && <button onClick={handleTradesClick}>Trades number</button>} */}
        {/* <div className="selectgraphdateback">
          <FormControl id="formselectgraphdate" className="selectgraphdate" size="small">
            <InputLabel></InputLabel>
            <Select value={Graphstartdate} onChange={handleChangeGraphdate}>
              <MenuItem value="24h">24h</MenuItem>
              <MenuItem value="7d">7d</MenuItem>
              <MenuItem value="31d">31d</MenuItem>
              <MenuItem value="3m">3m</MenuItem>
            </Select>
          </FormControl>
        </div> */}
      </div>
      <div className="modalgraph-content" style={{ width: '100%', flex: 1, minHeight: 0 }}>
        <Graph
          data={chartData}
          quantityData={selectedCategory === "boost" ? boostChartDataRaw : sharedChartDataRaw}
          vals={vals}
          dataSetFarm={dataSetFarm}
          graphMeta={graphMetaById}
          selectedCategory={selectedCategory}
          legendResetToken={legendResetToken}
          isLoading={isGraphLoading}
          quantityItemId={selectedQuantityItemId}
          showQuantity={quantityDisplayMode !== "off"}
          onSoloItem={handleSoloQuantityItem}
        />
      </div>
    </div>
  );
}

export default ModalGraph;
