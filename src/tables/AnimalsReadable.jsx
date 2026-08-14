import React, { useState } from "react";
import { useAppCtx } from "../context/AppCtx";
import { frmtNb, ColorValue, PBar } from "../fct.js";
import { imgmix, imgomni, imghoneyTreat, imgsaltLick } from "../constants/images.js";
import { selectCurrentProjection } from "../utils/farmState.js";
import createAnimalUnitCostContract from "../tooltip/animalUnitCostContract.js";

const ANIMAL_PRODUCTS = {
  Chicken: ["Egg", "Feather"],
  Cow: ["Milk", "Leather"],
  Sheep: ["Wool", "Merino Wool"],
};

const fmt = (value, digits = 2) => Number(value || 0).toFixed(digits);

export default function AnimalsReadableTable() {
  const [selectedAnimalName, setSelectedAnimalName] = useState("");
  const [detailView, setDetailView] = useState("levels");
  const {
    data: { dataSet, dataSetFarm },
    ui: { selectedAnimalLvl, selectedAnimalPettings, TryChecked },
    actions: { handleTooltip },
    img: { imgSFL, imgcow, imgsheep, imgchkn, imgna, imgprodit, imgbuyit },
  } = useAppCtx();

  const animalPageData = selectCurrentProjection(dataSetFarm, "animalData") || {};
  const animalsData = animalPageData?.Animals || dataSetFarm?.Animals || {};
  const animalsAllLvlData = animalPageData?.animalsAllLvl || dataSetFarm?.animalsAllLvl || {};
  const animalTables = { ...(dataSetFarm?.itables || {}), ...(animalPageData?.itables || {}) };
  const animalBoostables = { ...(animalPageData?.boostables || {}), ...(dataSetFarm?.boostables || {}) };

  if (!animalTables?.it || !animalTables?.mutant || !animalBoostables?.nft) {
    return <div className="animals-readable-loading">Preparing your animals…</div>;
  }

  const { it, mutant } = animalTables;
  const { nft } = animalBoostables;
  const showFarm = selectedAnimalLvl === "farm";
  const visibleDetailView = !showFarm && detailView === "levels" ? "animals" : detailView;
  const tableData = showFarm ? animalsData : animalsAllLvlData;
  const tradeTaxMul = (100 - Number(dataSet?.options?.tradeTax || 0)) / 100;
  const coinRatio = Number(dataSet?.options?.coinsRatio || 1);

  const getAnimalIcon = (name) => ({ Chicken: imgchkn, Cow: imgcow, Sheep: imgsheep }[name] || imgna);
  const getItemIcon = (name) => it[name]?.img || (name === "Mix" ? imgmix : name === "Omnifeed" ? imgomni : imgna);

  const animalsView = Object.entries(tableData || {}).map(([animalName, animalRows]) => {
    const [prod1name, prod2name] = ANIMAL_PRODUCTS[animalName] || ["Product 1", "Product 2"];
    const totals = {
      prod1: 0, prod2: 0, foodCost: 0, marketFoodCost: 0,
      prod1Market: 0, prod2Market: 0, feed: {}, active: 0, ignored: 0,
    };

    const rows = Object.values(animalRows || {}).map((rawRow, rowIndex) => {
      const pettingCount = showFarm ? 0 : Math.max(0, Math.min(2, Number(selectedAnimalPettings) || 0));
      const cobj = pettingCount > 0 ? (rawRow?.pettingVariants?.[pettingCount] || rawRow) : rawRow;
      const xpprogress = Number((TryChecked ? (cobj.xpProgresstry ?? cobj.xpProgress) : cobj.xpProgress) || 0);
      const xptolvl = Number(cobj.xpToLvl || 0);
      const lvl = cobj.lvl > 0 && xpprogress === xptolvl ? cobj.lvl - 1 : Number(cobj.lvl || 0);
      const ignoreAnimal = !!dataSet?.options?.ignoreAniLvl
        && cobj.lvl > dataSet?.options?.animalLvl?.[animalName];
      const foodQty = Number(parseFloat(!TryChecked ? cobj.quantfood : cobj.quantfoodtry).toFixed(2)) || 0;
      const foodName = (!TryChecked ? cobj.food : cobj.foodtry) || "Unknown";
      const foodCycleCost = Number((!TryChecked ? cobj.costFood : cobj.costFoodtry) || 0) / coinRatio;
      const foodMarketCost = Number((!TryChecked ? cobj.costFoodp2p : cobj.costFoodp2ptry) || 0);
      const prod1 = Number(parseFloat(!TryChecked ? cobj.yield1 : cobj.yield1try).toFixed(2)) || 0;
      const prod2 = Number(parseFloat(!TryChecked ? cobj.yield2 : cobj.yield2try).toFixed(2)) || 0;
      const prod1Cost = Number((!TryChecked ? cobj.costyield1 : cobj.costyield1try) || 0) / coinRatio;
      const prod2Cost = Number((!TryChecked ? cobj.costyield2 : cobj.costyield2try) || 0) / coinRatio;
      const prod1Market = Number(it[prod1name]?.costp2pt || 0) * tradeTaxMul;
      const prod2Market = Number(it[prod2name]?.costp2pt || 0) * tradeTaxMul;
      const prod1BuyFood = Number((!TryChecked ? cobj.costyield1p2p : cobj.costyield1p2ptry) || 0);
      const prod2BuyFood = Number((!TryChecked ? cobj.costyield2p2p : cobj.costyield2p2ptry) || 0);
      const revenue = (prod1Market * prod1) + (prod2Market * prod2);
      const honeyTreatActive = TryChecked ? !!cobj.honeyTreatActiveTry : !!cobj.honeyTreatActive;
      const saltLickActive = TryChecked ? !!cobj.saltLickActiveTry : !!cobj.saltLickActive;

      let rewardImg = null;
      if (cobj.reward) {
        const rewardIcon = nft[cobj.reward]?.img || mutant[cobj.reward]?.img || imgna;
        rewardImg = <img src={rewardIcon} alt="" className="nftico" title={cobj.reward} />;
      }

      if (ignoreAnimal) {
        totals.ignored += 1;
      } else {
        totals.active += 1;
        totals.prod1 += prod1;
        totals.prod2 += prod2;
        totals.foodCost += foodCycleCost;
        totals.marketFoodCost += foodMarketCost;
        totals.prod1Market += prod1Market * prod1;
        totals.prod2Market += prod2Market * prod2;
        addFeed(totals.feed, foodName, foodQty);
      }

      return {
        key: `${animalName}-${cobj.id ?? rowIndex}`, lvl, rewardImg, ignoreAnimal,
        xpprogress, xptolvl, foodQty, foodName, foodIcon: getItemIcon(foodName),
        honeyTreatActive, saltLickActive,
        foodCycleCost, foodMarketCost, prod1, prod2, prod1Cost, prod2Cost,
        prod1Market, prod2Market, prod1BuyFood, prod2BuyFood, revenue,
        prod1Edge: prod1Cost > 0 ? prod1Market / prod1Cost : 0,
        prod2Edge: prod2Cost > 0 ? prod2Market / prod2Cost : 0,
      };
    });

    const prodRevenue = totals.prod1Market + totals.prod2Market;
    return {
      animalName,
      animalIcon: getAnimalIcon(animalName),
      prod1name, prod2name,
      prod1Icon: getItemIcon(prod1name),
      prod2Icon: getItemIcon(prod2name),
      totals, rows, prodRevenue,
      ownFoodProfit: prodRevenue - totals.foodCost,
      marketFoodProfit: prodRevenue - totals.marketFoodCost,
      levelRows: buildLevelRows(rows),
    };
  }).sort((a, b) => b.marketFoodProfit - a.marketFoodProfit || a.animalName.localeCompare(b.animalName));

  const openTooltip = (animal, row, product, e) => {
    const isFirst = product === animal.prod1name;
    handleTooltip(product, "animalcostu", createAnimalUnitCostContract({
      animal: animal.animalName,
      product,
      productImage: getItemIcon(product),
      displayedCost: isFirst ? row.prod1Cost : row.prod2Cost,
      yieldPerCycle: isFirst ? row.prod1 : row.prod2,
      foodQty: row.foodQty,
      foodName: row.foodName,
      foodImage: getItemIcon(row.foodName),
      foodCycleCost: row.foodCycleCost,
      foodCycleMarketCost: row.foodMarketCost,
      currentLvl: row.lvl,
      buyCropsCostU: isFirst ? row.prod1BuyFood : row.prod2BuyFood,
      marketCostU: isFirst ? row.prod1Market : row.prod2Market,
      tradeTax: dataSet?.options?.tradeTax || 0,
    }), e);
  };

  const selectedAnimal = animalsView.find((animal) => animal.animalName === selectedAnimalName) || animalsView[0];

  return (
    <main className={`animals-readable-page ${showFarm ? "is-farm-view" : "is-all-levels-view"}`}>
      {!showFarm ? (
        <nav className="animal-level-selector" aria-label="Select animal">
          {animalsView.map((animal) => {
            const selected = selectedAnimal?.animalName === animal.animalName;
            return (
              <button
                type="button"
                className={selected ? "is-selected" : ""}
                key={animal.animalName}
                onClick={() => setSelectedAnimalName(animal.animalName)}
                aria-pressed={selected}
              >
                <img src={animal.animalIcon} alt="" />
                <span>{animal.animalName}</span>
              </button>
            );
          })}
        </nav>
      ) : (
      <div className="animal-summary-grid">
        {animalsView.map((animal) => {
          const selected = selectedAnimal?.animalName === animal.animalName;
          const selectAnimal = () => setSelectedAnimalName(animal.animalName);
          return (
            <article
              className={`animal-summary-card ${selected ? "is-selected" : ""}`}
              key={animal.animalName}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`View ${animal.animalName} details`}
              onClick={selectAnimal}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectAnimal();
                }
              }}
            >
              <header className="animal-summary-head">
                <div className="animal-readable-identity">
                  <div className="animal-readable-avatar"><img src={animal.animalIcon} alt="" /></div>
                  <div><h2>{animal.animalName}</h2><p>{showFarm ? `${animal.totals.active} active${animal.totals.ignored ? ` · ${animal.totals.ignored} ignored` : ""}` : `${animal.rows.length} levels`}</p></div>
                </div>
                <div className="animal-summary-mobile-profits">
                  <span style={{ color: profitabilityColor(animal.prodRevenue, animal.totals.foodCost) }}>{imgprodit}{signed(animal.ownFoodProfit)}</span>
                  <span style={{ color: profitabilityColor(animal.prodRevenue, animal.totals.marketFoodCost) }}>{imgbuyit}{signed(animal.marketFoodProfit)}</span>
                </div>
                <strong className="animal-summary-value">{fmt(animal.prodRevenue)} {imgSFL}</strong>
              </header>

              <div className="animal-summary-flow">
                <div><small>FOOD</small><FeedList feed={animal.totals.feed} getItemIcon={getItemIcon} compact /></div>
                <span aria-hidden="true">→</span>
                <div><small>OUTPUT</small><div className="animal-readable-output-list"><ItemAmount value={animal.totals.prod1} icon={animal.prod1Icon} name={animal.prod1name} compact /><ItemAmount value={animal.totals.prod2} icon={animal.prod2Icon} name={animal.prod2name} compact /></div></div>
              </div>

              <div className="animal-summary-scenarios">
                <ScenarioRow label="Produce food" icon={imgprodit} cost={animal.totals.foodCost} profit={animal.ownFoodProfit} revenue={animal.prodRevenue} />
                <ScenarioRow label="Buy food" icon={imgbuyit} cost={animal.totals.marketFoodCost} profit={animal.marketFoodProfit} revenue={animal.prodRevenue} />
              </div>

            </article>
          );
        })}
      </div>
      )}

      {selectedAnimal && (
        <section className="animal-detail-panel">
          <header className="animal-detail-header">
            <div><img src={selectedAnimal.animalIcon} alt="" /><strong>{selectedAnimal.animalName}</strong><span>{showFarm ? "farm breakdown" : "level simulation"}</span></div>
            <div className="animal-readable-tabs" role="tablist" aria-label={`${selectedAnimal.animalName} details`}>
              {showFarm && <button type="button" className={visibleDetailView === "levels" ? "is-active" : ""} onClick={() => setDetailView("levels")}>Level profitability</button>}
              <button type="button" className={visibleDetailView === "animals" ? "is-active" : ""} onClick={() => setDetailView("animals")}>Individuals</button>
              <button type="button" className={visibleDetailView === "costs" ? "is-active" : ""} onClick={() => setDetailView("costs")}>Unit costs</button>
            </div>
          </header>

          {visibleDetailView === "levels" ? (
            <div className="animal-level-table">
              <div className="animal-level-table-head"><span>Level</span><span>Food</span><span>Output</span><span>Value</span><span>Produce food</span><span>Buy food</span></div>
              {selectedAnimal.levelRows.map((level) => (
                <div className="animal-level-row" key={level.lvl}>
                  <div className="animal-level-id animal-unit-level"><span><strong>Lv {level.lvl}</strong>{showFarm && <small>{level.count} animal{level.count === 1 ? "" : "s"}</small>}</span></div>
                  <div className="animal-level-cycle animal-individual-cycle">
                    <div className="animal-level-metric animal-level-food"><small>Food</small><strong><FeedList feed={level.feed} getItemIcon={getItemIcon} compact /></strong></div>
                    <span aria-hidden="true">→</span>
                    <div className="animal-level-metric animal-level-output"><small>Output</small><strong className="animal-cycle-products"><ItemAmount value={level.prod1} icon={selectedAnimal.prod1Icon} name={selectedAnimal.prod1name} compact /><i>+</i><ItemAmount value={level.prod2} icon={selectedAnimal.prod2Icon} name={selectedAnimal.prod2name} compact /></strong></div>
                  </div>
                  <strong className="animal-level-value animal-individual-value"><small>Value</small><span>{fmt(level.revenue, 3)} {imgSFL}</span></strong>
                  <ProfitCell label="Produce food" icon={imgprodit} cost={level.foodCost} profit={level.ownProfit} revenue={level.revenue} />
                  <ProfitCell label="Buy food" icon={imgbuyit} cost={level.marketFoodCost} profit={level.marketProfit} revenue={level.revenue} />
                </div>
              ))}
            </div>
          ) : visibleDetailView === "animals" ? (
            <div className="animal-individual-list">
              <div className="animal-individual-head"><span>Animal</span><span>Food → output</span><span>Value</span><span>Produce food</span><span>Buy food</span></div>
              {selectedAnimal.rows.map((row) => (
                <section className={`animal-individual-row ${row.ignoreAnimal ? "is-ignored" : ""}`} key={row.key}>
                  <div className="animal-unit-level"><span>{row.rewardImg}<strong>Lv {row.lvl}</strong></span>{PBar(row.xpprogress, 0, row.xptolvl, 0, 52)}</div>
                  <div className="animal-individual-cycle">
                    <div><small>Food</small><strong>{fmt(row.foodQty)} <img src={row.foodIcon} alt="" className="itico" title={row.foodName} />{row.honeyTreatActive && <img src={imghoneyTreat} alt="" className="itico" title="Honey Treat (-25% food)" />}{row.saltLickActive && <img src={imgsaltLick} alt="" className="itico" title="Salt Lick (+5% production)" />}</strong></div>
                    <span aria-hidden="true">→</span>
                    <div><small>Output</small><strong className="animal-cycle-products"><span>{fmt(row.prod1)} <img src={selectedAnimal.prod1Icon} alt="" className="itico" title={selectedAnimal.prod1name} /></span><i>+</i><span>{fmt(row.prod2)} <img src={selectedAnimal.prod2Icon} alt="" className="itico" title={selectedAnimal.prod2name} /></span></strong></div>
                  </div>
                  <strong className="animal-individual-value"><small>Value</small><span>{fmt(row.revenue, 3)} {imgSFL}</span></strong>
                  <ProfitCell label="Produce food" icon={imgprodit} cost={row.foodCycleCost} profit={row.revenue - row.foodCycleCost} revenue={row.revenue} />
                  <ProfitCell label="Buy food" icon={imgbuyit} cost={row.foodMarketCost} profit={row.revenue - row.foodMarketCost} revenue={row.revenue} />
                </section>
              ))}
            </div>
          ) : (
            <div className="animal-unit-list">
              <div className="animal-unit-head"><span>Animal</span><span>Food → output</span><span>Value</span><span>Product costs vs market</span></div>
              {selectedAnimal.rows.map((row) => (
                <section className={`animal-unit-row ${row.ignoreAnimal ? "is-ignored" : ""}`} key={row.key}>
                  <div className="animal-unit-level"><span>{row.rewardImg}<strong>Lv {row.lvl}</strong></span>{PBar(row.xpprogress, 0, row.xptolvl, 0, 52)}</div>
                  <div className="animal-individual-cycle">
                    <div><small>Food</small><strong>{fmt(row.foodQty)} <img src={row.foodIcon} alt="" className="itico" title={row.foodName} />{row.honeyTreatActive && <img src={imghoneyTreat} alt="" className="itico" title="Honey Treat (-25% food)" />}{row.saltLickActive && <img src={imgsaltLick} alt="" className="itico" title="Salt Lick (+5% production)" />}</strong></div>
                    <span aria-hidden="true">→</span>
                    <div><small>Output</small><strong className="animal-cycle-products"><span>{fmt(row.prod1)} <img src={selectedAnimal.prod1Icon} alt="" className="itico" title={selectedAnimal.prod1name} /></span><i>+</i><span>{fmt(row.prod2)} <img src={selectedAnimal.prod2Icon} alt="" className="itico" title={selectedAnimal.prod2name} /></span></strong></div>
                  </div>
                  <strong className="animal-individual-value"><small>Value</small><span>{fmt(row.revenue, 3)} {imgSFL}</span></strong>
                  <div className="animal-readable-unit-buttons">
                    <UnitCostButton name={selectedAnimal.prod1name} icon={selectedAnimal.prod1Icon} produceIcon={imgprodit} buyIcon={imgbuyit} cost={row.prod1Cost} buyCost={row.prod1BuyFood} market={row.prod1Market} onClick={(e) => openTooltip(selectedAnimal, row, selectedAnimal.prod1name, e)} />
                    <UnitCostButton name={selectedAnimal.prod2name} icon={selectedAnimal.prod2Icon} produceIcon={imgprodit} buyIcon={imgbuyit} cost={row.prod2Cost} buyCost={row.prod2BuyFood} market={row.prod2Market} onClick={(e) => openTooltip(selectedAnimal, row, selectedAnimal.prod2name, e)} />
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function addFeed(target, foodName, quantity) {
  const names = foodName === "Mix" ? ["Corn", "Wheat", "Barley"] : [foodName];
  names.forEach((name) => { target[name] = (target[name] || 0) + quantity; });
}

function buildLevelRows(rows) {
  const byLevel = {};
  rows.forEach((row) => {
    if (row.ignoreAnimal) return;
    if (!byLevel[row.lvl]) byLevel[row.lvl] = { lvl: row.lvl, count: 0, feed: {}, prod1: 0, prod2: 0, revenue: 0, foodCost: 0, marketFoodCost: 0 };
    const level = byLevel[row.lvl];
    level.count += 1;
    level.prod1 += row.prod1;
    level.prod2 += row.prod2;
    level.revenue += row.revenue;
    level.foodCost += row.foodCycleCost;
    level.marketFoodCost += row.foodMarketCost;
    addFeed(level.feed, row.foodName, row.foodQty);
  });
  return Object.values(byLevel).sort((a, b) => b.lvl - a.lvl).map((row) => ({
    ...row,
    ownProfit: row.revenue - row.foodCost,
    marketProfit: row.revenue - row.marketFoodCost,
  }));
}

function FeedList({ feed, getItemIcon, compact = false }) {
  const entries = Object.entries(feed || {});
  if (!entries.length) return <span className="animal-readable-empty">No food</span>;
  return <div className={`animal-readable-feed-list ${compact ? "is-compact" : ""}`}>{entries.map(([name, amount]) => <span key={name}><strong>{fmt(amount)}</strong><img src={getItemIcon(name)} alt="" title={name} /><em>{name}</em></span>)}</div>;
}

function ItemAmount({ value, icon, name, compact = false }) {
  return <span className={compact ? "is-compact" : ""}><strong>{fmt(value)}</strong><img src={icon} alt="" title={name} /><em>{name}</em></span>;
}

function ScenarioRow({ label, icon, cost, profit, revenue }) {
  const color = profitabilityColor(revenue, cost);
  return <div className="animal-scenario-row"><span>{icon}<strong>{label}</strong></span><small>Cost {fmt(cost)}</small><strong style={{ color }}>{signed(profit)}</strong><em style={{ color }}>{roi(revenue, cost)}</em></div>;
}

function ProfitCell({ cost, profit, revenue, label = "", icon = null }) {
  const color = profitabilityColor(revenue, cost);
  return <div className="animal-profit-cell" style={{ "--profit-color": color }}>{label && <small>{icon}{label}</small>}<span>cost {fmt(cost)}</span><strong>{signed(profit)}</strong><em>{roi(revenue, cost)}</em></div>;
}

function UnitCostButton({ name, icon, produceIcon, buyIcon, cost, buyCost, market, onClick }) {
  const scenarios = [
    { key: "produce", icon: produceIcon, cost },
    { key: "buy", icon: buyIcon, cost: buyCost },
  ];
  return (
    <button type="button" className="animal-unit-cost-card" onClick={onClick} aria-label={`${name} unit costs`}>
      <span className="animal-unit-cost-product"><img src={icon} alt="" className="itico" title={name} /><small>Market {frmtNb(market)}</small></span>
      {scenarios.map((scenario) => {
        const hasFreeUnitCost = Number(scenario.cost || 0) <= 0;
        const edge = hasFreeUnitCost ? Infinity : market / scenario.cost;
        const margin = hasFreeUnitCost ? null : (edge > 0 ? Math.ceil(edge * 100) - 100 : 0);
        const color = ColorValue(edge);
        const profitLabel = hasFreeUnitCost ? "∞" : `${margin >= 0 ? "+" : ""}${margin}%`;
        return <span className="animal-unit-cost-scenario" key={scenario.key}><span>{scenario.icon}<strong>{frmtNb(scenario.cost)} /u</strong></span><em style={{ color }}>{profitLabel}</em></span>;
      })}
    </button>
  );
}

function signed(value) {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : ""}${fmt(number)}`;
}

function roi(revenue, cost) {
  const costValue = Number(cost || 0);
  if (costValue <= 0) return "∞ ROI";
  const value = Math.ceil(((Number(revenue || 0) / costValue) - 1) * 100);
  return `${value > 0 ? "+" : ""}${value}%`;
}

function profitabilityColor(revenue, cost) {
  const costValue = Number(cost || 0);
  const ratio = costValue > 0 ? Number(revenue || 0) / costValue : Infinity;
  return ColorValue(ratio);
}
