import React from "react";
import { useAppCtx } from "../context/AppCtx";
import { frmtNb, convTime } from "../fct.js";
import {
  imgappleTree,
  imgironSmall,
  imggoldSmall,
  imgcrimstoneRock5,
  imgsunstoneRock1,
  imgoil,
  imglavaPit,
  imgbeehive,
  imgflowerbed,
  imgwoodRes,
  imgstoneRes,
  imgironOre,
  imggoldOre,
  imgcrimstone,
  imgobsidian,
  imggem,
  imgcoins,
  imgsfl as imgFlower,
  imgconfirm,
} from "../constants/images.js";

const ASCENSION_ISLANDS = new Set([
  "swamp",
  "spooky",
  "crystal",
  "galaxy",
  "marble",
]);

function IconHeader({ src, title, className = "nodico" }) {
  // Some icons from the app context are already JSX <img> elements,
  // while the expansion/node icons are plain asset URLs.
  const imageSrc = typeof src === "string" ? src : src?.props?.src;
  if (!imageSrc) return <span title={title}>{title}</span>;
  return <img src={imageSrc} alt="" className={className} title={title} />;
}

function formatDuration(seconds) {
  return convTime((Number(seconds) || 0) / (60 * 60 * 24));
}

function formatRequirement(requirement) {
  if (requirement && typeof requirement === "object") {
    return `A${Number(requirement.ascension) || 0} · L${Number(requirement.level) || 0}`;
  }
  return requirement || "";
}

function present(value, total = false) {
  const number = Number(value) || 0;
  if (!total && number === 0) return "";
  return frmtNb(number);
}

function getResourceValues(resources, it, dataSet, TryChecked) {
  let production = 0;
  let marketplace = 0;
  const gemsRatio = Number(dataSet?.options?.gemsRatio) || 0.07;
  const coinsRatio = Number(dataSet?.options?.coinsRatio) || 1;

  Object.entries(resources || {}).forEach(([name, rawValue]) => {
    const value = Number(rawValue) || 0;
    if (!value) return;

    if (name === "Block Buck") {
      production += (value * gemsRatio) / coinsRatio;
      marketplace += value * gemsRatio;
      return;
    }
    if (name === "Coins") {
      production += value / coinsRatio;
      marketplace += value / coinsRatio;
      return;
    }

    const item = it?.[name] || {};
    const productionCoins = Number(TryChecked ? item.costtry : item.cost) || 0;
    production += (productionCoins * value) / coinsRatio;
    marketplace += (Number(item.costp2pt) || 0) * value;
  });

  return { production, marketplace };
}

export default function ExpandTable() {
  const {
    data: { dataSet, dataSetFarm },
    ui: {
      fromexpand,
      toexpand,
      xListeColExpand,
      TryChecked,
      selectedExpandType,
      selectedExpandAscension,
    },
    actions: { handleUIChange },
    img: {
      imgcrop,
      imgwood,
      imgstone,
      imgbuyit,
      imgprodit,
    },
  } = useAppCtx();

  const expandPageData = dataSetFarm?.expandPageData || {};
  const expandFrmData = expandPageData?.frmData || dataSetFarm?.frmData || {};
  const expandTables = expandPageData?.itables || dataSetFarm?.itables || {};
  const fromToExpand = dataSet?.fromtoexpand;
  const expandData = fromToExpand?.expandData;
  const totals = fromToExpand?.expand;
  const meta = fromToExpand?.meta || {};

  if (!expandData || !totals?.totalResources || !totals?.totalNodes) {
    return (
      <div className="expand-empty">
        <strong>Expansion data unavailable</strong>
        <span>Select an island or reload the farm.</span>
      </div>
    );
  }

  const columns = xListeColExpand || [];
  const showBumpkin = columns?.[1]?.[1] === 1;
  const showRange = columns?.[2]?.[1] === 1;
  const showNodes = columns?.[3]?.[1] === 1;
  const showTime = columns?.[4]?.[1] === 1;
  const showResources = columns?.[5]?.[1] === 1;
  const showValue = columns?.[6]?.[1] === 1;
  const { it = {} } = expandTables;
  const entries = Object.entries(expandData)
    .map(([key, value]) => ({ expansion: Number(key), ...value }))
    .sort((left, right) => left.expansion - right.expansion);

  const hasNode = (name) => entries.some(
    (entry) => Number(entry.nodes?.[name] || entry.nodesBase?.[name]) > 0,
  );
  const nodeColumns = [
    { key: "Crop", title: "Crop Plot", icon: imgcrop },
    { key: "Fruit", title: "Fruit Patch", icon: imgappleTree },
    { key: "Wood", title: "Tree", icon: imgwood },
    { key: "Stone", title: "Stone Node", icon: imgstone },
    { key: "Iron", title: "Iron Node", icon: imgironSmall },
    { key: "Gold", title: "Gold Node", icon: imggoldSmall },
    { key: "Crimstone", title: "Crimstone Node", icon: imgcrimstoneRock5 },
    { key: "Sunstone", title: "Sunstone Node", icon: imgsunstoneRock1 },
    { key: "Beehive", title: "Beehive", icon: imgbeehive, iconClass: "itico" },
    ...(hasNode("Flower")
      ? [{ key: "Flower", title: "Flower Bed", icon: imgflowerbed, iconClass: "itico" }]
      : []),
    { key: "Oil", title: "Oil Reserve", icon: imgoil },
    { key: "Lavapit", title: "Lava Pit", icon: imglavaPit },
    ...(hasNode("Ascension Crystal")
      ? [{ key: "Ascension Crystal", title: "Ascension Crystal", icon: imggem, iconClass: "itico" }]
      : []),
  ].filter((node) => hasNode(node.key));
  const resourceColumns = [
    { key: "Wood", title: "Wood", icon: imgwoodRes },
    { key: "Stone", title: "Stone", icon: imgstoneRes },
    { key: "Iron", title: "Iron", icon: imgironOre },
    { key: "Gold", title: "Gold", icon: imggoldOre },
    { key: "Crimstone", title: "Crimstone", icon: imgcrimstone },
    { key: "Oil", title: "Oil", icon: imgoil },
    { key: "Obsidian", title: "Obsidian", icon: imgobsidian },
    { key: "Block Buck", title: "Gems", icon: imggem },
    { key: "Coins", title: "Coins", icon: imgcoins },
  ].filter((resource) => entries.some(
    (entry) => Number(entry.resources?.[resource.key]) > 0,
  ));
  const showNodeColumns = showNodes && nodeColumns.length > 0;
  const showResourceColumns = showResources && resourceColumns.length > 0;

  const selectedType = String(meta.islandType || selectedExpandType || "");
  const selectedAscension = Number(
    meta.ascensionLevel || selectedExpandAscension || 0,
  );
  const farmExpand = expandFrmData?.expandData || {};
  const sameFarmProfile = (
    String(farmExpand?.type || "") === selectedType
    && (
      !ASCENSION_ISLANDS.has(selectedType)
      || Number(farmExpand?.ascensionLevel || 1) === selectedAscension
    )
  );
  const farmCurrent = sameFarmProfile ? Number(farmExpand?.current) : null;
  const from = Number(fromexpand);
  const to = Number(toexpand);
  const rangeStart = Number.isFinite(from) ? from + 1 : Number(meta.baseExpansion) || 1;
  const rangeEnd = Number.isFinite(to) ? to : Number(meta.maxExpansion) || entries.at(-1)?.expansion;
  const totalValues = getResourceValues(
    totals.totalResources,
    it,
    dataSet,
    TryChecked,
  );
  return (
    <section className="expand-page" aria-label="Expansion planner">
      <div className="expand-table-scroll">
        <table className="table expand-table">
          <thead>
            <tr className="expand-group-head">
              <th className="expand-lvl-sticky" rowSpan="2">LVL</th>
              {showBumpkin ? <th rowSpan="2">Required</th> : null}
              <th rowSpan="2">Farm</th>
              {showRange ? <th colSpan="2">Route</th> : null}
              {showNodeColumns ? <th colSpan={nodeColumns.length}>Nodes gained</th> : null}
              {showTime ? <th rowSpan="2">Time</th> : null}
              {showResourceColumns ? <th colSpan={resourceColumns.length}>Resources required</th> : null}
              {showValue ? <th colSpan="2">Value</th> : null}
            </tr>
            <tr className="expand-column-head">
              {showRange ? <th>From</th> : null}
              {showRange ? <th>To</th> : null}
              {showNodeColumns ? nodeColumns.map((node) => (
                <th key={node.key}>
                  <IconHeader
                    src={node.icon}
                    title={node.title}
                    className={node.iconClass}
                  />
                </th>
              )) : null}
              {showResourceColumns ? resourceColumns.map((resource) => (
                <th key={resource.key}>
                  <IconHeader src={resource.icon} title={resource.title} className="itico" />
                </th>
              )) : null}
              {showValue ? <th title="Production cost">Cost <IconHeader src={imgprodit} title="Production cost" className="itico" /></th> : null}
              {showValue ? <th title="Marketplace cost">Bought <IconHeader src={imgbuyit} title="Marketplace cost" className="itico" /></th> : null}
            </tr>
            <tr className="expand-total-row">
              <th className="expand-lvl-sticky">TOTAL</th>
              {showBumpkin ? <td /> : null}
              <td />
              {showRange ? <td /> : null}
              {showRange ? <td /> : null}
              {showNodeColumns ? nodeColumns.map((node) => (
                <td className="tdcenter" key={node.key}>{present(totals.totalNodes[node.key], true)}</td>
              )) : null}
              {showTime ? <td className="tdcenter">{formatDuration(totals.totalTime)}</td> : null}
              {showResourceColumns ? resourceColumns.map((resource) => (
                <td className="tdcenter" key={resource.key}>{present(totals.totalResources[resource.key], true)}</td>
              )) : null}
              {showValue ? <td className="tdcenter">{frmtNb(totalValues.production)}</td> : null}
              {showValue ? <td className="tdcenter">{frmtNb(totalValues.marketplace)}</td> : null}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const rowNodes = entry.nodes || entry.nodesBase || {};
              const rowResources = entry.resources || {};
              const rowValues = getResourceValues(rowResources, it, dataSet, TryChecked);
              const isFarm = Number.isFinite(farmCurrent) && farmCurrent === entry.expansion;
              const isSelected = entry.expansion >= rangeStart && entry.expansion <= rangeEnd;
              const rowClass = [
                isFarm ? "is-farm" : "",
                isSelected ? "is-selected-route" : "",
                entry.isBase ? "is-base" : "",
              ].filter(Boolean).join(" ");

              return (
                <tr key={entry.expansion} className={rowClass}>
                  <td className="tdcenter expand-lvl-sticky">
                    <span>{entry.expansion}</span>
                    {entry.localExpansion ? <small>{entry.localExpansion}/12</small> : null}
                  </td>
                  {showBumpkin ? (
                    <td className="tdcenter expand-requirement">
                      {formatRequirement(entry.bumpkinLevel)}
                    </td>
                  ) : null}
                  <td className="tdcenter">
                    {isFarm ? <img src={imgconfirm} alt="Current farm" className="itico" title="Your current expansion" /> : ""}
                    {entry.isBase && !isFarm ? <span className="expand-base-label">Base</span> : null}
                  </td>
                  {showRange ? (
                    <td className="tdcenter">
                      <input
                        type="radio"
                        aria-label={`Start after expansion ${entry.expansion}`}
                        name="fromexpand"
                        value={entry.expansion}
                        className="round-checkbox"
                        checked={from === entry.expansion}
                        onChange={handleUIChange}
                      />
                    </td>
                  ) : null}
                  {showRange ? (
                    <td className="tdcenter">
                      <input
                        type="radio"
                        aria-label={`Finish at expansion ${entry.expansion}`}
                        name="toexpand"
                        value={entry.expansion}
                        className="round-checkbox"
                        checked={to === entry.expansion}
                        onChange={handleUIChange}
                      />
                    </td>
                  ) : null}
                  {showNodeColumns ? nodeColumns.map((node) => (
                    <td className="tdcenter" key={node.key}>
                      {present(rowNodes[node.key])}
                    </td>
                  )) : null}
                  {showTime ? <td className="tdcenter expand-time">{entry.seconds ? formatDuration(entry.seconds) : ""}</td> : null}
                  {showResourceColumns ? resourceColumns.map((resource) => (
                    <td className="tdcenter" key={resource.key}>
                      {present(rowResources[resource.key])}
                    </td>
                  )) : null}
                  {showValue ? <td className="tdcenter expand-value">{entry.resources ? frmtNb(rowValues.production) : ""}</td> : null}
                  {showValue ? <td className="tdcenter expand-value">{entry.resources ? frmtNb(rowValues.marketplace) : ""}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
