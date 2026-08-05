import React, { useEffect, useRef, useState } from "react";
import { useAppCtx } from "../context/AppCtx";
import { formatdate, frmtNb, buildSeriesMeta, ColorValue, convTime, convtimenbr, timeToDays } from '../fct.js';
import DList from "../dlist.jsx";
import { getChumQuantity, normalizeChumName } from "../fishChumQuantities";
import { imgwinterPath, imgspringPath, imgsummerPath, imgautumnPath, imgfullmoon, imgwinter, imgspring, imgsummer, imgautumn } from "../constants/images.js";

export default function FishTable() {
  const stickyBarRef = useRef(null);
  const fishHeaderRowRef = useRef(null);
  const [fishHeaderStickyTop, setFishHeaderStickyTop] = useState(0);
  const [fishHeaderRowHeight, setFishHeaderRowHeight] = useState(0);
  const [xpSflCostMode, setXpSflCostMode] = useState("prod"); // "prod" or "market"
  const displayQuantity = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return "";
    return num;
  };
  const displayFishValue = (value, digits = null) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "";
    if (fishXpQuantMode === "quant" && num === 0) return "";
    return digits == null ? num : num.toFixed(digits);
  };
  const displayFishTime = (value) => {
    if (!value) return "";
    if (fishXpQuantMode === "quant" && (value === "00:00:00" || value === "00:00:00:00")) return "";
    return value;
  };
  const {
    data: {
      dataSet,
      dataSetFarm,
      farmData,
      priceData,
    },
    ui: {
      selectedCurr,
      selectedQuantFish,
      selectedQuantFishXp,
      selectedQuantCrusta,
      xListeColFish,
      xListeColCrusta,
      TryChecked,
      selectedSeason,
      fishView,
      fishMode,
    },
    img: {
      imgSFL,
      imgExchng,
      imgna,
      imgbuyit,
      imgprodit
    },
    actions: {
      handleUIChange,
      handleOptionChange,
      handleTooltip,
    },
  } = useAppCtx();
  const fishTables = {
    ...(dataSetFarm?.fishData?.itables || {}),
    ...(dataSetFarm?.itables || {}),
  };
  const { tool = {}, it = {} } = fishTables;
  function key(name) {
    if (name === "isactive") return TryChecked ? "tryit" : "isactive";
    return TryChecked ? name + "try" : name;
  }
  const fishingDetails = dataSetFarm?.Fish || {};
  // Aging Shed values (calculated in backend, sent via fishingDetails)
  const agingSlots = Number(fishingDetails?.agingSlots || 1);
  const agingTimeMultiplier = Number(fishingDetails?.agingTimeMultiplier || 1);
  const countChumCost = !!dataSet?.options?.chumFishCost;
  const fishQuantModeRaw = String(selectedQuantFish || "").trim().toLowerCase();
  const fishQuantMode = fishQuantModeRaw === "aged" || fishQuantModeRaw === "primeaged" ? fishQuantModeRaw : "base";
  const fishQuantInventoryKey = fishQuantMode === "aged"
    ? "Aged"
    : fishQuantMode === "primeaged"
      ? "PrimeAged"
      : "instock";
  const fishIconStyle = fishMode === "aging"
    ? (
      fishQuantMode === "primeaged"
        ? { filter: "sepia(90%) saturate(220%) hue-rotate(8deg) brightness(0.92) contrast(1.02)" }
        : { filter: "grayscale(100%) brightness(1)" }
    )
    : {};
  const fishXpQuantModeRaw = String(selectedQuantFishXp || "").trim().toLowerCase();
  const fishXpQuantMode = fishXpQuantModeRaw === "unit" ? "unit" : "quant";
  const reelCasts = fishingDetails?.casts ?? 0;
  const reelCastMax = TryChecked ? fishingDetails?.fishcastmaxtry ?? 0 : fishingDetails?.fishcastmax ?? 0;
  const costCast = TryChecked ? fishingDetails?.fishcastcosttry ?? 0 : fishingDetails?.fishcastcost ?? 0;
  const primeAgedChance = Number(
    TryChecked
      ? fishingDetails?.primeAgedChancetry ?? fishingDetails?.primeAgedChance ?? 10
      : fishingDetails?.primeAgedChance ?? 10
  );
  const agingOutputMultiplier = Number(
    TryChecked
      ? fishingDetails?.agingOutputMultipliertry ?? fishingDetails?.agingOutputMultiplier ?? 1
      : fishingDetails?.agingOutputMultiplier ?? 1
  );
  const ottyBonusEvery = Number(
    TryChecked
      ? fishingDetails?.ottyBonusEverytry ?? fishingDetails?.ottyBonusEvery ?? 0
      : fishingDetails?.ottyBonusEvery ?? 0
  );
  const coinsRatio = Number(dataSet?.options?.coinsRatio || 1);
  const rod = tool?.["Rod"] || {};
  const woodMarket = Number(it?.["Wood"]?.costp2pt || 0);
  const stoneMarket = Number(it?.["Stone"]?.costp2pt || 0);
  const costCastM = ((Number(rod?.[key("sfl")] || 0) / coinsRatio)
    + (Number(rod?.Wood || 0) * woodMarket)
    + (Number(rod?.Stone || 0) * stoneMarket));
  const reelCost = (costCast * reelCasts) / coinsRatio;
  const reelCostM = (costCastM * reelCasts);
  const reelCostMax = (costCast * reelCastMax) / coinsRatio;
  const reelCostMaxM = (costCastM * reelCastMax);
  useEffect(() => {
    if (fishView !== "fish") return;
    const updateFishHeaderTop = () => {
      setFishHeaderStickyTop(stickyBarRef.current?.offsetHeight || 0);
      setFishHeaderRowHeight(fishHeaderRowRef.current?.offsetHeight || 0);
    };
    const raf = requestAnimationFrame(updateFishHeaderTop);
    window.addEventListener("resize", updateFishHeaderTop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateFishHeaderTop);
    };
  }, [fishView, selectedSeason, selectedQuantFish, xListeColFish, reelCasts, reelCastMax]);
  if (fishTables?.fish && fishTables?.crustacean && fishTables?.it && fishTables?.bounty && fishTables?.petit && fishTables?.pfood) {
    if (fishView === "fish") {
      const { fish } = fishTables;
      var totXPfsh = 0;
      var totCaught = 0;
      var totCost = 0;
      var totCostM = 0;
      // XP/SFL total cost (for aging mode, tracks salt cost)
      var totXpSflCost = 0;
      // Aging mode totals
      var totSalt = 0;
      var totSaltCost = 0;
      var totSaltBought = 0;
      var totSaltTime = 0;
      // Salt pricing for aging columns
      const saltProdCost = Number(it?.["Salt"]?.cost || 0) / dataSet.options.coinsRatio;
      const saltMarketPrice = Number(it?.["Salt"]?.costp2pt || 0);
      const inventoryMap = farmData?.inventory || {};
      const fishNames = Object.keys(fish);
      const sortedInventoryItems = fishNames.map(item => {
        const quantity = Number(fish[item]?.instock ?? inventoryMap[item] ?? 0);
        return [item, quantity];
      });
      const isFishInSelectedSeason = (fishItem) => {
        if (selectedSeason === "all") return true;
        const seasons = String(fishItem?.weather || "").split("*").map((part) => String(part).toLowerCase());
        return seasons.includes(selectedSeason);
      };
      const visibleFishItems = sortedInventoryItems.filter(([itemName]) => {
        const fishItem = fish[itemName];
        return fishItem && fishItem.cat !== "Bait" && isFishInSelectedSeason(fishItem);
      });
      const fishCategorySeriesMeta = buildSeriesMeta(
        visibleFishItems,
        ([itemName]) => fish[itemName]?.cat || ""
      );
      let visibleFishIndex = -1;
      const earthwormbait = <i><img src={fish["Earthworm"].img} alt={''} className="itico" title="Earthworm" /></i>
      const grubbait = <i><img src={fish["Grub"].img} alt={''} className="itico" title="Grub" /></i>
      const redwigglerbait = <i><img src={fish["Red Wiggler"].img} alt={''} className="itico" title="Red Wiggler" /></i>
      const earthwormquant = fish["Earthworm"].quant;
      const grubquant = fish["Grub"].quant;
      const redwigglerquant = fish["Red Wiggler"].quant;
      const imgfullmoonIcon = <img src={imgfullmoon} alt={''} className="seasonico" title="Full Moon" />;
      const inventoryItems = sortedInventoryItems.map(([item, quantity], index) => {
        const cobj = fish[item];
        const ico = cobj ? cobj.img : '';
        const icat = cobj ? cobj.cat : '';
        const ibait = cobj ? cobj.bait : '';
        const ilocat = cobj ? cobj.locations : '';
        const xBaits = ibait.split("/");
        const icaught = cobj ? cobj.caught : '';
        // const previousQuantity = Number(cobj?.prevstock || 0);
        // const pquant = previousQuantity;
        const itemQuantity = Number(
          fishMode === "aging" && fishQuantMode !== "base"
            ? (cobj?.[fishQuantInventoryKey] ?? inventoryMap[`${fishQuantMode === "aged" ? "Aged" : "Prime Aged"} ${item}`] ?? 0)
            : (cobj?.instock ?? quantity ?? 0)
        );
        // const difference = itemQuantity - pquant;
        // const absDifference = Math.abs(difference);
        // const isNegativeDifference = difference < 0;
        const ichum = cobj ? cobj.chum : '';
        const ichumimgs = cobj ? cobj.chumimgs : '';
        const xChums = ichum.split("*");
        const xChumsImg = ichumimgs.split("*");
        const iperiodimgs = cobj ? cobj.weather : '';
        const xPeriodImg = iperiodimgs.split("*");
        const isOnSeason = isFishInSelectedSeason(cobj);
        for (let i = 0; i < xPeriodImg.length; i++) {
          if (xPeriodImg[i] === "Winter") {
            xPeriodImg[i] = imgwinter;
          } else if (xPeriodImg[i] === "Summer") {
            xPeriodImg[i] = imgsummer;
          } else if (xPeriodImg[i] === "Autumn") {
            xPeriodImg[i] = imgautumn;
          } else if (xPeriodImg[i] === "Spring") {
            xPeriodImg[i] = imgspring;
          } else if (xPeriodImg[i] === "FullMoon") {
            xPeriodImg[i] = imgfullmoonIcon;
          }
        }
        if (selectedSeason !== "all" && !isOnSeason) {
          return null;
        }
        const iperiod = xPeriodImg;
        const fishMyield = Number(TryChecked ? (cobj.myieldtry ?? cobj.myield ?? 1) : (cobj.myield ?? 1)) || 1;
        const fishSalt = Number(cobj?.[key("salt")] ?? cobj?.salt ?? 0);
        const chumName = normalizeChumName(cobj?.[key("cheaperchum")] ?? cobj?.cheaperchum ?? "");
        const chumQty = getChumQuantity(chumName);
        const chumCostCoinsKey = Number(cobj?.[key("cheaperchumCost")] ?? cobj?.cheaperchumCost ?? 0);
        const chumCostMarketKey = Number(cobj?.[key("cheaperchumCostp2pt")] ?? cobj?.cheaperchumCostp2pt ?? 0);
        const chumUnitCostRaw = chumCostCoinsKey / dataSet.options.coinsRatio;
        const chumUnitCostRawM = chumCostMarketKey;
        const chumCostRaw = chumUnitCostRaw * chumQty;
        const chumCostRawM = chumUnitCostRawM * chumQty;
        let icost = cobj ? (Number(!TryChecked ? cobj.cost : cobj.costtry) / dataSet.options.coinsRatio) : 0;
        let icostM = cobj ? Number(!TryChecked ? (cobj.costp2pt ?? 0) : (cobj.costp2pttry ?? cobj.costp2pt ?? 0)) : 0;
        if (countChumCost && fishMyield > 0) {
          icost += (chumCostRaw / fishMyield);
          icostM += (chumCostRawM / fishMyield);
        }
        // Salt cost for aging mode (used only for XP/SFL, not for Cost column)
        let agingSaltCost = 0;
        let agingSaltCostM = 0;
        if (fishMode === "aging" && cobj?.salt != null) {
          agingSaltCost = fishSalt * saltProdCost / fishMyield;
          agingSaltCostM = fishSalt * saltMarketPrice;
        }
        icost = Number.isFinite(icost) ? Math.max(0, icost) : 0;
        const fishUnitCostRaw = icost;
        const fishUnitMarketRaw = icostM;
        const iQuant = itemQuantity;
        const valueQuant = fishXpQuantMode === "unit" ? 1 : iQuant;
        const xpKey = fishMode === "aging"
          ? (fishQuantMode === "primeaged" ? "primeagexp" : "agexp")
          : "xp";
        const xpUnit = cobj ? Number(!TryChecked ? (cobj[xpKey] || 0) : (cobj[xpKey + "try"] || 0)) : 0;
        const ixp = xpUnit * valueQuant;
        const mapRare = cobj?.mapDropFish ? fish[cobj.mapDropFish] : null;
        const mapTooltip = cobj?.mapDropFish
          ? `Drop fragment for ${cobj.mapDropFish} (${cobj.mapDropChance || "?"}%)`
          : "";
        totXPfsh += isNaN(ixp) ? 0 : Number(ixp);
        totCaught += icaught;
        const iprct = cobj ? parseFloat(cobj.prct).toFixed(1) : '';
        let convPricep = 0;
        let convPricepM = 0;
        if (selectedCurr === "SFL") {
          convPricep = icost;
          convPricepM = icostM;
        }
        if (selectedCurr === "MATIC") {
          convPricep = (icost * priceData[2]) / priceData[1];
          convPricepM = (icostM * priceData[2]) / priceData[1];
        }
        if (selectedCurr === "USDC") {
          convPricep = icost * priceData[2];
          convPricepM = icostM * priceData[2];
        }
        icost = isNaN(convPricep) ? 0 : Number(convPricep);
        icostM = isNaN(convPricepM) ? 0 : Number(convPricepM);
        totCost += icost * valueQuant;
        totCostM += icostM * valueQuant;
        // Accumulate aging mode totals
        if (fishMode === "aging") {
          totSalt += cobj?.salt != null ? parseFloat(fishSalt * valueQuant) : 0;
          totSaltCost += cobj?.salt != null ? parseFloat(fishSalt * valueQuant * saltProdCost) : 0;
          totSaltBought += cobj?.salt != null ? parseFloat(fishSalt * valueQuant * saltMarketPrice) : 0;
          totSaltTime += cobj?.agetime != null ? convtimenbr(cobj.agetime) * agingTimeMultiplier * (fishXpQuantMode === "unit" ? 1 : (valueQuant > 0 ? Math.max(1, Math.ceil(valueQuant / agingSlots)) : 0)) : 0;
        }
        const xCost = icost * valueQuant;
        const xCostM = icostM * valueQuant;
        const xpSflQuant = valueQuant > 0 ? valueQuant : 1;
        // XP/SFL cost = fish cost (always) + salt cost (only in aging mode, depending on DList xpSflCostMode)
        let xCostForXpSfl = icost * xpSflQuant;
        if (fishMode === "aging" && cobj?.salt != null) {
          const saltCostUnit = xpSflCostMode === "market"
            ? fishSalt * saltMarketPrice
            : fishSalt * saltProdCost;
          xCostForXpSfl += saltCostUnit * xpSflQuant;
        }
        // Accumulate XP/SFL cost for totals
        totXpSflCost += xCostForXpSfl;
        const tooltipQty = valueQuant;
        const fishCostTooltip = {
          fishName: item,
          qty: tooltipQty,
          fishUnitCost: fishUnitCostRaw,
          fishUnitMarket: fishUnitMarketRaw,
          fishMyield: fishMyield,
          includeChum: countChumCost,
          chumName,
          chumQty,
          chumUnitCost: chumUnitCostRaw,
          chumUnitMarket: chumUnitCostRawM,
        };
        // For XP/SFL ratio, use unit values (XP per unit cost)
        const ixpUnit = xpUnit;
        const xCostForXpSflUnit = xCostForXpSfl / xpSflQuant;
        const ixpsfl = xCostForXpSflUnit === 0 ? "" : ixpUnit / xCostForXpSflUnit;
        const CellXPSflStyle = {};
        CellXPSflStyle.color = ColorValue(Number(ixpsfl) || 0, 0, 50000);
        xListeColFish[1][1] = 0;
        // Calculate aging time per row (respecting slots and quantity)
        const rowAgingTime = fishMode === "aging" && cobj?.agetime != null
          ? (fishXpQuantMode === "unit"
              ? convtimenbr(cobj.agetime) * agingTimeMultiplier
              : (valueQuant > 0
                  ? convtimenbr(cobj.agetime) * agingTimeMultiplier * Math.max(1, Math.ceil(valueQuant / agingSlots))
                  : 0))
          : 0;
        // In aging mode, only show Basic fish, Advanced fish, and Expert fish categories
        if (fishMode === "aging" && !["Basic fish", "Advanced fish", "Expert fish"].includes(icat)) {
          return null;
        }
        if (icat !== "Bait") {
          visibleFishIndex += 1;
          const categorySeries = fishCategorySeriesMeta[visibleFishIndex] || { isStart: true, isEnd: true };
          const isCategoryStart = categorySeries.isStart;
          const isCategoryEnd = categorySeries.isEnd;
          return (
            <tr key={index}>
              {xListeColFish[0][1] === 1 ? <td className="tdcenter fish-category-cell">
                {isCategoryStart ? <span className="fish-category-name">{icat}</span> : null}
                {!isCategoryEnd ? <span className={`fish-category-connector${isCategoryStart ? " is-start" : ""}`} aria-hidden="true"></span> : null}
                {isCategoryEnd && !isCategoryStart ? <span className="fish-category-endcap" aria-hidden="true"></span> : null}
              </td> : null}
              {xListeColFish[1][1] === 1 ? <td className="tdcenter">{ilocat}</td> : null}
              <td id="iccolumn"><i><img src={ico} alt={''} className="itico" style={fishIconStyle} /></i></td>
              {xListeColFish[2][1] === 1 ? <td className="tditem">{item}</td> : null}
              {xListeColFish[3][1] === 1 && fishMode === "base" ? <td className="tdcenter">
                {xBaits.map((value, index) => (
                  value !== "" ? (<span key={index}>
                    <i><img src={fish[value].img} alt={''} className="itico" title={value} /></i>
                  </span>) : ("")
                ))}</td> : null}
              {xListeColFish[4][1] === 1 ? <td className="tdcenter">{displayQuantity(iQuant)}</td> : null}
              {xListeColFish[5][1] === 1 && fishMode === "base" ? <td className="tdcenter">{icaught}</td> : null}
              {xListeColFish[6][1] === 1 && fishMode === "base" ? <td className="tdcenter">
                {mapRare?.img ? (
                  <span title={mapTooltip} style={{ display: "inline-flex", alignItems: "center", gap: "4px", opacity: 0.9 }}>
                    <img src={mapRare.img} alt="" className="itico" />
                    <span style={{ fontSize: "10px" }}>{cobj?.mapDropChance}%</span>
                  </span>
                ) : null}
              </td> : null}
              {xListeColFish[7][1] === 1 && fishMode === "base" ? <td className="tdcenter">
                {xChums.map((value, index) => {
                  if (value !== "") { return (<span key={index}><i><img src={xChumsImg[index]} alt={''} className="itico" title={value} /></i></span>) }
                  return null;
                })}</td> : null}
              {xListeColFish[8][1] === 1 ? <td className="tdcenter">
                {iperiod.map((value, index) => {
                  if (value !== "") { return (<span key={index}><i>{iperiod[index]}</i></span>) }
                  return null;
                })}</td> : null}
              {xListeColFish[9][1] === 1 && fishMode === "base" ? <td className="tdcenter">{displayFishValue(iprct, 1)}</td> : null}
              {xListeColFish[3][1] === 1 && fishMode === "aging" ? <td className="tdcenter">{displayFishValue(cobj?.salt != null ? fishSalt * valueQuant : 0, 0)}</td> : null}
              {xListeColFish[4][1] === 1 && fishMode === "aging" ? <td className="tdcenter">{displayFishValue(cobj?.salt != null ? fishSalt * valueQuant * saltProdCost : 0, 3)}</td> : null}
              {xListeColFish[5][1] === 1 && fishMode === "aging" ? <td className="tdcenter">{displayFishValue(cobj?.salt != null ? fishSalt * valueQuant * saltMarketPrice : 0, 3)}</td> : null}
              {xListeColFish[6][1] === 1 && fishMode === "aging" ? <td className="tdcenter">{displayFishTime(cobj?.agetime != null ? timeToDays(convTime(rowAgingTime)) : "")}</td> : null}
              {xListeColFish[10][1] === 1 ? <td className="tdcenter">{displayFishValue(ixp, 1)}</td> : null}
              {xListeColFish[11][1] === 1 ? <td className="tdcenter tooltipcell" onClick={(e) => handleTooltip(item, "fishcost", fishCostTooltip, e)}>{displayFishValue(xCost, 3)}</td> : null}
              {xListeColFish[12][1] === 1 ? <td className="tdcenter tooltipcell" onClick={(e) => handleTooltip(item, "fishcost", fishCostTooltip, e)}>{displayFishValue(xCostM, 3)}</td> : null}
              {xListeColFish[13][1] === 1 ? <td className="tdcenter" style={CellXPSflStyle}>{displayFishValue(ixpsfl, 1)}</td> : null}
            </tr>
          );
        }
      });
      const fishStatusBadge = (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            margin: "0",
            padding: "4px 8px",
            border: "1px solid rgb(90, 90, 90)",
            borderRadius: "6px",
            background: "rgba(0, 0, 0, 0.28)",
            width: "fit-content",
            maxWidth: "100%",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>Reel: {reelCasts}/{reelCastMax}</span>
          <span
            className="tooltipcell"
            onClick={(e) => handleTooltip("Rod", "crustaceancost", reelCasts, e)}
            style={{ fontSize: "12px", whiteSpace: "nowrap", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "2px" }}
          >
            Cost: {frmtNb(reelCost)}/{frmtNb(reelCostMax)}{imgSFL}
          </span>
          <span
            className="tooltipcell"
            onClick={(e) => handleTooltip("Rod", "crustaceancost", reelCastMax, e)}
            style={{ fontSize: "12px", whiteSpace: "nowrap", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "2px" }}
          >
            {frmtNb(reelCostM)}/{frmtNb(reelCostMaxM)}{imgbuyit}
          </span>
          <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>
            {earthwormquant}{earthwormbait} {grubquant}{grubbait} {redwigglerquant}{redwigglerbait}
          </span>
          {fishMode === "aging" ? (
            <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
              Prime: {frmtNb(primeAgedChance)}%
              {agingOutputMultiplier > 1 ? ` · Avg output: x${frmtNb(agingOutputMultiplier)}` : ""}
            </span>
          ) : null}
          {ottyBonusEvery > 0 ? (
            <span style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
              Otty: +1 random fish / {ottyBonusEvery} reels
            </span>
          ) : null}
        </div>
      );
      const stickyFishBadgeBar = (
        <div
          ref={stickyBarRef}
          style={{
            position: "sticky",
            top: "0px",
            left: "0px",
            zIndex: 7,
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
            padding: "2px 0 4px 0",
            background: "rgb(18, 8, 2)",
          }}
        >
          {fishStatusBadge}
        </div>
      );
      const tableContent = (
        <>
          {stickyFishBadgeBar}
          <table
            className="table fish-table"
            style={{
              "--fish-head-top": `${fishHeaderStickyTop}px`,
              "--fish-head-row-h": `${fishHeaderRowHeight}px`,
            }}
          >
            <thead>
              <tr ref={fishHeaderRowRef}>
                {xListeColFish[0][1] === 1 ? <th className="thcenter" >Category</th> : null}
                {xListeColFish[1][1] === 1 ? <th className="thcenter" >Location</th> : null}
                <th className="th-icon">   </th>
                {xListeColFish[2][1] === 1 ? <th className="thcenter">
                  <DList
                    name="fishMode"
                    title="Fish"
                    options={[
                      { value: "base", label: "Base" },
                      { value: "aging", label: "Aging" },
                    ]}
                    value={fishMode}
                    onChange={handleUIChange}
                    height={28}
                  />
                </th> : null}
                {xListeColFish[3][1] === 1 && fishMode === "base" ? <th className="thcenter" >Bait</th> : null}
                {xListeColFish[4][1] === 1 ? <th className="thcenter">
                  {fishMode === "aging" ? (
                    <DList
                      name="selectedQuantFish"
                      title="Quantity"
                      options={[
                        { value: "base", label: "Base" },
                        { value: "aged", label: "Aged" },
                        { value: "primeaged", label: "Prime Aged" },
                      ]}
                      value={fishQuantMode}
                      onChange={handleUIChange}
                      height={28}
                    />
                  ) : (
                    "Quantity"
                  )}
                </th> : null}
                {xListeColFish[5][1] === 1 && fishMode === "base" ? <th className="thcenter" >Caught</th> : null}
                {xListeColFish[6][1] === 1 && fishMode === "base" ? <th className="thcenter" >Map</th> : null}
                {xListeColFish[7][1] === 1 && fishMode === "base" ? <th className="thcenter" >Chum</th> : null}
                {xListeColFish[8][1] === 1 ? <th className="thcenter" >
                  <DList
                    name="selectedSeason"
                    title="Season"
                    options={[
                      { value: "all", label: "All" },
                      { value: "spring", label: <img src={imgspringPath} alt={''} className="seasonico" title="Spring" style={{ width: '18px', height: '18px' }} /> },
                      { value: "summer", label: <img src={imgsummerPath} alt={''} className="seasonico" title="Summer" style={{ width: '18px', height: '18px' }} /> },
                      { value: "autumn", label: <img src={imgautumnPath} alt={''} className="seasonico" title="Autumn" style={{ width: '18px', height: '18px' }} /> },
                      { value: "winter", label: <img src={imgwinterPath} alt={''} className="seasonico" title="Winter" style={{ width: '18px', height: '18px' }} /> },
                    ]}
                    value={selectedSeason}
                    onChange={handleUIChange}
                    height={28}
                  />
                </th> : null}
                {xListeColFish[9][1] === 1 && fishMode === "base" ? <th className="thcenter" > % </th> : null}
                {xListeColFish[3][1] === 1 && fishMode === "aging" ? <th className="thcenter" >Salt <img src={it["Salt"]?.img} alt="Salt" className="itico" /></th> : null}
                {xListeColFish[4][1] === 1 && fishMode === "aging" ? <th className="thcenter" >Cost {imgprodit}</th> : null}
                {xListeColFish[5][1] === 1 && fishMode === "aging" ? <th className="thcenter" >Bought {imgbuyit}</th> : null}
                {xListeColFish[6][1] === 1 && fishMode === "aging" ? <th className="thcenter" >Time</th> : null}
                {xListeColFish[10][1] === 1 ? <th className="thcenter">
                  <DList
                    name="selectedQuantFishXp"
                    title="XP"
                    options={[
                      { value: "unit", label: "/ Unit" },
                      { value: "quant", label: "x Quantity" },
                    ]}
                    value={fishXpQuantMode}
                    onChange={handleUIChange}
                    height={28}
                  />
                </th> : null}
                {xListeColFish[11][1] === 1 ? <th className="thcenter" >Cost {imgprodit}</th> : null}
                {xListeColFish[12][1] === 1 ? <th className="thcenter" >Bought {imgbuyit}</th> : null}
                {xListeColFish[13][1] === 1 ? <th className="thcenter" >XP/{imgSFL}</th> : null}
              </tr>
              <tr key="total">
                {xListeColFish[0][1] === 1 ? <td className="tdcenter">Total</td> : null}
                {xListeColFish[1][1] === 1 ? <td className="tdcenter"></td> : null}
                <td></td>
                {xListeColFish[2][1] === 1 ? <td className="tdcenter"></td> : null}
                {xListeColFish[3][1] === 1 && fishMode === "base" ? <td className="tdcenter"></td> : null}
                {xListeColFish[4][1] === 1 ? <td className="tdcenter"></td> : null}
                {xListeColFish[5][1] === 1 && fishMode === "base" ? <td className="tdcenter">{totCaught}</td> : null}
                {xListeColFish[6][1] === 1 && fishMode === "base" ? <td className="tdcenter"></td> : null}
                {xListeColFish[7][1] === 1 && fishMode === "base" ? <td className="tdcenter">
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                    <input
                      type="checkbox"
                      checked={countChumCost}
                      name="chumFishCost"
                      onChange={handleOptionChange}
                    />
                    count
                  </label>
                </td> : null}
                {xListeColFish[8][1] === 1 ? <td className="tdcenter"></td> : null}
                {xListeColFish[9][1] === 1 && fishMode === "base" ? <td className="tdcenter"></td> : null}
                {xListeColFish[3][1] === 1 && fishMode === "aging" ? <td className="tdcenter">{selectedQuantFishXp !== "unit" ? displayFishValue(totSalt, 0) : ""}</td> : null}
                {xListeColFish[4][1] === 1 && fishMode === "aging" ? <td className="tdcenter">{selectedQuantFishXp !== "unit" ? displayFishValue(totSaltCost, 1) : ""}</td> : null}
                {xListeColFish[5][1] === 1 && fishMode === "aging" ? <td className="tdcenter">{selectedQuantFishXp !== "unit" ? displayFishValue(totSaltBought, 1) : ""}</td> : null}
              {xListeColFish[6][1] === 1 && fishMode === "aging" ? <td className="tdcenter">{selectedQuantFishXp !== "unit" ? displayFishTime(timeToDays(convTime(totSaltTime))) : ""}</td> : null}
                {xListeColFish[10][1] === 1 ? <td className="tdcenter">{selectedQuantFishXp !== "unit" ? displayFishValue(totXPfsh, 1) : ""}</td> : null}
                {xListeColFish[11][1] === 1 ? <td className="tdcenter">{selectedQuantFishXp !== "unit" ? displayFishValue(totCost, 1) : ""}</td> : null}
                {xListeColFish[12][1] === 1 ? <td className="tdcenter">{selectedQuantFishXp !== "unit" ? displayFishValue(totCostM, 1) : ""}</td> : null}
                {xListeColFish[13][1] === 1 ? (
                  <td className="tdcenter">
                    {fishMode === "aging" ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <img src={it["Salt"]?.img} alt="Salt" className="itico" title="Salt cost" />
                        <DList
                          name="xpSflCostMode"
                          options={[
                            { value: "prod", icon: imgprodit, label: "" },
                            { value: "market", icon: imgbuyit, label: "" },
                          ]}
                          value={xpSflCostMode}
                          onChange={(e) => setXpSflCostMode(e.target.value)}
                          height={28}
                        />
                      </span>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {inventoryItems}
            </tbody>
          </table>
        </>
      );
      return (tableContent);
    }
    if (fishView === "crustacean") {
      const { it, bounty, petit, fish, crustacean, pfood } = fishTables;
      let totXPfsh = 0;
      let totCaught = 0;
      let totCost = 0;
      let totCostMarket = 0;
      let totCostChum = 0;
      const inventoryMap = farmData?.inventory || {};
      const fishNames = Object.keys(crustacean);
      const sortedInventoryItems = fishNames.map(item => {
        const quantity = Number(crustacean[item]?.instock ?? inventoryMap[item] ?? 0);
        return [item, quantity];
      });
      const crustaToolSeriesMeta = buildSeriesMeta(
        sortedInventoryItems,
        ([itemName]) => crustacean[itemName]?.tool || ""
      );
      const inventoryItems = sortedInventoryItems.map(([item, quantity], index) => {
        const cobj = crustacean[item];
        const ico = cobj ? cobj.img : '';
        const itool = cobj ? cobj.tool : '';
        const toolSeries = crustaToolSeriesMeta[index] || { isStart: true, isEnd: true };
        const isToolStart = toolSeries.isStart;
        const isToolEnd = toolSeries.isEnd;
        const icaught = cobj ? cobj.caught : '';
        const ichum = cobj ? cobj.chum : '';
        const itime = cobj?.rdyat ? formatdate(cobj.rdyat) : '';
        const igrow = cobj ? cobj.grow : '';
        // const previousQuantity = Number(cobj?.prevstock || 0);
        // const pquant = previousQuantity || 0;
        const itemQuantity = Number(cobj?.instock ?? quantity ?? 0);
        // const difference = itemQuantity - pquant;
        // const absDifference = Math.abs(difference);
        // const isNegativeDifference = difference < 0;
        var icost = cobj ? ((!TryChecked ? cobj.cost : cobj.costtry) / dataSet.options.coinsRatio) : '';
        var icostm = cobj ? (!TryChecked ? (cobj.costp2pt || 0) : (cobj.costp2pttry ?? cobj.costp2pt ?? 0)) : 0;
        const iQuant = selectedQuantCrusta === "unit" ? 1 : (itemQuantity || 0);
        totCaught += icaught;
        let convPricep = 0;
        if (selectedCurr === "SFL") {
          convPricep = icost;
        }
        if (selectedCurr === "MATIC") {
          convPricep = (icost * priceData[2]) / priceData[1];
        }
        if (selectedCurr === "USDC") {
          convPricep = icost * priceData[2];
        }
        icost = isNaN(convPricep) ? 0 : Number(convPricep);
        totCost += icost * iQuant;
        totCostMarket += icostm * iQuant;
        const xCost = icost * iQuant;
        const xCostM = icostm * iQuant;
        /* let xCostChum = 0;
        Object.entries(ichum).map(([critem, quant]) => {
          const citem = it[critem] || petit[critem] || pfood[critem];
          let chumCost = 0;
          if(citem) {chumCost = TryChecked ? citem.costtry : citem.cost}
          if (!critem) return null;
          xCostChum = quant * chumCost * (iQuant || 0);
        });
        totCostChum += xCostChum * (iQuant || 0); */
        return (
          <tr key={index}>
            {xListeColCrusta[0][1] === 1 ? <td className="tdcenter crusta-tool-cell">
              {isToolStart ? <span className="crusta-tool-name">{itool}</span> : null}
              {!isToolEnd ? <span className={`crusta-tool-connector${isToolStart ? " is-start" : ""}`} aria-hidden="true"></span> : null}
              {isToolEnd && !isToolStart ? <span className="crusta-tool-endcap" aria-hidden="true"></span> : null}
            </td> : null}
            <td id="iccolumn"><i><img src={ico} alt={''} className="itico" /></i></td>
            {xListeColCrusta[1][1] === 1 ? <td className="tditem">{item}</td> : null}
            {xListeColCrusta[2][1] === 1 ? <td className="tdcenter">{itemQuantity || ''}</td> : null}
            {xListeColCrusta[3][1] === 1 ? <td className="tdcenter">{icaught || ''}</td> : null}
            {xListeColCrusta[4][1] === 1 ? <td className="tdcenter tooltipcell">
              {Object.entries(ichum).map(([critem, quant]) => {
                //const citem = crustacean[critem];
                if (!critem) return null;
                const itemImg = it[critem]?.img || petit[critem]?.img || bounty[critem]?.img || pfood[critem]?.img || imgna;
                if (critem !== "") {
                  return (<span key={critem}>{quant * iQuant}
                    <i><img src={itemImg} alt={''} className="itico" title={critem} onClick={(e) => handleTooltip(critem, "costitem", quant * iQuant, e)} /></i></span>)
                }
                return null;
              })}</td> : null}
            {xListeColCrusta[5][1] === 1 ? <td className="tdcenter tooltipcell" onClick={(e) => handleTooltip(item, "crustaceancost", iQuant, e)}>
              {xCost > 0 ? parseFloat(xCost).toFixed(3) : ''}</td> : null}
            {xListeColCrusta[6][1] === 1 ? <td className="tdcenter">{xCostM > 0 ? parseFloat(xCostM).toFixed(3) : ''}</td> : null}
            {xListeColCrusta[7][1] === 1 ? <td className="tdcenter">{igrow}</td> : null}
            {xListeColCrusta[8][1] === 1 ? <td className="tdcenter">{displayFishTime(itime)}</td> : null}
          </tr>
        );
      });
      const tableContent = (
        <>
          <table className="table crustacean-table">
            <thead>
              <tr>
                {xListeColCrusta[0][1] === 1 ? <th className="thcenter" >Tool</th> : null}
                <th className="th-icon">   </th>
                {xListeColCrusta[1][1] === 1 ? <th className="thcenter" >Crustacean</th> : null}
                {xListeColCrusta[2][1] === 1 ? <th className="thcenter" >Stock</th> : null}
                {xListeColCrusta[3][1] === 1 ? <th className="thcenter" >Caught</th> : null}
                {xListeColCrusta[4][1] === 1 ? <th className="thcenter" >Chum</th> : null}
                {xListeColCrusta[5][1] === 1 ? <th className="thcenter" >
                  <DList
                    name="selectedQuantCrusta"
                    title="Cost"
                    options={[
                      { value: "unit", label: "/ Unit" },
                      { value: "quant", label: "x Quantity" },
                    ]}
                    value={selectedQuantCrusta}
                    onChange={handleUIChange}
                    height={28}
                  />
                </th> : null}
                {xListeColCrusta[6][1] === 1 ? <th className="thcenter" >Prod {imgbuyit}</th> : null}
                {xListeColCrusta[7][1] === 1 ? <th className="thcenter" >Grow</th> : null}
                {xListeColCrusta[8][1] === 1 ? <th className="thcenter" >Ready</th> : null}
              </tr>
              <tr key="total">
                {xListeColCrusta[0][1] === 1 ? <td className="tdcenter">Total</td> : null}
                <td></td>
                {xListeColCrusta[1][1] === 1 ? <td className="tditem"></td> : null}
                {xListeColCrusta[2][1] === 1 ? <td className="tdcenter"></td> : null}
                {xListeColCrusta[3][1] === 1 ? <td className="tdcenter">{totCaught}</td> : null}
                {xListeColCrusta[4][1] === 1 ? <td className="tdcenter"></td> : null}
                {xListeColCrusta[5][1] === 1 ? <td className="tdcenter">{(selectedQuantCrusta !== "unit") ? parseFloat(totCost).toFixed(1) : ""}</td> : null}
                {xListeColCrusta[6][1] === 1 ? <td className="tdcenter">{(selectedQuantCrusta !== "unit") ? parseFloat(totCostMarket).toFixed(1) : ""}</td> : null}
                {xListeColCrusta[7][1] === 1 ? <td className="tdcenter"></td> : null}
                {xListeColCrusta[8][1] === 1 ? <td className="tdcenter"></td> : null}
              </tr>
            </thead>
            <tbody>
              {inventoryItems}
            </tbody>
          </table>
        </>
      );
      return (tableContent);
    }
  }
}




