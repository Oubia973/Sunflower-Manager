import React, { useState } from "react";
import { useAppCtx } from "../context/AppCtx";
import { frmtNb, ColorValue, PBar } from "../fct.js";
import { imgmix, imgomni } from "../constants/images.js";

const ANIMAL_PRODUCTS = {
  Chicken: ["Egg", "Feather"],
  Cow: ["Milk", "Leather"],
  Sheep: ["Wool", "Merino Wool"],
};

const fmt = (value, digits = 2) => Number(value || 0).toFixed(digits);

export default function AnimalsReadableTable() {
  const [expandedAnimals, setExpandedAnimals] = useState({});
  const [detailViews, setDetailViews] = useState({});
  const {
    data: { dataSet, dataSetFarm },
    ui: { selectedAnimalLvl, TryChecked },
    actions: { handleTooltip },
    img: { imgSFL, imgcow, imgsheep, imgchkn, imgna, imgprodit, imgbuyit },
  } = useAppCtx();

  const animalPageData = dataSetFarm?.animalData || {};
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

    const rows = Object.values(animalRows || {}).map((cobj, rowIndex) => {
      const xpprogress = Number(cobj.xpProgress || 0);
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
      const prod1BuyFood = prod1 > 0 ? foodMarketCost / prod1 : 0;
      const prod2BuyFood = prod2 > 0 ? foodMarketCost / prod2 : 0;
      const revenue = (prod1Market * prod1) + (prod2Market * prod2);

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
        foodCycleCost, foodMarketCost, prod1, prod2, prod1Cost, prod2Cost,
        prod1Market, prod2Market, prod1BuyFood, prod2BuyFood, revenue,
        prod1Edge: prod1Cost > 0 ? prod1Market / prod1Cost : 0,
        prod2Edge: prod2Cost > 0 ? prod2Market / prod2Cost : 0,
        prod1BuyFoodEdge: prod1BuyFood > 0 ? prod1Market / prod1BuyFood : 0,
        prod2BuyFoodEdge: prod2BuyFood > 0 ? prod2Market / prod2BuyFood : 0,
      };
    });

    const prodRevenue = totals.prod1Market + totals.prod2Market;
    const ownFoodProfit = prodRevenue - totals.foodCost;
    const marketFoodProfit = prodRevenue - totals.marketFoodCost;

    return {
      animalName,
      animalIcon: getAnimalIcon(animalName),
      prod1name, prod2name,
      prod1Icon: getItemIcon(prod1name),
      prod2Icon: getItemIcon(prod2name),
      totals, rows, prodRevenue, ownFoodProfit, marketFoodProfit,
      levelRows: buildLevelRows(rows),
    };
  }).sort((a, b) => b.marketFoodProfit - a.marketFoodProfit || a.animalName.localeCompare(b.animalName));

  const openTooltip = (animal, row, product, e) => {
    const isFirst = product === animal.prod1name;
    handleTooltip(product, "animalcostu", {
      animal: animal.animalName,
      product,
      displayedCost: isFirst ? row.prod1Cost : row.prod2Cost,
      yieldPerCycle: isFirst ? row.prod1 : row.prod2,
      foodQty: row.foodQty,
      foodName: row.foodName,
      foodCycleCost: row.foodCycleCost,
      foodCycleMarketCost: row.foodMarketCost,
      currentLvl: row.lvl,
      buyCropsCostU: isFirst ? row.prod1BuyFood : row.prod2BuyFood,
      marketCostU: isFirst ? row.prod1Market : row.prod2Market,
      tradeTax: dataSet?.options?.tradeTax || 0,
    }, e);
  };

  return (
    <main className="animals-readable-page">
      <header className="animals-readable-intro">
        <div>
          <span className="animals-readable-eyebrow">ANIMAL WORKSHOP</span>
          <h1>{showFarm ? "What your animals earn each cycle" : "Compare every animal level"}</h1>
          <p>{showFarm
            ? "Each species is calculated separately, with both food strategies side by side."
            : "These are simulations, not your current herd. Open an animal to compare levels."}</p>
        </div>
        <div className="animals-readable-context">
          <span className={TryChecked ? "is-try" : "is-live"}>{TryChecked ? "TRY SET" : "ACTIVE SET"}</span>
          <small>{showFarm ? "Your farm" : "All levels"}</small>
        </div>
      </header>

      <div className="animals-readable-list">
        {animalsView.map((animal) => {
          const expanded = !!expandedAnimals[animal.animalName];
          const detailView = detailViews[animal.animalName] || "levels";
          const preferredProfit = Math.max(animal.ownFoodProfit, animal.marketFoodProfit);
          const preferredFood = animal.ownFoodProfit >= animal.marketFoodProfit ? "Grow food" : "Buy food";

          return (
            <article className={`animal-readable-card ${expanded ? "is-expanded" : ""}`} key={animal.animalName}>
              <div className="animal-readable-card-top">
                <div className="animal-readable-identity">
                  <div className="animal-readable-avatar"><img src={animal.animalIcon} alt="" /></div>
                  <div>
                    <h2>{animal.animalName}</h2>
                    <p>{showFarm
                      ? `${animal.totals.active} included${animal.totals.ignored ? ` · ${animal.totals.ignored} ignored` : ""}`
                      : `${animal.rows.length} levels to compare`}</p>
                  </div>
                </div>
                {showFarm && (
                  <div className={`animal-readable-verdict ${profitTone(preferredProfit)}`}>
                    <span>{verdict(preferredProfit)}</span>
                    <strong>{signed(preferredProfit)} {imgSFL}</strong>
                    <small>best net result · {preferredFood}</small>
                  </div>
                )}
              </div>

              {showFarm ? (
                <div className="animal-readable-story">
                  <StoryStep label="Food per cycle" className="is-feed">
                    <FeedList feed={animal.totals.feed} getItemIcon={getItemIcon} />
                    <small>total for this species</small>
                  </StoryStep>
                  <StoryStep label="Output per cycle" className="is-output">
                    <div className="animal-readable-output-list">
                      <ItemAmount value={animal.totals.prod1} icon={animal.prod1Icon} name={animal.prod1name} />
                      <ItemAmount value={animal.totals.prod2} icon={animal.prod2Icon} name={animal.prod2name} />
                    </div>
                    <small>worth {fmt(animal.prodRevenue)} {imgSFL}</small>
                  </StoryStep>
                  <StoryStep label="Net after food" className="is-result">
                    <ProfitChoice label="Grow the food" icon={imgprodit} cost={animal.totals.foodCost} profit={animal.ownFoodProfit} best={preferredFood === "Grow food"} />
                    <ProfitChoice label="Buy the food" icon={imgbuyit} cost={animal.totals.marketFoodCost} profit={animal.marketFoodProfit} best={preferredFood === "Buy food"} />
                  </StoryStep>
                </div>
              ) : (
                <div className="animal-readable-simulator-prompt">
                  <span>Levels {animal.levelRows[0]?.lvl ?? "–"}–{animal.levelRows[animal.levelRows.length - 1]?.lvl ?? "–"}</span>
                  <p>Open the comparison to see food, output value and profit at each level.</p>
                </div>
              )}

              <button
                type="button"
                className="animal-readable-expand-button"
                onClick={() => setExpandedAnimals((previous) => ({ ...previous, [animal.animalName]: !expanded }))}
                aria-expanded={expanded}
              >
                <span>{expanded ? "Hide breakdown" : showFarm ? "See levels and calculations" : "Compare levels"}</span>
                <span aria-hidden="true">{expanded ? "↑" : "↓"}</span>
              </button>

              {expanded && (
                <div className="animal-readable-breakdown">
                  <div className="animal-readable-tabs" role="tablist" aria-label={`${animal.animalName} details`}>
                    <button type="button" className={detailView === "levels" ? "is-active" : ""} onClick={() => setDetailViews((p) => ({ ...p, [animal.animalName]: "levels" }))}>Easy level comparison</button>
                    <button type="button" className={detailView === "calculations" ? "is-active" : ""} onClick={() => setDetailViews((p) => ({ ...p, [animal.animalName]: "calculations" }))}>Unit calculations</button>
                  </div>

                  {detailView === "levels" ? (
                    <div className="animal-readable-level-grid">
                      {animal.levelRows.map((level) => (
                        <section className="animal-readable-level-card" key={level.lvl}>
                          <div className="animal-readable-level-head">
                            <div><span>LEVEL</span><strong>{level.lvl}</strong></div>
                            {showFarm && <em>{level.count} animal{level.count === 1 ? "" : "s"}</em>}
                          </div>
                          <div className="animal-readable-level-sentence">
                            <span>Eat</span><FeedList feed={level.feed} getItemIcon={getItemIcon} compact />
                            <b>→</b><span>products worth</span><strong>{fmt(level.revenue, 3)} {imgSFL}</strong>
                          </div>
                          <div className="animal-readable-level-results">
                            <ProfitLine label="Grow food" icon={imgprodit} value={level.ownProfit} />
                            <ProfitLine label="Buy food" icon={imgbuyit} value={level.marketProfit} />
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="animal-readable-calculations">
                      <p className="animal-readable-hint">Select a product cost to open the full calculation.</p>
                      {animal.rows.map((row) => (
                        <section className={`animal-readable-cycle-row ${row.ignoreAnimal ? "is-ignored" : ""}`} key={row.key}>
                          <div className="animal-readable-cycle-level">
                            <span>{row.rewardImg}<strong>Lv {row.lvl}</strong></span>
                            {PBar(row.xpprogress, 0, row.xptolvl, 0, 74)}
                          </div>
                          <div className="animal-readable-cycle-facts">
                            <span title="Food per cycle"><small>Food</small><strong>{fmt(row.foodQty)} <img src={row.foodIcon} alt="" className="itico" title={row.foodName} /></strong></span>
                            <span title="Output per cycle"><small>Output</small><strong>{fmt(row.prod1)} <img src={animal.prod1Icon} alt="" className="itico" title={animal.prod1name} /> · {fmt(row.prod2)} <img src={animal.prod2Icon} alt="" className="itico" title={animal.prod2name} /></strong></span>
                          </div>
                          <div className="animal-readable-unit-buttons">
                            <UnitCostButton name={animal.prod1name} icon={animal.prod1Icon} cost={row.prod1Cost} market={row.prod1Market} edge={row.prod1Edge} onClick={(e) => openTooltip(animal, row, animal.prod1name, e)} />
                            <UnitCostButton name={animal.prod2name} icon={animal.prod2Icon} cost={row.prod2Cost} market={row.prod2Market} edge={row.prod2Edge} onClick={(e) => openTooltip(animal, row, animal.prod2name, e)} />
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
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
    if (!byLevel[row.lvl]) byLevel[row.lvl] = { lvl: row.lvl, count: 0, feed: {}, revenue: 0, foodCost: 0, marketFoodCost: 0 };
    const level = byLevel[row.lvl];
    level.count += 1;
    level.revenue += row.revenue;
    level.foodCost += row.foodCycleCost;
    level.marketFoodCost += row.foodMarketCost;
    addFeed(level.feed, row.foodName, row.foodQty);
  });
  return Object.values(byLevel).sort((a, b) => a.lvl - b.lvl).map((row) => ({
    ...row,
    ownProfit: row.revenue - row.foodCost,
    marketProfit: row.revenue - row.marketFoodCost,
  }));
}

function StoryStep({ label, className, children }) {
  return <section className={`animal-readable-story-step ${className}`}><header><span>{label}</span></header><div className="animal-readable-story-content">{children}</div></section>;
}

function FeedList({ feed, getItemIcon, compact = false }) {
  const entries = Object.entries(feed || {});
  if (!entries.length) return <span className="animal-readable-empty">No food</span>;
  return <div className={`animal-readable-feed-list ${compact ? "is-compact" : ""}`}>{entries.map(([name, amount]) => <span key={name}><strong>{fmt(amount)}</strong><img src={getItemIcon(name)} alt="" title={name} /><em>{name}</em></span>)}</div>;
}

function ItemAmount({ value, icon, name }) {
  return <span><strong>{fmt(value)}</strong><img src={icon} alt="" title={name} /><em>{name}</em></span>;
}

function ProfitChoice({ label, icon, cost, profit, best }) {
  return <div className={`animal-readable-profit-choice ${best ? "is-best" : ""}`}><div><span>{label}</span>{best && <em>BEST</em>}</div><small>food costs {fmt(cost)} {icon}</small><strong className={profitTone(profit)}>{signed(profit)}</strong></div>;
}

function ProfitLine({ label, icon, value }) {
  return <div><span>{icon}{label}</span><strong className={profitTone(value)}>{signed(value)}</strong></div>;
}

function UnitCostButton({ name, icon, cost, market, edge, onClick }) {
  const margin = edge > 0 ? Math.ceil(edge * 100) - 100 : 0;
  return <button type="button" onClick={onClick}><span><img src={icon} alt="" className="itico" />{name}</span><strong>{frmtNb(cost)} / unit</strong><small style={{ color: ColorValue(edge) }}>{margin >= 0 ? "+" : ""}{margin}% vs market ({frmtNb(market)})</small></button>;
}

function signed(value) {
  const number = Number(value || 0);
  return `${number > 0 ? "+" : ""}${fmt(number)}`;
}

function profitTone(value) {
  if (Number(value) > 0.005) return "is-positive";
  if (Number(value) < -0.005) return "is-negative";
  return "is-neutral";
}

function verdict(value) {
  if (Number(value) > 0.005) return "Profitable";
  if (Number(value) < -0.005) return "Losing value";
  return "Break-even";
}
