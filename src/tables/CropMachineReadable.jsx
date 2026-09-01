import React, { useState } from "react";
import { useAppCtx } from "../context/AppCtx";
import { ColorValue, convTime, convtimenbr, frmtNb } from "../fct.js";
import { selectCurrentProjection } from "../utils/farmState.js";
import { imgcrops, imgexchng, imgsfl, imgsunflowerseed, imgstopwatch } from "../constants/images.js";
import CropMachineDailyRecap from "./CropMachineDailyRecap.jsx";

const LAST_AVAILABLE_CROP = "Soybean";

const number = (value) => Number(value || 0);
const signed = (value) => `${number(value) > 0 ? "+" : ""}${frmtNb(value)}`;

export function buildCropMachineRows({ it, machine, options, tryMode, seedMode, customSeeds, selectedCrops }) {
  let available = true;
  const tradeTax = (100 - number(options?.tradeTax)) / 100;
  const coinRatio = number(options?.coinsRatio) || 1;
  const oilRate = number(tryMode ? machine?.moiltry : machine?.moil);
  const oilUnitCost = number(tryMode ? it?.Oil?.costtry : it?.Oil?.cost) / coinRatio;
  const oilCostPerHour = oilRate * oilUnitCost;

  return Object.entries(it || {}).flatMap(([name, crop]) => {
    if (crop?.cat !== "crop" || crop?.greenhouse) return [];
    if (name === LAST_AVAILABLE_CROP) available = false;

    const cropData = (tryMode ? machine?.perCroptry : machine?.perCrop)?.[name] || {};
    const stock = number(tryMode ? crop.stocktry : crop.stock);
    const maxSeeds = stock * 2.5;
    const custom = customSeeds?.[name] ?? stock;
    const seeds = number(seedMode === "max" ? maxSeeds : seedMode === "stock" ? stock : custom);
    const profile = seedMode === "stock" ? cropData.stock : seedMode === "max" ? cropData.max : null;
    const timePerSeed = number(cropData.packHoursPerSeed || (convtimenbr(crop.btime) * number(tryMode ? machine?.mtimetry : machine?.mtime) / (number(tryMode ? machine?.spottry : machine?.spot) || 1)));
    const harvestPerSeed = number(cropData.harvestPerSeed || (tryMode ? crop.harvestnodetry : crop.harvestnode));
    const seedCostPerSeed = number(cropData.seedCostPerSeed || (number(tryMode ? crop.seedtry : crop.seed) / coinRatio));
    const marketPerUnit = number(cropData.marketPerUnitAfterTax || (number(crop.costp2pt) * tradeTax));
    const batchDays = number(profile?.packHours ?? (timePerSeed * seeds));
    const harvest = number(profile?.harvestPerPack ?? (harvestPerSeed * seeds));
    const seedCost = number(profile?.seedCostPerPack ?? (seedCostPerSeed * seeds));
    const oil = number(profile?.oilPerPack ?? (oilRate * batchDays * 24));
    const oilCost = number(profile?.oilCostPerPack ?? (oilCostPerHour * batchDays * 24));
    const cost = number(profile?.packCost ?? (seedCost + oilCost));
    const market = number(profile?.packMarket ?? (marketPerUnit * harvest));
    const profit = number(profile?.packProfit ?? (market - cost));
    const gainPerHour = batchDays > 0 ? profit / (batchDays * 24) : 0;

    const dailyProfile = cropData.max || null;
    const dailySeeds = number(dailyProfile?.seeds ?? maxSeeds);
    const dailyPackDays = number(dailyProfile?.packHours ?? (timePerSeed * dailySeeds));
    const dailyHarvestPerPack = number(dailyProfile?.harvestPerPack ?? (harvestPerSeed * dailySeeds));
    const dailySeedCostPerPack = number(dailyProfile?.seedCostPerPack ?? (seedCostPerSeed * dailySeeds));
    const cycles = dailyPackDays > 1 ? Math.max(0, 1 / dailyPackDays) : Math.max(0, Math.floor(dailyPackDays > 0 ? 1 / dailyPackDays : 0));
    const seedsPerDay = dailySeeds * cycles;
    const dailyRestocks = stock > 0 ? Math.max(0, Math.ceil(seedsPerDay / stock) - 1) : 0;
    const dailyRestockSfl = dailyRestocks * 15 * number(options?.gemsRatio);
    const dailySeedCost = dailySeedCostPerPack * cycles;
    const dailyOil = 24 * oilRate;
    const dailyOilCost = 24 * oilCostPerHour;
    const dailyCost = dailySeedCost + dailyOilCost + (options?.restockCostDaily ? dailyRestockSfl : 0);
    const dailyHarvest = dailyHarvestPerPack * cycles;
    const dailyMarket = marketPerUnit * dailyHarvest;
    const dailyProfit = dailyMarket - dailyCost;

    return [{
      name, crop, available, active: available && !!(selectedCrops?.[name] ?? true), stock, maxSeeds, seeds,
      time: convTime(batchDays), batchDays, harvest, seedCost, oil, oilCost, cost, market, profit, gainPerHour,
      dailyProfit,
      gainTooltip: { itemImage: crop.img, growTime: convTime(batchDays), costPerPack: cost, marketPerPack: market, profitPerPack: profit, gainPerHour },
      dailyTooltip: {
        itemImage: crop.img, oilImage: it?.Oil?.img, cycles, growTime: convTime(dailyPackDays), seedStock: stock,
        packSeeds: dailySeeds, seedsPerBatch: dailySeeds, seedsPerDay, harvestPerBatch: dailyHarvestPerPack,
        harvestPerDay: dailyHarvest, seedCostPerBatch: dailySeedCostPerPack, seedCostPerDay: dailySeedCost,
        oilPerDay: dailyOil, oilCostPerDay: dailyOilCost, dailyRestock: dailyRestocks,
        dailyRestockGems: dailyRestocks * 15, dailyRestockSfl, costPerDay: dailyCost, marketPerDay: dailyMarket,
        profitPerDay: dailyProfit, profitMultiplier: dailyCost > 0 ? dailyMarket / dailyCost : null,
        profitPercent: dailyCost > 0 ? Math.ceil((dailyMarket / dailyCost) * 100) - 100 : null,
        restockCostEnabled: !!options?.restockCostDaily, taxPercent: number(options?.tradeTax),
      },
    }];
  });
}

export default function CropMachineReadableTable() {
  const {
    data: { dataSet, dataSetFarm },
    ui: { customSeedCM, toCM, selectedSeedsCM, xListeColCropMachine, TryChecked },
    actions: { handleUIChange, handleOptionChange, handleTooltip },
  } = useAppCtx();
  const source = selectCurrentProjection(dataSetFarm, "cropMachineData") || dataSetFarm;
  const it = source?.itables?.it;
  const machine = source?.CropMachine;
  const options = dataSet?.options;
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [expandedRows, setExpandedRows] = useState(() => new Set());

  if (!it || !machine || !options) return <div className="crop-machine-readable-loading">Preparing Crop Machine…</div>;

  const seedMode = selectedSeedsCM || "stock";
  const rows = buildCropMachineRows({ it, machine, options, tryMode: TryChecked, seedMode, customSeeds: customSeedCM, selectedCrops: toCM });
  const availableRows = rows.filter((row) => row.available);
  const unavailableCount = rows.length - availableRows.length;
  const unavailableRows = rows.filter((row) => !row.available);
  const showCol = (index) => xListeColCropMachine?.[index]?.[1] !== 0;
  const showNames = showCol(1);
  const showDaily = showCol(12);
  const summaryColumns = [2, 3, 4, 6, 9, 10, 11, ...(showDaily ? [12] : [])].filter(showCol);
  const detailColumns = [4, 5, 6, 7, 8, 9].filter(showCol);
  const tableColumnCount = 1 + summaryColumns.length;
  const narrowTableColumnCount = 1 + [2, 3, 10, 11, ...(showDaily ? [12] : [])].filter(showCol).length;
  const toggleRow = (name) => setExpandedRows((current) => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });
  const selected = rows.filter((row) => row.active);
  const totals = selected.reduce((sum, row) => ({
    time: sum.time + row.batchDays,
    seeds: sum.seeds + row.seeds,
    harvest: sum.harvest + row.harvest,
    seedCost: sum.seedCost + row.seedCost,
    oil: sum.oil + row.oil,
    oilCost: sum.oilCost + row.oilCost,
    cost: sum.cost + row.cost,
    market: sum.market + row.market,
    profit: sum.profit + row.profit,
    daily: sum.daily + row.dailyProfit,
  }), { time: 0, seeds: 0, harvest: 0, seedCost: 0, oil: 0, oilCost: 0, cost: 0, market: 0, profit: 0, daily: 0 });
  const totalHourly = totals.time > 0 ? totals.profit / (totals.time * 24) : 0;

  return (
    <main className={`crop-machine-readable-page crop-machine-table ${showNames ? "show-crop-name" : "hide-crop-name"}`}>
      <section className="cm-readable-toolbar">
        <div>
          <strong>Batch size</strong>
          <span>Choose how many seeds each crop sends to the machine.</span>
        </div>
        <div className="cm-seed-modes" role="group" aria-label="Batch seed quantity">
          {[{ value: "stock", label: "Stock" }, { value: "max", label: "Maximum" }, { value: "custom", label: "Custom" }].map((mode) => (
            <button key={mode.value} type="button" className={seedMode === mode.value ? "is-selected" : ""}
              onClick={() => handleUIChange({ target: { name: "selectedSeedsCM", value: mode.value } })}>
              {mode.label}
            </button>
          ))}
        </div>
      </section>

      <CropMachineDailyRecap rows={rows} options={options} oilImage={it.Oil?.img} source={source} />

      <section className="cm-comparison-wrap">
        <table className="cm-comparison-table cm-summary-table">
          <thead>
            <tr className="cm-column-head">
              <th className="cm-crop-column"><HeaderIcon icon={imgcrops} label={showNames ? "Crop" : ""} /></th>
              {showCol(2) ? <th><HeaderIcon icon={imgstopwatch} label="Time" /></th> : null}
              {showCol(3) ? <th><HeaderIcon icon={imgsunflowerseed} label="Seeds" /></th> : null}
              {showCol(4) ? <th className="cm-wide-column cm-harvest-column"><HeaderIcon icon={imgcrops} label="Harvest" /></th> : null}
              {showCol(6) ? <th className="cm-wide-column"><HeaderIcon icon={it.Oil?.img} label="Oil" /></th> : null}
              {showCol(9) ? <th className="cm-wide-column"><HeaderIcon icon={imgexchng} label="Market" /></th> : null}
              {showCol(10) ? <th><HeaderIcon icon={imgsfl} label="Profit" /></th> : null}
              {showCol(11) ? <th><HeaderLabel label="Per hour" /></th> : null}
              {showDaily ? <th><HeaderLabel label="Per day" /></th> : null}
            </tr>
          </thead>
          <tbody>
            <tr className="cm-totals-row">
              <th className="cm-crop-column"><span>{showNames ? "Selected total" : "Total"}</span><small>{selected.length}</small></th>
              {showCol(2) ? <td>{convTime(totals.time)}</td> : null}
              {showCol(3) ? <td aria-label="No seeds total" /> : null}
              {showCol(4) ? <td className="cm-wide-column cm-harvest-column" aria-label="No harvest total" /> : null}
              {showCol(6) ? <td className="cm-wide-column">{frmtNb(totals.oil)}</td> : null}
              {showCol(9) ? <td className="cm-wide-column">{frmtNb(totals.market)}</td> : null}
              {showCol(10) ? <td className="cm-main-profit" style={{ color: ColorValue(totals.profit, 0, 10) }}>{signed(totals.profit)}</td> : null}
              {showCol(11) ? <td className="cm-main-profit" style={{ color: ColorValue(totalHourly, 0, 10) }}>{signed(totalHourly)}</td> : null}
              {showDaily ? <td>
                <label className="cm-daily-restock-toggle" title="Count restock costs in the daily profit calculation">
                  <input
                    type="checkbox"
                    name="restockCostDaily"
                    checked={!!options.restockCostDaily}
                    onChange={handleOptionChange}
                    aria-label="Count restock costs in daily profit"
                  />
                  <span>Restock<small>Cost</small></span>
                </label>
              </td> : null}
            </tr>
            {availableRows.map((row) => <CropRow key={row.name} row={row} seedMode={seedMode} customSeed={customSeedCM?.[row.name] ?? row.stock}
              oilImage={it.Oil?.img} showDaily={showDaily} showCol={showCol} showNames={showNames} detailColumns={detailColumns} expanded={expandedRows.has(row.name)} onToggle={() => toggleRow(row.name)} onChange={handleUIChange} onTooltip={handleTooltip} />)}
            {unavailableCount > 0 ? <>
              <tr className="cm-future-row cm-narrow-future-row"><td colSpan={narrowTableColumnCount}><button type="button" onClick={() => setShowUnavailable((value) => !value)} aria-expanded={showUnavailable}>{showUnavailable ? "− Hide" : "+ Show"} {unavailableCount} future crops</button></td></tr>
              <tr className="cm-future-row cm-wide-future-row"><td colSpan={tableColumnCount}><button type="button" onClick={() => setShowUnavailable((value) => !value)} aria-expanded={showUnavailable}>{showUnavailable ? "− Hide" : "+ Show"} {unavailableCount} future crops</button></td></tr>
            </> : null}
            {showUnavailable ? unavailableRows.map((row) => <CropRow key={row.name} row={row} seedMode={seedMode} customSeed={customSeedCM?.[row.name] ?? row.stock}
              oilImage={it.Oil?.img} showDaily={showDaily} showCol={showCol} showNames={showNames} detailColumns={detailColumns} expanded={expandedRows.has(row.name)} onToggle={() => toggleRow(row.name)} onChange={handleUIChange} onTooltip={handleTooltip} />) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function CropRow({ row, seedMode, customSeed, oilImage, showDaily, showCol, showNames, detailColumns, expanded, onToggle, onChange, onTooltip }) {
  const canExpand = detailColumns.length > 0;
  const narrowColumnCount = 1 + [2, 3, 10, 11, ...(showDaily ? [12] : [])].filter(showCol).length;
  const wideColumnCount = 1 + [2, 3, 4, 6, 9, 10, 11, ...(showDaily ? [12] : [])].filter(showCol).length;
  const handleRowClick = (event) => {
    if (!canExpand || event.target.closest("button, input, label, a, select, textarea")) return;
    onToggle();
  };
  const handleRowKeyDown = (event) => {
    if (!canExpand || event.target.closest("button, input, label, a, select, textarea") || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onToggle();
  };

  return (
    <>
      <tr className={`${row.active ? "is-active" : "is-inactive"} ${!row.available ? "is-unavailable" : ""} ${canExpand ? "is-expandable" : ""}`}
        onClick={handleRowClick} onKeyDown={handleRowKeyDown} tabIndex={canExpand ? 0 : undefined} aria-expanded={canExpand ? expanded : undefined}>
        <th className="cm-crop-column">
          <div className="cm-crop-choice" title={row.available ? (row.active ? "Included in totals" : "Excluded from totals") : "Not available yet"}>
            {row.available && showCol(0) ? <input id={`cm-select-${row.name}`} type="checkbox" name={`toCM.${row.name}`} checked={row.active} onChange={onChange} aria-label={`Include ${row.name}`} /> : null}
            {row.available && showCol(0)
              ? <label className="cm-crop-icon" htmlFor={`cm-select-${row.name}`} aria-label={`Include ${row.name}`}><img src={row.crop.img} alt="" /></label>
              : <span className="cm-crop-icon"><img src={row.crop.img} alt="" /></span>}
            {showNames ? <span><strong>{row.name}</strong>{!row.available ? <small>Coming later</small> : null}</span> : null}
          </div>
        </th>
        {showCol(2) ? <td>{row.time}</td> : null}
        {showCol(3) ? <td>{seedMode === "custom" && row.available ? <input className="cm-custom-seeds" name={`customSeedCM.${row.name}`} inputMode="numeric" pattern="[0-9]*" value={customSeed} onChange={onChange} aria-label={`${row.name} seeds`} /> : frmtNb(row.seeds)}</td> : null}
        {showCol(4) ? <td className="cm-wide-column cm-harvest-column">{frmtNb(row.harvest)}</td> : null}
        {showCol(6) ? <td className="cm-wide-column">{frmtNb(row.oil)}</td> : null}
        {showCol(9) ? <td className="cm-wide-column">{frmtNb(row.market)}</td> : null}
        {showCol(10) ? <td className="cm-main-profit" style={{ color: ColorValue(row.profit, 0, 10) }}>{signed(row.profit)}</td> : null}
        {showCol(11) ? <td><button className="cm-main-value" type="button" style={{ color: ColorValue(row.gainPerHour, 0, 10) }} onClick={(event) => onTooltip(row.name, "cmgainh", row.gainTooltip, event)}>{signed(row.gainPerHour)}</button></td> : null}
        {showDaily ? <td><button className="cm-main-value" type="button" style={{ color: ColorValue(row.dailyProfit, 0, 10) }} onClick={(event) => onTooltip(row.name, "cmdailysfl", row.dailyTooltip, event)}>{signed(row.dailyProfit)}</button></td> : null}
      </tr>
      {expanded ? <tr className="cm-detail-row">
        <td className="cm-narrow-detail-cell" colSpan={narrowColumnCount}><CropDetails row={row} oilImage={oilImage} showCol={showCol} /></td>
        <td className="cm-wide-detail-cell" colSpan={wideColumnCount}><CropDetails row={row} oilImage={oilImage} showCol={showCol} /></td>
      </tr> : null}
    </>
  );
}

function HeaderIcon({ icon, label }) {
  return <span className="cm-header-icon"><img src={icon} alt="" />{label ? <span>{label}</span> : null}</span>;
}

function HeaderLabel({ label }) {
  return label ? <span className="cm-header-label">{label}</span> : null;
}

function CropDetails({ row, oilImage, showCol }) {
  return <div className="cm-detail-grid">
    {showCol(4) || showCol(5) ? <DetailPair items={[
      showCol(4) ? { label: "Harvest", value: row.harvest, className: "cm-harvest-detail" } : null,
      showCol(5) ? { label: "Seed cost", value: row.seedCost } : null,
    ]} /> : null}
    {showCol(6) || showCol(7) ? <DetailPair items={[
      showCol(6) ? { label: "Oil", value: row.oil, icon: oilImage, className: "cm-narrow-detail" } : null,
      showCol(7) ? { label: "Oil cost", value: row.oilCost } : null,
    ]} /> : null}
    {showCol(8) || showCol(9) ? <DetailPair items={[
      showCol(8) ? { label: "Total cost", value: row.cost, strong: true } : null,
      showCol(9) ? { label: "Market", value: row.market, icon: imgexchng, className: "cm-narrow-detail" } : null,
    ]} /> : null}
  </div>;
}

function DetailPair({ items }) {
  return <div className="cm-detail-pair">
    {items.filter(Boolean).map((item) => <span className={item.className || ""} key={item.label}>
      <small>{item.label}</small>
      <strong className={item.strong ? "is-strong" : ""}>{item.icon ? <img src={item.icon} alt="" /> : null}{frmtNb(item.value)}</strong>
    </span>)}
  </div>;
}

function Detail({ icon, label, value, strong, className = "" }) {
  return <div className={className}><small>{label}</small><strong className={strong ? "is-strong" : ""}>{icon ? <img src={icon} alt="" /> : null}{value}</strong></div>;
}
