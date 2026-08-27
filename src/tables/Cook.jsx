import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppCtx } from "../context/AppCtx";
import { FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel, CircularProgress } from '@mui/material';
import { frmtNb, convtimenbr, convTime, ColorValue, Timer, filterTryit, timeToDays, flattenCompoit, buildSeriesMeta } from '../fct.js';
import DList from "../dlist.jsx";
import { fetchJson } from "../services/apiClient.js";
import { selectCurrentProjection } from "../utils/farmState.js";
import { selectCookViewTables } from "../utils/cookViewTables.js";
import { buildBoostTooltipContract } from "../tooltip/boostTooltipContract.js";

let xdxp = 0;
var dProd = [];
var dProdtry = [];
const preAscensionMaxLvl = 150;
const ascensionMaxLvl = 50;
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
});
const formatCompactNumber = (value) => compactNumberFormatter.format(Number(value) || 0);
const formatCookComponentQty = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num === 0) return "";
    const rounded = Math.round(num * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
};

export default function CookTable() {
    const {
        data: {
            dataSet,
            dataSetFarm,
            bumpkinData,
            priceData,
        },
        config: { API_URL },
        ui: {
            inputFromLvl,
            inputToLvl,
            inputFromAscension,
            inputToAscension,
            fromtolvltime,
            fromtolvlxp,
            xHrvst,
            xHrvsttry,
            selectedCurr,
            selectedQuantCook,
            selectedCostCook,
            selectedQuantityCook,
            cookSortBy,
            cookSortDir,
            cookCategories,
            xListeColCook,
            TryChecked,
        },
        actions: {
            handleUIChange,
            setUIField,
            handleOptionChange,
            handleTooltip,
        },
        img: {
            imgSFL,
            imgExchng,
            imgna,
            imgbuyit,
            imgprodit
        }
    } = useAppCtx();
    const cookPageData = selectCurrentProjection(dataSetFarm, "cookData") || {};
    const latestCookPageData = dataSetFarm?.cookData || {};
    const boostTooltipIndex = cookPageData?.tooltipData?.boostIndex || {};
    const levelReqTimerRef = useRef(null);
    const levelReqSeqRef = useRef(0);
    const stickyBarRef = useRef(null);
    const cookHeaderRowRef = useRef(null);
    const [isLevelRangeLoading, setIsLevelRangeLoading] = useState(false);
    const [cookHeaderStickyTop, setCookHeaderStickyTop] = useState(0);
    const [cookHeaderRowHeight, setCookHeaderRowHeight] = useState(0);
    const [includeFoodXp, setIncludeFoodXp] = useState(true);
    const [includeOwnedAgedXp, setIncludeOwnedAgedXp] = useState(true);
    const [includeFishXp, setIncludeFishXp] = useState(true);
    const [fishXpMode, setFishXpMode] = useState("aged");
    const [bumpkinProjection, setBumpkinProjection] = useState(null);
    const [xpOptionsExpanded, setXpOptionsExpanded] = useState(() => (
        typeof window === "undefined" || window.innerWidth > 560
    ));
    const [xpProjectionExpanded, setXpProjectionExpanded] = useState(() => (
        typeof window === "undefined" || window.innerWidth > 560
    ));
    useEffect(() => {
        return () => {
            if (levelReqTimerRef.current) {
                clearTimeout(levelReqTimerRef.current);
            }
            levelReqSeqRef.current += 1;
        };
    }, []);
    useEffect(() => {
        const updateCookHeaderTop = () => {
            setCookHeaderStickyTop(stickyBarRef.current?.offsetHeight || 0);
            setCookHeaderRowHeight(cookHeaderRowRef.current?.offsetHeight || 0);
        };
        const raf = requestAnimationFrame(updateCookHeaderTop);
        window.addEventListener("resize", updateCookHeaderTop);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", updateCookHeaderTop);
        };
    }, [selectedQuantityCook, selectedQuantCook, isLevelRangeLoading, fromtolvltime, fromtolvlxp, xListeColCook, xpOptionsExpanded, xpProjectionExpanded]);
    useEffect(() => {
        const shouldFetchLevelRange = selectedQuantityCook !== "farm";
        if (!shouldFetchLevelRange) {
            if (levelReqTimerRef.current) {
                clearTimeout(levelReqTimerRef.current);
                levelReqTimerRef.current = null;
            }
            setIsLevelRangeLoading(false);
            return;
        }
        scheduleLevelRangeFetch(
            inputFromAscension,
            inputFromLvl,
            inputToAscension,
            inputToLvl,
        );
    }, [
        inputFromAscension,
        inputFromLvl,
        inputToAscension,
        inputToLvl,
        selectedQuantCook,
        selectedQuantityCook,
        dataSetFarm?.itables?.food,
        dataSetFarm?.itables?.pfood,
        cookPageData?.itables?.food,
        cookPageData?.itables?.pfood,
    ]);
    function scheduleLevelRangeFetch(
        fromAscensionRaw,
        xfromRaw,
        toAscensionRaw,
        xtoRaw,
    ) {
        if (levelReqTimerRef.current) {
            clearTimeout(levelReqTimerRef.current);
            levelReqTimerRef.current = null;
        }
        const fromAscension = Number.parseInt(String(fromAscensionRaw), 10);
        const xfrom = Number.parseInt(String(xfromRaw), 10);
        const toAscension = Number.parseInt(String(toAscensionRaw), 10);
        const xto = Number.parseInt(String(xtoRaw), 10);
        const fromMax = fromAscension > 0 ? ascensionMaxLvl : preAscensionMaxLvl;
        const toMax = toAscension > 0 ? ascensionMaxLvl : preAscensionMaxLvl;
        const isOrdered = (
            toAscension > fromAscension ||
            (toAscension === fromAscension && xto >= xfrom)
        );
        const isValid = (
            Number.isFinite(fromAscension) &&
            Number.isFinite(toAscension) &&
            fromAscension >= 0 &&
            toAscension >= 0 &&
            Number.isFinite(xfrom) &&
            Number.isFinite(xto) &&
            xfrom > 0 &&
            xto > 0 &&
            xfrom <= fromMax &&
            xto <= toMax &&
            isOrdered
        );
        if (!isValid) {
            setUIField("fromtolvltime", 0);
            setUIField("fromtolvlxp", 0);
            setIsLevelRangeLoading(false);
            levelReqSeqRef.current += 1;
            return;
        }
        const reqId = ++levelReqSeqRef.current;
        setIsLevelRangeLoading(true);
        levelReqTimerRef.current = setTimeout(async () => {
            try {
                const responseDataLVL = await fetchJson(API_URL, "/getfromtolvl", {
                    method: 'GET',
                    headers: {
                        frmid: dataSet.farmId,
                        fromascension: fromAscension,
                        from: xfrom,
                        toascension: toAscension,
                        to: xto,
                        xdxp: xdxp,
                    },
                });
                if (reqId !== levelReqSeqRef.current) return;
                setUIField("fromtolvltime", responseDataLVL.time);
                setUIField("fromtolvlxp", responseDataLVL.xp);
            } catch {
                if (reqId !== levelReqSeqRef.current) return;
                setUIField("fromtolvltime", 0);
                setUIField("fromtolvlxp", 0);
            } finally {
                if (reqId === levelReqSeqRef.current) {
                    setIsLevelRangeLoading(false);
                }
            }
        }, 750);
    }
    const topLevelCookTables = dataSetFarm?.itables || {};
    const fallbackCookTables = cookPageData?.itables || {};
    const cookTables = useMemo(
        () => selectCookViewTables(topLevelCookTables, fallbackCookTables),
        [topLevelCookTables, fallbackCookTables],
    );
    const projectionFood = cookTables?.food || {};
    const projectionPreparedFood = cookTables?.pfood || {};
    const projectionInventory = cookPageData?.inventory || {};
    const fishXpSummary = cookPageData?.meta?.fishXpSummary || latestCookPageData?.meta?.fishXpSummary || {};
    const keepQuantity = Math.max(0, Number(dataSet?.options?.inputKeep || 0));
    const foodStockXp = [...Object.entries(projectionFood), ...Object.entries(projectionPreparedFood)]
        .reduce((total, [itemName, item]) => {
            const quantity = Math.max(0, Number(projectionInventory[itemName] ?? item?.instock ?? 0) - keepQuantity);
            const xp = Number(TryChecked ? (item?.xptry ?? item?.xp) : item?.xp);
            return total + quantity * (Number.isFinite(xp) ? xp : 0);
        }, 0);
    const ownedAgedQuantity = Number(fishXpSummary?.agedQuantity || 0);
    const ownedPrimeAgedQuantity = Number(fishXpSummary?.primeAgedQuantity || 0);
    const ownedAgedFishQuantity = ownedAgedQuantity + ownedPrimeAgedQuantity;
    const rawFishQuantity = Number(fishXpSummary?.rawQuantity || 0);
    const ownedAgedFishXp = Number(TryChecked ? fishXpSummary?.ownedAgedXpTry : fishXpSummary?.ownedAgedXp) || 0;
    const rawDirectFishXp = Number(TryChecked ? fishXpSummary?.rawXpTry : fishXpSummary?.rawXp) || 0;
    const rawAgedFishXp = Number(TryChecked ? fishXpSummary?.rawAsAgedXpTry : fishXpSummary?.rawAsAgedXp) || 0;
    const rawFishXp = fishXpMode === "aged" ? rawAgedFishXp : rawDirectFishXp;
    const selectedProjectionXp =
        (includeFoodXp ? foodStockXp : 0) +
        (includeOwnedAgedXp ? ownedAgedFishXp : 0) +
        (includeFishXp ? rawFishXp : 0);
    useEffect(() => {
        const experience = Number(bumpkinData?.[0]?.xp);
        const ascensionLevel = Number(bumpkinData?.[0]?.ascensionLevel || 0);
        if (!Number.isFinite(experience)) {
            setBumpkinProjection(null);
            return undefined;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => {
            fetchJson(API_URL, "/getbumpkinprojection", {
                method: "POST",
                body: { experience, addedXp: selectedProjectionXp, ascensionLevel },
                signal: controller.signal,
            }).then(setBumpkinProjection).catch((error) => {
                if (error?.code !== "REQUEST_CANCELLED") setBumpkinProjection(null);
            });
        }, 750);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [API_URL, bumpkinData, selectedProjectionXp]);
    if (cookTables?.it && cookTables?.food && cookTables?.pfood && cookTables?.fish && cookTables?.bounty && cookTables?.crustacean) {
        const { it, food, fish, bounty, pfood, crustacean } = cookTables;
        //const inventoryEntries = selectedQuantityCook === "farm" || "daily" || "dailymax" ? Object.entries(farmData.inventory) : Object.entries(farmData.inventory);
        const inventoryMap = cookPageData?.inventory || {};
        const foodNames = Object.keys(food);
        const pfoodNames = Object.keys(pfood);
        const cookNames = [...foodNames, ...pfoodNames];
        const Compo = [];
        Compo["total"] = [];
        const sortedCompo = [];
        const baseInventoryItems = cookNames.map(item => {
            const cobj = food[item] || pfood[item];
            const cobjCompo = flattenCompoit(TryChecked ? (cobj?.compoittry || cobj?.compoit) : cobj?.compoit);
            const quantityInventory = Number(inventoryMap[item] || 0);
            const quantity = Number((food[item] || pfood[item])?.instock ?? quantityInventory ?? 0);
            for (let compofood in cobjCompo) {
                const compo = compofood;
                const quant = cobjCompo[compofood];
                if (compo !== "Oil" && (it[compo] || fish[compo] || bounty[compo] || pfood[compo])) {
                    Compo[item] = Compo[item] || [];
                    Compo["total"][compo] = 0;
                    Compo[item][compo] = Compo[item][compo] || 0;
                    Compo[item][compo] += Number(quant);
                }
            }
            return [item, quantity];
        });
        const sortedInventoryItems = (!cookSortBy || cookSortBy === "none")
            ? baseInventoryItems
            : [...baseInventoryItems].sort((a, b) => {
                const [itemA, qtyA] = a;
                const [itemB, qtyB] = b;
                const valueA = getCookSortValue(cookSortBy, itemA, qtyA, food, pfood, TryChecked, dataSet.options.coinsRatio);
                const valueB = getCookSortValue(cookSortBy, itemB, qtyB, food, pfood, TryChecked, dataSet.options.coinsRatio);
                const direction = cookSortDir === "desc" ? -1 : 1;
                if (typeof valueA === "string" || typeof valueB === "string") {
                    const cmp = String(valueA ?? "").localeCompare(String(valueB ?? ""));
                    return cmp * direction;
                }
                const aNum = Number.isFinite(Number(valueA)) ? Number(valueA) : -Infinity;
                const bNum = Number.isFinite(Number(valueB)) ? Number(valueB) : -Infinity;
                if (aNum === bNum) return itemA.localeCompare(itemB);
                return (aNum - bNum) * direction;
            });
        const selectedCookCategories = new Set(cookCategories || ["base", "honey", "cheese", "fish", "cake"]);
        const cheeseRegex = /(cheese|cheddar|chedder|curd)/i;
        const honeyRegex = /honey/i;
        const filteredInventoryItems = sortedInventoryItems.filter(([item]) => {
            if (selectedCookCategories.size === 0) return false;
            const cobj = food[item] || pfood[item];
            const rawCompo = cobj?.compoit || {};
            const directKeys = Object.keys(rawCompo || {});
            const hasHoney = directKeys.some((name) => honeyRegex.test(String(name)));
            const hasCheese = String(item) === "Cheese" || hasIngredientMatching(rawCompo, (name) => cheeseRegex.test(String(name)));
            const hasFish = hasIngredientFromTable(rawCompo, fish) || hasIngredientFromTable(rawCompo, pfood);
            const isCake = String(item).toLowerCase().includes("cake");
            const isBase = !hasHoney && !hasCheese && !hasFish && !isCake;
            return (
                (selectedCookCategories.has("base") && isBase) ||
                (selectedCookCategories.has("honey") && hasHoney) ||
                (selectedCookCategories.has("cheese") && hasCheese) ||
                (selectedCookCategories.has("fish") && hasFish) ||
                (selectedCookCategories.has("cake") && isCake)
            );
        });
        Object.keys(it).forEach(item => {
            if (Object.hasOwn(Compo["total"], item)) {
                sortedCompo.push(item);
            }
        });
        Object.keys(fish).forEach(item => {
            if (Object.hasOwn(Compo["total"], item)) {
                sortedCompo.push(item);
            }
        });
        Object.keys(bounty).forEach(item => {
            if (Object.hasOwn(Compo["total"], item)) {
                sortedCompo.push(item);
            }
        });
        Object.keys(pfood).forEach(item => {
            if (Object.hasOwn(Compo["total"], item)) {
                sortedCompo.push(item);
            }
        });
        //console.log(sortedCompo);
        const farmTime = dataSet.options.inputFarmTime / 24;
        var totXP = 0;
        var totOil = 0;
        var totCost = 0;
        var totCostp2p = 0;
        var BldTime = [];
        var totTime = 0;
        const buildingSeriesMeta = buildSeriesMeta(
            filteredInventoryItems,
            ([itemName]) => (food[itemName] || pfood[itemName])?.bld || "Fish Market"
        );
        const inventoryItems = filteredInventoryItems.map(([item, quantity], index) => {
            const cobj = food[item] || pfood[item];
            const cobjCompo = flattenCompoit(TryChecked ? (cobj?.compoittry || cobj?.compoit) : cobj?.compoit);
            const ico = cobj ? cobj.img : '';
            const ibld = cobj ? (cobj.bld || "Fish Market") : '';
            const buildingSeries = buildingSeriesMeta[index] || { isStart: true, isEnd: true };
            const isBuildingStart = buildingSeries.isStart;
            const isBuildingEnd = buildingSeries.isEnd;
            var time = cobj ? !TryChecked ? cobj.time : cobj.timetry : '';
            const timenbr = convtimenbr(time);
            var timecomp = cobj ? (!TryChecked ? cobj.timecrp : cobj.timecrptry) || '' : '';
            //if (timecomp === '') {console.log (item + ": error timecomp" )}
            const timecrpnbr = convtimenbr(timecomp);
            const icookit = Number(cobj?.cookit) || 0;
            const iquantd = Math.ceil(farmTime / timenbr) !== Infinity ? Math.ceil(farmTime / timenbr) : 0;
            let prodValues = [];
            for (let compofood in cobjCompo) {
                const compo = compofood;
                const quant = cobjCompo[compofood];
                if (it[compo]) {
                    const bhrvstItem = !TryChecked ? xHrvst[compo] : xHrvsttry[compo];
                    dProd[compo] = it[compo].farmit ? bhrvstItem * it[compo].harvest : 0;
                    dProdtry[compo] = it[compo].farmit ? bhrvstItem * it[compo].harvesttry : 0;
                    const itdprod = dProd[compo] ? dProd[compo] : 0;
                    const itdprodtry = dProdtry[compo] ? dProdtry[compo] : 0;
                    const dCook = Math.floor(!TryChecked ? itdprod / quant : itdprodtry / quant);
                    prodValues.push(dCook);
                }
            }
            //const prodValues = selectedQuantityCook === "dailymax" ? iquantd : selectedQuantityCook === "daily" ? [dprod1, dprod2, dprod3, dprod4, dprod5].filter(value => value > 0) : 0;
            var xquantd = selectedQuantityCook === "dailymax" ? iquantd : selectedQuantityCook === "daily" ? Math.min(...prodValues) !== Infinity ? Math.min(...prodValues) : 0 : 0;
            xquantd = selectedQuantityCook === "daily" ? xquantd > iquantd ? iquantd : xquantd : xquantd;
            //!TryChecked ? food[item].dprod = xquantd : food[item].dprodtry = xquantd;
            const iKeep = selectedQuantCook !== "unit" ? dataSet.options.inputKeep : 0;
            const iQuant = selectedQuantityCook === "farm" ? (quantity - iKeep > 0 ? quantity - iKeep : 0) : xquantd;
            const cookitValue = Number(cobj?.cookit) || 0;
            const xpBase = Number(cobj ? (!TryChecked ? cobj.xp : cobj.xptry) : 0) || 0;
            const ixp = selectedQuantCook === "unit" ? xpBase : xpBase * iQuant;
            const ixph = Number(cobj ? (!TryChecked ? cobj.xph : cobj.xphtry) : 0) || 0;
            const xpsflBase = Number(cobj ? (!TryChecked ? cobj.xpsfl : cobj.xpsfltry) : 0) || 0;
            const ixpsfl = xpsflBase * dataSet.options.coinsRatio;
            totXP += (selectedQuantityCook === "daily" || selectedQuantityCook === "dailymax" ? isNaN(ixp) ? 0 : Number(ixp) * cookitValue : isNaN(ixp) ? 0 : Number(ixp));
            if (cookitValue === 1) {
                if (!BldTime[ibld]) { BldTime[ibld] = 0 }
                BldTime[ibld] += xquantd * timenbr;
            }
            const ixphcomp = cobj ? timecrpnbr > 0 ? parseFloat(ixp / (timecrpnbr * 24)).toFixed(1) : 0 : 0;
            const oilUnitBase = Number(cobj ? (!TryChecked ? cobj.oil : cobj.oiltry) : 0) || 0;
            const oilQty = selectedQuantCook === "unit" ? oilUnitBase : oilUnitBase * iQuant;
            var icost = cobj ? selectedQuantCook === "unit" ? ((!TryChecked ? cobj.cost : cobj.costtry) / dataSet.options.coinsRatio) : ((!TryChecked ? cobj.cost : cobj.costtry) / dataSet.options.coinsRatio) * iQuant : 0;
            const getMarketUnitWithFallback = (name) => {
                const src = it[name] || fish[name] || bounty[name] || crustacean[name] || pfood[name] || food[name] || cookTables?.tool?.[name] || cookTables?.petit?.[name];
                if (!src) { return 0; }
                const market = Number(!TryChecked ? (src.costp2pt || 0) : (src.costp2pttry ?? src.costp2pt ?? 0));
                const prod = (Number(!TryChecked ? src.cost : src.costtry) || 0) / dataSet.options.coinsRatio;
                return market > 0 ? market : prod;
            };
            const traderUnitFromCompo = cobjCompo
                ? Object.entries(cobjCompo).reduce((sum, [name, quant]) => sum + (Number(quant || 0) * getMarketUnitWithFallback(name)), 0)
                : 0;
            const traderUnit = cobj
                ? ((Number(!TryChecked ? (cobj.costp2pt || 0) : (cobj.costp2pttry ?? cobj.costp2pt ?? 0)) > 0
                    ? Number(!TryChecked ? (cobj.costp2pt || 0) : (cobj.costp2pttry ?? cobj.costp2pt ?? 0))
                    : (traderUnitFromCompo > 0
                        ? traderUnitFromCompo
                        : (Number(!TryChecked ? cobj.cost : cobj.costtry) || 0) / dataSet.options.coinsRatio)))
                : 0;
            var icostp2p = cobj ? selectedQuantCook === "unit" ?
                selectedCostCook === "shop" ? (cobj.costshop / dataSet.options.coinsRatio) : selectedCostCook === "trader" ? traderUnit : selectedCostCook === "nifty" ? cobj.costp2pn : selectedCostCook === "opensea" ? cobj.costp2po : 0
                : selectedCostCook === "shop" ? (cobj.costshop / dataSet.options.coinsRatio) * iQuant : selectedCostCook === "trader" ? traderUnit * iQuant : selectedCostCook === "nifty" ? cobj.costp2pn * iQuant : selectedCostCook === "opensea" ? cobj.costp2po * iQuant : 0 : 0;
            if (isNaN(icostp2p)) { icostp2p = 0 }
            let convPricep = 0;
            let convPricep2p = 0;
            if (selectedCurr === "SFL") {
                convPricep = icost;
                convPricep2p = icostp2p;
            }
            if (selectedCurr === "MATIC") {
                convPricep = (icost * priceData[2]) / priceData[1];
                convPricep2p = (icostp2p * priceData[2]) / priceData[1];
            }
            if (selectedCurr === "USDC") {
                convPricep = icost * priceData[2];
                convPricep2p = icostp2p * priceData[2];
            }
            icost = convPricep;
            icostp2p = convPricep2p;
            if (selectedQuantCook !== "unit") {
                if (time !== "" && time !== 0) { time = convTime(iQuant * timenbr) }
                if (timecomp !== "" && timecomp !== 0) { timecomp = convTime(iQuant * timecrpnbr) }
            }
            if (((selectedQuantityCook === "daily" || selectedQuantityCook === "dailymax") && cookitValue === 1) || selectedQuantityCook === "farm") {
                totOil += oilQty;
                totCost += icost;
                totCostp2p += icostp2p;
                for (let compofood in cobjCompo) {
                    const compo = compofood;
                    const quant = cobjCompo[compofood];
                    if (compo !== "Oil" && (it[compo] || fish[compo] || bounty[compo] || pfood[compo])) { Compo["total"][compo] += quant * (selectedQuantCook === "unit" ? 1 : iQuant) }
                }
            }
            const CellXPSflStyle = {};
            const CellXPHStyle = {};
            CellXPSflStyle.color = ColorValue(ixpsfl, 0, 50000);
            CellXPHStyle.color = ColorValue(ixph, 0, 2000);
            return (
                <tr key={index}>
                    {xListeColCook[0][1] === 1 ? <td className="tdcenter cook-building-cell">
                        {isBuildingStart ? <span className="cook-building-name">{ibld}</span> : null}
                        {!isBuildingEnd ? <span className={`cook-building-connector${isBuildingStart ? " is-start" : ""}`} aria-hidden="true"></span> : null}
                        {isBuildingEnd && !isBuildingStart ? <span className="cook-building-endcap" aria-hidden="true"></span> : null}
                    </td> : null}
                    <td id="iccolumn"><i><img src={ico} alt={''} className="itico" title={item} /></i></td>
                    {xListeColCook[1][1] === 1 ? <td className="tditem">{item}</td> : null}
                    {selectedQuantityCook === "daily" || selectedQuantityCook === "dailymax" ? <td className="tdcenter">
                        <input
                            type="checkbox"
                            name={`cookit:${item}`}
                            checked={icookit === 1}
                            onChange={handleUIChange}
                        />
                    </td> : null}
                    {xListeColCook[2][1] === 1 ? <td className="tdcenter">{iQuant}</td> : null}
                    {xListeColCook[3][1] === 1 ? <td className="tdcenter tooltipcell"
                        onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "xp"), e)}>{parseFloat(ixp).toFixed(1)}</td> : null}
                    {xListeColCook[4][1] === 1 ? <td className="tdcenter tooltipcell"
                        onClick={(e) => handleTooltip(item, "boostdetails", buildBoostTooltipContract(boostTooltipIndex, item, cobj, TryChecked ? "try" : "active", "timechg"), e)}>{timeToDays(time)}</td> : null}
                    {xListeColCook[5][1] === 1 ? <td className="tdcenter">{timecomp}</td> : null}
                    {xListeColCook[6][1] === 1 ? <td className="tdcenter" style={CellXPHStyle}>{ixph}</td> : null}
                    {xListeColCook[7][1] === 1 ? <td className="tdcenter">{ixphcomp}</td> : null}
                    {xListeColCook[8][1] === 1 ? <td className="tdcenter" style={CellXPSflStyle}>{frmtNb(ixpsfl)}</td> : null}
                    {dataSet?.options?.oilFood && xListeColCook[9][1] === 1 ? <td className="tdcenter">{frmtNb(oilQty)}</td> : null}
                    {xListeColCook[10][1] === 1 ? <td className="tdcenter tooltipcell"
                        onClick={(e) => handleTooltip(item, "cookcost", { qty: selectedQuantCook !== "unit" ? Math.max(1, iQuant) : 1 }, e)}>{frmtNb(icost)}</td> : null}
                    {xListeColCook[11][1] === 1 ? <td className="tdcenter tooltipcell"
                        onClick={(e) => handleTooltip(item, "cookcost", { qty: selectedQuantCook !== "unit" ? Math.max(1, iQuant) : 1 }, e)}>{frmtNb(icostp2p)}</td> : null}
                    {xListeColCook[12][1] === 1 ? Object.values(sortedCompo).map((itemName, itIndex) => (
                        <td className="tdcenterbrd" style={{ fontSize: '12px' }} key={itemName}>
                            {formatCookComponentQty(cobjCompo[itemName] ? cobjCompo[itemName] * (selectedQuantCook === "unit" ? 1 : iQuant) : "")}
                        </td>
                    )) : null}
                </tr>
            );
        });

        var maxTime = 0;
        for (var key in BldTime) {
            if (Object.prototype.hasOwnProperty.call(BldTime, key)) {
                var value = BldTime[key];
                if (typeof value === 'number' && !isNaN(value)) {
                    if (value > maxTime) {
                        maxTime = value;
                    }
                }
            }
        }
        totTime = convTime(maxTime);
        const timeOver = maxTime > 1; //farmTime / 24;
        const xinputKeep = selectedQuantityCook === "farm" ? <input type="text" name="inputKeep" value={dataSet?.options?.inputKeep} onChange={handleOptionChange} style={{ width: '18px' }} maxLength={2} /> : "";
        const xinputKeept = selectedQuantityCook === "farm" ? "Keep " : "";
        const xinputFromLvl = selectedQuantityCook !== "farm" ?
            <input
                type="number"
                min={1}
                max={Number(inputFromAscension) > 0 ? ascensionMaxLvl : preAscensionMaxLvl}
                step={1}
                name="inputFromLvl"
                value={inputFromLvl}
                onChange={handleUIChange}
                style={{ width: "40px", marginLeft: "auto" }}
            />
            : "";
        const xinputToLvl = selectedQuantityCook !== "farm" ?
            <input
                type="number"
                min={1}
                max={Number(inputToAscension) > 0 ? ascensionMaxLvl : preAscensionMaxLvl}
                step={1}
                name="inputToLvl"
                value={inputToLvl}
                onChange={handleUIChange}
                style={{ width: "40px", marginLeft: "auto" }}
            />
            : "";
        const xinputFromAscension = selectedQuantityCook !== "farm" ?
            <input
                type="number"
                min={0}
                step={1}
                name="inputFromAscension"
                value={inputFromAscension}
                onChange={handleUIChange}
                title="0 = before the first ascension"
                style={{ width: "34px" }}
            />
            : "";
        const xinputToAscension = selectedQuantityCook !== "farm" ?
            <input
                type="number"
                min={0}
                step={1}
                name="inputToAscension"
                value={inputToAscension}
                onChange={handleUIChange}
                title="0 = before the first ascension"
                style={{ width: "34px" }}
            />
            : "";
        const showLevelRange = selectedQuantityCook !== "farm";
        const levelDays = Number(fromtolvltime);
        const levelXp = Number(fromtolvlxp);
        const levelDaysLabel = Number.isFinite(levelDays) ? `${levelDays.toFixed(1)} days` : "- days";
        const levelXpLabel = Number.isFinite(levelXp) ? `${formatCompactNumber(levelXp)} XP` : "- XP";
        const levelRangeBadge = showLevelRange ? (
            <div
                className="cook-level-range-badge"
                style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    margin: "0",
                    padding: "4px 8px",
                    border: "1px solid rgb(90, 90, 90)",
                    borderRadius: "6px",
                    background: "rgba(0, 0, 0, 0.28)",
                    width: "fit-content",
                    maxWidth: "min(760px, 100%)",
                    fontSize: "12px",
                }}
            >
                <div className="cook-level-range-point">
                    <span>From</span>
                    <label>A {xinputFromAscension}</label>
                    <label>L {xinputFromLvl}</label>
                </div>
                <span className="cook-level-range-arrow">→</span>
                <div className="cook-level-range-point">
                    <span>To</span>
                    <label>A {xinputToAscension}</label>
                    <label>L {xinputToLvl}</label>
                </div>
                <div className="cook-level-range-summary">
                    <b>{levelDaysLabel}</b>
                    <span>{levelXpLabel}</span>
                    {isLevelRangeLoading ? <CircularProgress size={12} sx={{ color: "rgb(255, 205, 96)" }} /> : null}
                </div>
            </div>
        ) : null;
        const bumpkinCook = bumpkinData?.[0] || {};
        const currentLevelLabel = bumpkinCook?.levelLabel || `lvl ${bumpkinCook?.lvl ?? 0}`;
        const realLevelLabel = bumpkinProjection?.current?.label || currentLevelLabel;
        const projectedLevelLabel = bumpkinProjection?.projected?.label || realLevelLabel;
        const cappedExperience = Number(bumpkinProjection?.cappedExperience || 0);
        const hiddenXp = Math.max(0, Number(bumpkinProjection?.experience || 0) - cappedExperience);
        const segments = [
            { key: "hidden", label: "Earned XP", xp: hiddenXp, color: "#6f7d8c" },
            ...(includeFoodXp ? [{ key: "food", label: "Food", xp: foodStockXp, color: "#2f9de2" }] : []),
            ...(includeOwnedAgedXp ? [{ key: "owned-aged", label: "Owned Aged Fish", xp: ownedAgedFishXp, color: "#9c6ade" }] : []),
            ...(includeFishXp ? [{ key: "fish", label: fishXpMode === "aged" ? "Fish → Aged" : "Raw Fish", xp: rawFishXp, color: "#e79a3b" }] : []),
        ].filter((segment) => segment.xp > 0);
        const segmentTotal = Math.max(1, segments.reduce((total, segment) => total + segment.xp, 0));
        const realMarkerPercent = Math.max(0, Math.min(100, (hiddenXp / segmentTotal) * 100));
        const realLabelPercent = Math.max(18, Math.min(82, realMarkerPercent));
        const currentTotalXp = Number(bumpkinProjection?.experience || bumpkinCook?.xp || 0);
        const projectedTotalXp = currentTotalXp + selectedProjectionXp;
        const projectedLevelProgress = Math.max(0, Number(bumpkinProjection?.projected?.currentExperienceProgress || 0));
        const projectedLevelXp = Math.max(0, Number(bumpkinProjection?.projected?.experienceToNextLevel || 0));
        const projectedLevelPercent = projectedLevelXp > 0
            ? Math.max(0, Math.min(100, (projectedLevelProgress / projectedLevelXp) * 100))
            : 0;
        const optionStyle = { display: "inline-flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap", fontSize: "12px" };
        const stockProgressBadge = selectedQuantityCook === "farm" ? (
            <div
                className="cook-xp-progress"
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                    margin: "0",
                    padding: "5px 8px 6px",
                    border: "1px solid rgb(90, 90, 90)",
                    borderRadius: "6px",
                    background: "rgba(0, 0, 0, 0.28)",
                    width: "min(1000px, calc(100% - 16px))",
                }}
            >
                <div className="cook-xp-levels" style={{ position: "relative", height: "29px", fontSize: "11px" }}>
                    <span style={{ position: "absolute", left: 0 }}><b>{currentLevelLabel} 🔒</b><br />Capped level</span>
                    <span style={{ position: "absolute", left: `${realLabelPercent}%`, transform: "translateX(-50%)", textAlign: "center" }}><b>{realLevelLabel}</b><br />Actual XP level</span>
                    <span style={{ position: "absolute", right: 0, textAlign: "right" }}><b>{projectedLevelLabel}</b><br />With selection</span>
                </div>
                <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", height: "13px", overflow: "hidden", border: "1px solid #8c8178", borderRadius: "7px", background: "#342b27" }}>
                        {segments.map((segment) => (
                        <span key={segment.key} title={`${segment.label}: +${formatCompactNumber(segment.xp)} XP`} style={{
                                width: `${(segment.xp / segmentTotal) * 100}%`,
                                background: segment.color,
                                borderRight: "1px solid rgba(0,0,0,.45)",
                            }} />
                        ))}
                    </div>
                    <span title="Actual XP level" style={{ position: "absolute", left: `${realMarkerPercent}%`, top: "-3px", width: "2px", height: "19px", background: "#fff", boxShadow: "0 0 2px #000", transform: "translateX(-1px)" }} />
                </div>
                <div className="cook-xp-toggle-row">
                    <button
                        type="button"
                        className="cook-xp-options-toggle"
                        aria-expanded={xpProjectionExpanded}
                        title={xpProjectionExpanded ? "Hide XP projection details" : "Show XP projection details"}
                        onClick={() => setXpProjectionExpanded((expanded) => !expanded)}
                    >
                        {xpProjectionExpanded ? "projection ▲" : "projection ▼"}
                    </button>
                    <button
                        type="button"
                        className="cook-xp-options-toggle"
                        aria-expanded={xpOptionsExpanded}
                        title={xpOptionsExpanded ? "Hide XP options" : "Show XP options"}
                        onClick={() => setXpOptionsExpanded((expanded) => !expanded)}
                    >
                        {xpOptionsExpanded ? "options ▲" : "options ▼"}
                    </button>
                </div>
                {xpProjectionExpanded ? <div className="cook-xp-projection-details">
                    <span className="cook-xp-total-line">
                        Total XP <b>{formatCompactNumber(currentTotalXp)}</b>
                        <span>→</span>
                        <b>{formatCompactNumber(projectedTotalXp)}</b>
                        <small>+{formatCompactNumber(selectedProjectionXp)}</small>
                    </span>
                    <div className="cook-xp-level-progress">
                        <b>{projectedLevelLabel}</b>
                        <span className="cook-xp-level-track" title={`${formatCompactNumber(projectedLevelProgress)} / ${formatCompactNumber(projectedLevelXp)} XP`}>
                            <i style={{ width: `${projectedLevelPercent}%` }} />
                        </span>
                        <span>{formatCompactNumber(projectedLevelProgress)} / {formatCompactNumber(projectedLevelXp)} XP</span>
                        <small>{Math.round(projectedLevelPercent)}%</small>
                    </div>
                </div> : null}
                {xpOptionsExpanded ? <div className="cook-xp-options" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <label style={optionStyle} title="Keep quantities are excluded">
                        <input type="checkbox" checked={includeFoodXp} onChange={(e) => setIncludeFoodXp(e.target.checked)} />
                        Food <span style={{ color: "#63bdf3" }}>+{formatCompactNumber(foodStockXp)} XP</span>
                    </label>
                    <label style={optionStyle} title={`${formatCompactNumber(ownedAgedQuantity)} Aged + ${formatCompactNumber(ownedPrimeAgedQuantity)} Prime Aged`}>
                        <input type="checkbox" checked={includeOwnedAgedXp} onChange={(e) => setIncludeOwnedAgedXp(e.target.checked)} />
                        Owned Aged Fish <b>×{formatCompactNumber(ownedAgedFishQuantity)}</b> <span style={{ color: "#bd96ed" }}>+{formatCompactNumber(ownedAgedFishXp)} XP</span>
                    </label>
                    <label style={optionStyle}>
                        <input type="checkbox" checked={includeFishXp} onChange={(e) => setIncludeFishXp(e.target.checked)} /> Owned Fish <b>×{formatCompactNumber(rawFishQuantity)}</b>
                    </label>
                    {includeFishXp ? <span className="cook-xp-fish-modes" style={{ display: "inline-flex", gap: "6px", paddingLeft: "3px", borderLeft: "1px solid #66564c" }}>
                        <label style={optionStyle}><input type="radio" name="fishXpMode" checked={fishXpMode === "base"} onChange={() => setFishXpMode("base")} />Raw <span style={{ color: "#efb461" }}>+{formatCompactNumber(rawDirectFishXp)} XP</span></label>
                        <label style={optionStyle}><input type="radio" name="fishXpMode" checked={fishXpMode === "aged"} onChange={() => setFishXpMode("aged")} />As Aged <span style={{ color: "#efb461" }}>+{formatCompactNumber(rawAgedFishXp)} XP</span></label>
                    </span> : null}
                    <span className="cook-xp-selected-total" style={{ marginLeft: "auto", fontSize: "12px", whiteSpace: "nowrap" }}>
                        Selected XP: <b>+{formatCompactNumber(selectedProjectionXp)}</b>
                    </span>
                </div> : null}
            </div>
        ) : null;
        const hasCookStickyBar = Boolean(levelRangeBadge || stockProgressBadge);
        const stickyCookBadgeBar = hasCookStickyBar ? (
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
                {levelRangeBadge}
                {stockProgressBadge}
            </div>
        ) : null;

        xdxp = totXP;
        //const icolspan = xListeColCook[0][1] === 1 ? 3 : 2;
        const tableContent = (
            <>
                {stickyCookBadgeBar}
                <table
                    className="table cook-table"
                    style={{
                        "--cook-head-top": `${cookHeaderStickyTop}px`,
                        "--cook-head-row-h": `${cookHeaderRowHeight}px`,
                    }}
                >
                    <thead>
                        <tr ref={cookHeaderRowRef}>
                            {xListeColCook[0][1] === 1 ? <th className="thcenter" >Building</th> : null}
                            <th className="th-icon">   </th>
                            {xListeColCook[1][1] === 1 ? <th className="thcenter" >Food</th> : null}
                            {selectedQuantityCook === "daily" || selectedQuantityCook === "dailymax" ? <th className="thcenter" >Cook</th> : null}
                            {xListeColCook[2][1] === 1 ? <th className="thcenter" >
                                <DList
                                    name="selectedQuantityCook"
                                    title="Quantity"
                                    options={[
                                        { value: "farm", label: "Farm" },
                                        { value: "dailymax", label: "Daily" },
                                    ]}
                                    value={selectedQuantityCook}
                                    onChange={handleUIChange}
                                    height={20}
                                />
                            </th> : null}
                            {xListeColCook[3][1] === 1 ? <th className="thcenter"  >
                                <DList
                                    name="selectedQuantCook"
                                    title="XP"
                                    options={[
                                        { value: "unit", label: "/ Unit" },
                                        { value: "quant", label: "x Quantity" },
                                    ]}
                                    value={selectedQuantCook}
                                    onChange={handleUIChange}
                                    height={20}
                                />
                            </th> : null}
                            {xListeColCook[4][1] === 1 ? <th className="thcenter tooltipcell"
                                onClick={(e) => handleTooltip("time", "th", "", e)} >Time</th> : null}
                            {xListeColCook[5][1] === 1 ? <th className="thcenter" >Time comp</th> : null}
                            {xListeColCook[6][1] === 1 ? <th className="thcenter" >XP/H</th> : null}
                            {xListeColCook[7][1] === 1 ? <th className="thcenter" >XP/H comp</th> : null}
                            {xListeColCook[8][1] === 1 ? <th className="thcenter" >XP/{imgSFL}</th> : null}
                            {dataSet?.options?.oilFood && xListeColCook[9][1] === 1 ? <th className="thcenter" >Oil <i><img src={it?.Oil?.img || imgna} alt="Oil" className="itico" /></i></th> : null}
                            {xListeColCook[10][1] === 1 ? <th className="thcenter" >Cost {imgprodit}</th> : null}
                            {xListeColCook[11][1] === 1 ? <th className="thcenter" >
                                {/* <div className="selectquantback" style={{ top: `4px` }}><FormControl variant="standard" id="formselectquant" className="selectquant" size="small">
                    <InputLabel>Cost</InputLabel>
                    <Select value={selectedCostCook} onChange={handleChangeCostCook}>
                      <MenuItem value="shop">Shop</MenuItem>
                      <MenuItem value="trader">Market</MenuItem>
                      <MenuItem value="nifty">Niftyswap</MenuItem>
                      <MenuItem value="opensea">OpenSea</MenuItem>
                    </Select></FormControl></div> */}Bought {imgbuyit}</th> : null}
                            {xListeColCook[12][1] === 1 ? Object.values(sortedCompo).map((itemName, itIndex) => (
                                <th className="thcenter" key={itemName}><i><img src={(it[itemName] ? it[itemName].img : fish[itemName] ? fish[itemName].img : bounty[itemName] ? bounty[itemName].img : pfood[itemName] ? pfood[itemName].img : imgna)} alt={itemName} className="itico" /></i></th>
                            )) : null}
                        </tr>
                        {selectedQuantCook !== "unit" ?
                            <tr key="total">
                                {xListeColCook[0][1] === 1 ? <td className="tdcenter">Total</td> : null}
                                <td></td>
                                {xListeColCook[1][1] === 1 ? <td></td> : null}
                                {selectedQuantityCook !== "farm" ? <td className="tdcenter"></td> : null}
                                {/* {xListeColCook[1][1] === 1 && selectedQuantityCook === "farm" ? <td className="tditem"></td> : null} */}
                                {xListeColCook[2][1] === 1 ? (
                                    <td className="tdcenter">
                                        {selectedQuantityCook === "farm" ? (
                                            <span title="Keep for deliveries">{xinputKeept}{xinputKeep}</span>
                                        ) : null}
                                    </td>
                                ) : null}
                                {xListeColCook[3][1] === 1 ? <td className="tdcenter">{selectedQuantityCook === "daily" || selectedQuantityCook === "dailymax" || selectedQuantityCook === "farm" ? parseFloat(totXP).toFixed(1) : ""}</td> : null}
                                {xListeColCook[4][1] === 1 ? <td className="tdcenter" style={{ color: timeOver && selectedQuantityCook !== "farm" ? "rgb(255, 0, 0)" : "rgb(255, 255, 255)" }}>
                                    {selectedQuantityCook !== "farm" ? totTime : ""}</td> : null}
                                {xListeColCook[5][1] === 1 ? <td className="tdcenter"></td> : null}
                                {xListeColCook[6][1] === 1 ? <td className="tdcenter"></td> : null}
                                {xListeColCook[7][1] === 1 ? <td className="tdcenter"></td> : null}
                                {xListeColCook[8][1] === 1 ? <td className="tdcenter"></td> : null}
                                {dataSet?.options?.oilFood && xListeColCook[9][1] === 1 ? <td className="tdcenter">{selectedQuantCook !== "unit" ? frmtNb(totOil) : ""}</td> : null}
                                {xListeColCook[10][1] === 1 ? <td className="tdcenter">{selectedQuantCook !== "unit" ? frmtNb(totCost) : ""}</td> : null}
                                {xListeColCook[11][1] === 1 ? <td className="tdcenter">{selectedQuantCook !== "unit" ? frmtNb(totCostp2p) : ""}</td> : null}
                                {xListeColCook[12][1] === 1 ? Object.values(sortedCompo).map((itemName, itIndex) => (
                                    <td className="tdcenterbrd" key={itemName}
                                        style={{
                                            fontSize: '12px', color: it[itemName] ? (Compo["total"][itemName] > (!TryChecked ? dProd[itemName] : dProdtry[itemName])
                                                && selectedQuantityCook !== "farm" ? "rgb(255, 0, 0)" : "rgb(255, 255, 255)") : "rgb(255, 255, 255)"
                                        }}>
                                        {selectedQuantCook !== "unit" && Compo["total"][itemName] > 0 ? Compo["total"][itemName] : ""}
                                    </td>
                                )) : null}
                            </tr> : null}
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
function hasIngredientFromTable(tree, table) {
    if (!tree || typeof tree !== "object" || !table) return false;
    return Object.entries(tree).some(([name, rawNode]) => {
        if (table[name]) return true;
        if (rawNode && typeof rawNode === "object" && rawNode.compoit && typeof rawNode.compoit === "object") {
            return hasIngredientFromTable(rawNode.compoit, table);
        }
        return false;
    });
}
function hasIngredientMatching(tree, matcher) {
    if (!tree || typeof tree !== "object" || typeof matcher !== "function") return false;
    return Object.entries(tree).some(([name, rawNode]) => {
        if (matcher(name)) return true;
        if (rawNode && typeof rawNode === "object" && rawNode.compoit && typeof rawNode.compoit === "object") {
            return hasIngredientMatching(rawNode.compoit, matcher);
        }
        return false;
    });
}
function getCookSortValue(sortBy, item, quantity, food, pfood, tryChecked, coinsRatio) {
    const cobj = food[item] || pfood[item] || {};
    const unitCost = ((Number(tryChecked ? cobj.costtry : cobj.cost) || 0) / (coinsRatio || 1));
    const unitXpSfl = (Number(tryChecked ? cobj.xpsfltry : cobj.xpsfl) || 0) * (coinsRatio || 1);
    switch (sortBy) {
        case "building":
            return String(cobj.bld || "Fish Market");
        case "item":
            return String(item || "");
        case "quantity":
            return Number(quantity || 0);
        case "xp":
            return Number(tryChecked ? cobj.xptry : cobj.xp) || 0;
        case "time":
            return convtimenbr(tryChecked ? cobj.timetry : cobj.time);
        case "xph":
            return Number(tryChecked ? cobj.xphtry : cobj.xph) || 0;
        case "xpsfl":
            return Number(unitXpSfl) || 0;
        case "cost":
            return Number(unitCost) || 0;
        case "market":
            return Number(tryChecked ? (cobj.costp2pttry ?? cobj.costp2pt) : cobj.costp2pt) || 0;
        case "components":
            return Object.keys(flattenCompoit(tryChecked ? (cobj?.compoittry || cobj?.compoit) : cobj?.compoit) || {}).length;
        default:
            return 0;
    }
}
