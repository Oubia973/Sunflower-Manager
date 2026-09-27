import { useEffect, useRef, useState } from "react";
import { useAppCtx } from "../context/AppCtx";
import { selectCurrentProjection } from "../utils/farmState.js";
import DList from "../dlist.jsx";
import { frmtNb, ColorValue } from "../fct.js";
import { fetchJson } from "../services/apiClient.js";
import "../components/home/home-modern.css";
import FloatingIslandCard from "../components/home/FloatingIslandCard.jsx";
import {
    imgna,
    imgadmin,
    imgconfirm,
    imgcancel,
    imgcoins,
    imgsfl,
    imgfish,
    imgpet,
    imgsyncing,
    imgrefresh,
    imgwinter,
    imgspring,
    imgsummer,
    imgautumn,
    imgwinterPath,
    imgspringPath,
    imgsummerPath,
    imgautumnPath,
    imglogo512,
    imgsunflowerCrunch,
} from "../constants/images.js";

function isToday(date) {
    if (!date) return false;
    const today = new Date();
    const givenDate = new Date(date);
    return (
        today.getUTCDate() === givenDate.getUTCDate() &&
        today.getUTCMonth() === givenDate.getUTCMonth() &&
        today.getUTCFullYear() === givenDate.getUTCFullYear()
    );
}

function readSet(row, forTry) {
    return forTry ? (row?.tryset || {}) : (row?.active || {});
}

function readModeSet(row, mode, forTry) {
    if (mode === "daily") {
        return forTry ? (row?.dailytryset || {}) : (row?.daily || {});
    }
    return readSet(row, forTry);
}

function getHomeCostValue(rowSet, priceMode) {
    const prodCost = Number(rowSet?.cost || 0);
    const marketCost = Number(rowSet?.market || 0);
    if (priceMode === "market") return marketCost;
    return prodCost;
}

function getHomeProfitValue(rowSet, priceMode) {
    const prodCost = Number(rowSet?.cost || 0);
    const marketCost = Number(rowSet?.market || 0);
    const revenue = prodCost + Number(rowSet?.profit || 0);
    if (priceMode === "market") {
        return revenue - marketCost;
    }
    return Number(rowSet?.profit || 0);
}

function formatCooldownRemaining(ms) {
    const totalSeconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
    if (totalSeconds <= 0) return "Ready";
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
    if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    return `${seconds}s`;
}

export default function HomeTable({ modern = false }) {
    const homeContainerRef = useRef(null);
    const [isBumpkinCooldown, setIsBumpkinCooldown] = useState(false);
    const [isBumpkinRefreshing, setIsBumpkinRefreshing] = useState(false);
    const [cooldownNow, setCooldownNow] = useState(() => Date.now());
    const bumpkinRequestInFlightRef = useRef(false);
    const {
        data: { dataSet, dataSetFarm, bumpkinLoading },
        ui: {
            selectedInv,
            xListeColBounty,
            TryChecked,
            isOpen,
            selectedHomeBlocks,
            selectedHomeItems,
            selectedHomeMode,
            selectedHomePriceMode,
        },
        img: {
            imgSFL,
            imgExchng,
            imgna,
            imgbuyit,
            imgprodit
        },
        actions: {
            handleHomeClic,
            handleUIChange,
            setUIField,
            handleTooltip,
        },
        config: { API_URL },
    } = useAppCtx();

    useEffect(() => {
        if (!modern || selectedInv !== "home") return;
        const home = homeContainerRef.current;
        const scroller = home?.closest(".table-container");
        if (!scroller) return;
        const updatePanelHeight = () => {
            home.style.setProperty("--home-panel-height", `${scroller.clientHeight}px`);
        };
        updatePanelHeight();
        const observer = typeof ResizeObserver === "function" ? new ResizeObserver(updatePanelHeight) : null;
        observer?.observe(scroller);
        window.addEventListener("resize", updatePanelHeight);
        return () => {
            observer?.disconnect();
            window.removeEventListener("resize", updatePanelHeight);
            home.style.removeProperty("--home-panel-height");
        };
    }, [modern, selectedInv, dataSetFarm?.homeData]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setCooldownNow(Date.now());
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    async function getBumpkin(dataSetRef, forceRefresh = false) {
        const currentFarmId = String(dataSetRef?.farmId ?? dataSetFarm?.frmid ?? "");
        const cachedFarmId = String(dataSetRef?.bumpkinImgFarmId ?? "");
        if (!forceRefresh && dataSetRef?.bumpkinImg && cachedFarmId === currentFarmId) {
            return { success: true, skipped: true, reason: "cached" };
        }
        if (!forceRefresh) {
            try {
                const storedDataRaw = localStorage.getItem("SFLManData");
                if (storedDataRaw) {
                    const storedData = JSON.parse(storedDataRaw);
                    const storedFarmId = String(storedData?.dataSet?.options?.farmId ?? storedData?.lastID ?? "");
                    const cachedBumpkinImg = storedData?.dataSet?.bumpkinImg;
                    if (cachedBumpkinImg && storedFarmId === currentFarmId) {
                        dataSetRef.bumpkinImg = cachedBumpkinImg;
                        dataSetRef.bumpkinImgFarmId = currentFarmId;
                        return { success: true, skipped: true, reason: "local_cache" };
                    }
                }
            } catch {
                // Ignore corrupt cache and fall back to the network.
            }
        }

        try {
            const bumpkinResponse = await fetchJson(API_URL, "/getbumpkin", {
                method: "GET",
                headers: {
                    frmid: currentFarmId,
                    username: dataSetRef?.options?.username || "",
                    tknuri: dataSetRef?.bumpkin?.tkuri || "",
                },
            });
            dataSetRef.bumpkinImg = bumpkinResponse.responseImage;
            dataSetRef.bumpkinImgFarmId = currentFarmId;
            return { success: true, data: bumpkinResponse };
        } catch (error) {
            return { success: false, error: error?.message || "Bumpkin request failed" };
        }
    }

    useEffect(() => {
        if (selectedInv !== "home") return;
        const currentFarmId = String(dataSetFarm?.frmid || dataSet?.options?.farmId || "");
        if (!currentFarmId) return;
        if (dataSet?.bumpkinImg && String(dataSet?.bumpkinImgFarmId || "") === currentFarmId) return;
        if (bumpkinRequestInFlightRef.current) return;

        bumpkinRequestInFlightRef.current = true;
        setIsBumpkinRefreshing(true);
        (async () => {
            try {
                await getBumpkin(dataSet);
            } finally {
                bumpkinRequestInFlightRef.current = false;
                setIsBumpkinRefreshing(false);
            }
        })();
    }, [selectedInv, dataSetFarm?.frmid, dataSet?.options?.farmId, dataSet?.bumpkinImg, dataSet?.bumpkinImgFarmId]);

    if (selectedInv !== "home") return null;

    const homeData = selectCurrentProjection(dataSetFarm, "homeData");
    if (!homeData) return <div>Loading home data...</div>;

    const img = dataSet?.bumpkinImg || imglogo512;
    const vipImg = <img src={imgadmin} alt={""} className="itico" title={"VIP"} />;
    const imgDone = <img src={imgconfirm} alt={""} className="itico" title={"Done"} />;
    const imgCancel = <img src={imgcancel} alt={""} className="itico" title={"Not done"} />;
    const imgDoneSmall = <img src={imgconfirm} alt={""} className="seasonico" title={"Done"} />;
    const imgCancelSmall = <img src={imgcancel} alt={""} className="seasonico" title={"Not done"} />;
    const imgTkt = <img src={dataSet.imgtkt || imgna} alt={""} className="seasonico" title={dataSet.tktName || "Season tickets"} />;
    const imgCoinsSmall = <img src={imgcoins} alt={""} className="seasonico" title={"Coins"} />;
    const imgSflSmall = <img src={imgsfl} alt={""} className="seasonico" title={"Flower"} />;
    const imgFishSmall = <img src={imgfish} alt={""} className="itico" title={"Fish casts"} />;
    const imgPetSmall = <img src={imgpet} alt={""} className="itico" title={"Pets"} />;
    const imgDishSmall = <img src={imgsunflowerCrunch} alt={""} className="saisonico" title={"Pet requests"} />;
    const vipDate = homeData?.vipDate ? new Date(homeData.vipDate).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }) : imgCancel;

    const dailyChest = isToday(homeData?.dailyChest?.collectedAt) ? imgDone : imgCancel;
    const dailyChestStreak = homeData?.dailyChest?.streak ? <span> Streak: {homeData.dailyChest.streak}</span> : null;
    const dailyDig = isToday(homeData?.digging?.collectedAt) ? imgDone : imgCancel;
    const dailyDigStreak = homeData?.digging?.streak ? <span> Streak: {homeData.digging.streak}</span> : null;
    const statusClass = (done) => modern ? `home-routine ${done ? "is-done" : "is-pending"}` : undefined;
    const fishCastsStatus = homeData?.fish?.done ? imgDone : imgCancel;
    const petRequestsStatus = homeData?.pets?.done ? imgDone : imgCancel;
    const bountyHasSfl = homeData?.bounties && ("sflDone" in homeData.bounties || "sflCount" in homeData.bounties);
    const blocks = Array.isArray(homeData?.blocks) ? homeData.blocks : [];
    const forTry = !!TryChecked;
    const homeMode = selectedHomeMode === "daily" ? "daily" : "current";
    const isDailyMode = homeMode === "daily";
    const homePriceMode = selectedHomePriceMode === "market" ? "market" : "prod";
    const curHrvst = isDailyMode ? "Daily" : (forTry ? "Average" : "Current");
    let totalCost = 0;
    const cooldownKey = forTry ? "cooldowntry" : "cooldown";
    const sourcePowerSkills = Array.isArray(homeData?.powerSkills) ? homeData.powerSkills : [];
    const powerSkillCards = sourcePowerSkills
        .filter((skillCfg) => Number(skillCfg?.isactive || 0) > 0)
        .map((skillCfg) => {
            const skillName = String(skillCfg?.name || "");
            const cooldownHours = Number(skillCfg?.[cooldownKey] ?? skillCfg?.cooldown ?? 0);
            if (!(cooldownHours > 0)) return null;
            const cooldownMs = cooldownHours * 60 * 60 * 1000;
            const lastUsedAt = Number(skillCfg?.lastUsedAt || 0);
            const readyAt = lastUsedAt > 0 ? lastUsedAt + cooldownMs : 0;
            const remainingMs = readyAt > cooldownNow ? (readyAt - cooldownNow) : 0;
            const progressPct = cooldownMs > 0 ? Math.max(0, Math.min(100, ((cooldownMs - remainingMs) / cooldownMs) * 100)) : 100;
            return {
                name: skillName,
                img: skillCfg?.img || imgna,
                cooldownHours,
                lastUsedAt,
                remainingMs,
                progressPct,
                isCoolingDown: remainingMs > 0,
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            if (modern) {
                if (a.isCoolingDown !== b.isCoolingDown) return a.isCoolingDown ? 1 : -1;
                if (a.isCoolingDown && b.isCoolingDown) return a.remainingMs - b.remainingMs;
            }
            if (a.isCoolingDown !== b.isCoolingDown) return a.isCoolingDown ? -1 : 1;
            if (a.isCoolingDown && b.isCoolingDown) return b.remainingMs - a.remainingMs;
            return a.name.localeCompare(b.name);
        });

    const leftPanel = (
        <div className="home-left-panel">
            <div className="home-left-panel-image-wrap">
                <img src={`${img}`} width="100%" alt="Bumpkin"></img>
                {(bumpkinLoading || isBumpkinRefreshing) && (
                    <div className="bumpkin-loading-badge" title="Loading bumpkin image">
                        <img src={imgsyncing} alt="" />
                    </div>
                )}
                <button
                    type="button"
                    className="button small-btn bumpkin-refresh-btn"
                    title={isBumpkinCooldown ? "Cooldown 10s" : (bumpkinLoading || isBumpkinRefreshing) ? "Loading" : "Refresh bumpkin"}
                    disabled={isBumpkinCooldown || bumpkinLoading || isBumpkinRefreshing}
                    onClick={async () => {
                        if (isBumpkinCooldown || bumpkinLoading || isBumpkinRefreshing) return;
                        setIsBumpkinCooldown(true);
                        setIsBumpkinRefreshing(true);
                        try {
                            await getBumpkin(dataSet, true);
                        } finally {
                            setIsBumpkinRefreshing(false);
                            setTimeout(() => setIsBumpkinCooldown(false), 10000);
                        }
                    }}
                >
                    <img src={imgrefresh} alt="" />
                </button>
            </div>
            <div className="home-left-panel-text">
                <p style={{ fontSize: modern ? "inherit" : "12px" }}>{vipImg} {vipDate}</p>
                <p className={`home-status-line home-status-line-break ${statusClass(isToday(homeData?.dailyChest?.collectedAt)) || ""}`} style={{ fontSize: modern ? "inherit" : "12px" }}>
                    <span>Daily chest: {dailyChest}</span>
                    {dailyChestStreak ? <><br />{dailyChestStreak}</> : null}
                </p>
                <p className="home-deliveries-bounties">
                    <span className={`home-db-line ${statusClass(homeData?.deliveries?.done >= homeData?.deliveries?.count) || ""}`}>Deliveries: {homeData?.deliveries?.done || 0}/{homeData?.deliveries?.count || 0}</span>
                    <span className="home-reward-row">
                        <span className="home-reward-item">{imgTkt}{homeData?.deliveries?.tktDone || 0}/{homeData?.deliveries?.tktCount || 0}</span>
                        <span className="home-reward-item">{imgCoinsSmall}{homeData?.deliveries?.coinsDone || 0}/{homeData?.deliveries?.coinsCount || 0}</span>
                        <span className="home-reward-item">{imgSflSmall}{homeData?.deliveries?.sflDone || 0}/{homeData?.deliveries?.sflCount || 0}</span>
                    </span>
                    <span className={`home-db-line ${statusClass(homeData?.chores?.done >= homeData?.chores?.count) || ""}`}>Chores: {homeData?.chores?.done || 0}/{homeData?.chores?.count || 0}</span>
                    <span className={`home-db-line ${statusClass(homeData?.bounties?.done >= homeData?.bounties?.count) || ""}`}>Bounties: {homeData?.bounties?.done || 0}/{homeData?.bounties?.count || 0}</span>
                    <span className="home-reward-row">
                        <span className="home-reward-item">{imgTkt}{homeData?.bounties?.tktDone || 0}/{homeData?.bounties?.tktCount || 0}</span>
                        <span className="home-reward-item">{imgCoinsSmall}{homeData?.bounties?.coinsDone || 0}/{homeData?.bounties?.coinsCount || 0}</span>
                        {bountyHasSfl ? <span className="home-reward-item">{imgSflSmall}{homeData?.bounties?.sflDone || 0}/{homeData?.bounties?.sflCount || 0}</span> : null}
                    </span>
                </p>
                <p className={`home-status-line home-status-line-break ${statusClass(isToday(homeData?.digging?.collectedAt)) || ""}`} style={{ fontSize: modern ? "inherit" : "12px" }}>
                    <span>Daily dig: {dailyDig}</span>
                    {dailyDigStreak ? <><br />{dailyDigStreak}</> : null}
                </p>
                <p className={modern ? "home-protections" : undefined}>
                    <span>Protections</span>
                    <br />
                    <span>
                        <img src={imgwinterPath} alt={""} className="seasonico" title="Winter" />{homeData?.protections?.winter ? imgDoneSmall : imgCancelSmall}
                        <img src={imgspringPath} alt={""} className="seasonico" title="Spring" />{homeData?.protections?.spring ? imgDoneSmall : imgCancelSmall}
                        <img src={imgsummerPath} alt={""} className="seasonico" title="Summer" />{homeData?.protections?.summer ? imgDoneSmall : imgCancelSmall}
                        <img src={imgautumnPath} alt={""} className="seasonico" title="Autumn" />{homeData?.protections?.autumn ? imgDoneSmall : imgCancelSmall}
                    </span>
                </p>
                <p className={statusClass(homeData?.fish?.done)} style={{ fontSize: modern ? "inherit" : "12px" }}>{imgFishSmall} {homeData?.fish?.casts || 0}/{homeData?.fish?.max || 0} {fishCastsStatus}</p>
                <p className={statusClass(homeData?.pets?.done)} style={{ fontSize: modern ? "inherit" : "12px" }}>{imgPetSmall} {homeData?.pets?.fed || 0}/{homeData?.pets?.total || 0}{imgDishSmall} {petRequestsStatus}</p>
                {powerSkillCards.length > 0 && (
                    <div className="home-power-skills">
                        <div className="home-power-skills-grid">
                            {powerSkillCards.map((skillCard) => (
                                <div
                                    key={skillCard.name}
                                    className={`home-power-skill-card${skillCard.isCoolingDown ? " is-cooling" : " is-ready"}`}
                                    title={`${skillCard.name}${skillCard.lastUsedAt ? `\nLast use: ${new Date(skillCard.lastUsedAt).toLocaleString("en-US")}` : "\nNo recent use"}${skillCard.isCoolingDown ? `\nRemaining: ${formatCooldownRemaining(skillCard.remainingMs)}` : "\nReady"}`}
                                >
                                    <img src={skillCard.img} alt={skillCard.name} className="home-power-skill-icon" />
                                    <div className="home-power-skill-bar">
                                        <span className="home-power-skill-bar-fill" style={{ width: `${skillCard.isCoolingDown ? skillCard.progressPct : 100}%` }} />
                                    </div>
                                    {modern && <span className="home-power-skill-time">{formatCooldownRemaining(skillCard.remainingMs)}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <FloatingIslandCard {...homeData?.floatingIsland} now={cooldownNow} formatRemaining={formatCooldownRemaining} />
            </div>
        </div>
    );

    const collapsibleBlocks = blocks.map((block, index) => {
        const rawRows = Array.isArray(block?.rows) ? block.rows : [];
        const rows = (isDailyMode && block?.key === "cropmachine")
            ? rawRows
                .filter((row) => !row?.hideInDaily)
                .slice()
                .sort((a, b) => Number(a?.dailySortOrder || 0) - Number(b?.dailySortOrder || 0))
            : rawRows;
        const isBlockSelected = selectedHomeBlocks?.[index] ?? true;
        const blockLabel = forTry ? (block?.labelTry || block?.label || `Block ${index + 1}`) : (block?.label || `Block ${index + 1}`);
        const iconSrc = block?.img || imgna;
        const blockIcon = <img src={iconSrc} alt="" className="nodico" title={blockLabel} />;
        let blockCost = 0;

        const isItemActive = (row) => {
            if (!block?.itemToggle) return true;
            const selectionKey = String(row?.selectionKey || row?.key || row?.name || "");
            return selectedHomeItems?.[selectionKey] ?? true;
        };
        const toggleItemSelection = (row) => {
            const selectionKey = String(row?.selectionKey || row?.key || row?.name || "");
            if (!selectionKey) return;
            setUIField("selectedHomeItems", (prevState) => ({
                ...(prevState || {}),
                [selectionKey]: !(prevState?.[selectionKey] ?? true),
            }));
        };
        const openItemDashboard = (event, row) => {
            event.stopPropagation();
            handleTooltip(row?.name || "", "itemdashboard", { source: "home" }, event);
        };

        rows.forEach((row) => {
            const rowSet = readModeSet(row, homeMode, forTry);
            if (!isItemActive(row)) return;
            blockCost += getHomeCostValue(rowSet, homePriceMode);
        });
        const blockProfit = rows.reduce((sum, row) => {
            if (!isItemActive(row)) return sum;
            const rowSet = readModeSet(row, homeMode, forTry);
            return sum + getHomeProfitValue(rowSet, homePriceMode);
        }, 0);
        if (isBlockSelected) {
            totalCost += blockCost;
        }

        return (
            <div key={block?.key || index} className={`collapsible-block${modern && !isBlockSelected ? " home-block-excluded" : ""}`}>
                <div className="collapsible-header" onClick={() => handleHomeClic(index)}
                    role={modern ? "button" : undefined} tabIndex={modern ? 0 : undefined}
                    aria-expanded={modern ? !!isOpen[index] : undefined}
                    onKeyDown={modern ? (event) => {
                        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            handleHomeClic(index);
                        }
                    } : undefined}>
                    <span className="collapsible-header-left">
                        <input
                            type="checkbox"
                            className="collapsible-header-checkbox"
                            aria-label={modern ? `Include ${blockLabel} in totals` : undefined}
                            checked={!!isBlockSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => {
                                setUIField("selectedHomeBlocks", (prevState) => ({
                                    ...(prevState || {}),
                                    [index]: !(prevState?.[index] ?? true),
                                }));
                            }}
                        />
                        {blockIcon} {blockLabel}
                    </span>
                    {modern ? <span className="home-block-metrics">
                        <span title="Production cost of this block">{frmtNb(blockCost)}</span>
                        <span title="Estimated profit of this block" style={{ color: ColorValue(blockProfit, 0, 10) }}>{frmtNb(blockProfit)}</span>
                        <span className="home-block-chevron" aria-hidden="true">{isOpen[index] ? "▾" : "▸"}</span>
                    </span> : <span style={{ textAlign: "right" }}>
                        Cost: {frmtNb(blockCost)} - Profit: <span style={{ color: ColorValue(frmtNb(blockProfit), 0, 10) }}>{frmtNb(blockProfit)}</span>
                    </span>}
                </div>
                {isOpen[index] && (
                    <div className="collapsible-content">
                        {(() => {
                            const showNodesCol = xListeColBounty[2][1] === 1 && !block?.hideNodes;
                            const showCyclesCol = isDailyMode && xListeColBounty[5][1] === 1;
                            const showSeedsCol = !!block?.showSeeds;
                            const showHarvestCol = xListeColBounty[3][1] === 1;
                            const showOilCol = !!block?.showOil;
                            const showCostCol = xListeColBounty[4][1] === 1;
                            const showMarketCol = !isDailyMode && xListeColBounty[5][1] === 1;
                            const showProfitCol = xListeColBounty[5][1] === 1;
                            const showSeedsBeforeCycles = isDailyMode && block?.key === "cropmachine";
                            return (
                                <table className="table" style={{ width: "100%" }}>
                                    <thead>
                                        <tr>
                                            {xListeColBounty[1][1] === 1 ? <th className={`collapsible-content-th${modern ? " home-item-cell" : ""}`}>Item</th> : null}
                                            {showNodesCol ? <th className="collapsible-content-th">Nodes</th> : null}
                                            {showSeedsBeforeCycles && showSeedsCol ? <th className="collapsible-content-th">Seeds</th> : null}
                                            {showCyclesCol ? <th className="collapsible-content-th">Cycles</th> : null}
                                            {!showSeedsBeforeCycles && showSeedsCol ? <th className="collapsible-content-th">Seeds</th> : null}
                                            {showHarvestCol ? <th className="collapsible-content-th">Harvest</th> : null}
                                            {showOilCol ? <th className="collapsible-content-th">Oil</th> : null}
                                            {showCostCol ? <th className="collapsible-content-th">Cost</th> : null}
                                            {showMarketCol ? <th className="collapsible-content-th">Market</th> : null}
                                            {showProfitCol ? <th className="collapsible-content-th">Profit</th> : null}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, itemIndex) => {
                                            const rowActive = isItemActive(row);
                                            const rowSet = readModeSet(row, homeMode, forTry);
                                            const planted = rowActive ? Number(rowSet?.planted || 0) : 0;
                                            const cycles = rowActive ? Number(rowSet?.cycles || 0) : 0;
                                            const harvest = rowActive ? Number(rowSet?.harvest || 0) : 0;
                                            const oil = rowActive ? Number(rowSet?.oil || 0) : 0;
                                            const cost = rowActive ? getHomeCostValue(rowSet, homePriceMode) : 0;
                                            const market = rowActive ? Number(rowSet?.market || 0) : 0;
                                            const profit = rowActive ? getHomeProfitValue(rowSet, homePriceMode) : 0;
                                            return (
                                                <tr
                                                    key={(row?.key || row?.name || "row") + "-" + itemIndex}
                                                    className={modern && !rowActive ? "home-row-excluded" : undefined}
                                                    style={{ opacity: modern || rowActive ? 1 : 0.5, cursor: "pointer" }}
                                                    onClick={(event) => openItemDashboard(event, row)}
                                                    tabIndex={0}
                                                    onKeyDown={(event) => {
                                                        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                                                            event.preventDefault();
                                                            openItemDashboard(event, row);
                                                        }
                                                    }}
                                                    title={`Open ${row?.name || "item"} details`}
                                                >
                                                    {xListeColBounty[1][1] === 1 && (
                                                        <td className={`tdcenter${modern ? " home-item-cell" : ""}`}>
                                                            {block?.itemToggle ? (
                                                                <span
                                                                    className="home-item-toggle"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="home-item-checkbox"
                                                                        checked={!!rowActive}
                                                                        onClick={(event) => event.stopPropagation()}
                                                                        onChange={() => toggleItemSelection(row)}
                                                                        title="Count this item"
                                                                    />
                                                                    <button type="button" className="home-item-open" onClick={(event) => openItemDashboard(event, row)} aria-label={`Open ${row?.name || "item"} details`} title={`Open ${row?.name || "item"} details`}>
                                                                        <img src={row?.img || imgna} alt={row?.name || ""} className="nodico" />
                                                                    </button>
                                                                </span>
                                                            ) : (
                                                                <button type="button" className="home-item-open" onClick={(event) => openItemDashboard(event, row)} aria-label={`Open ${row?.name || "item"} details`} title={`Open ${row?.name || "item"} details`}>
                                                                    <img src={row?.img || imgna} alt={row?.name || ""} className="nodico" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                    {showNodesCol && <td className="tdcenter">{frmtNb(planted)}</td>}
                                                    {showSeedsBeforeCycles && showSeedsCol && <td className="tdcenter">{frmtNb(planted)}</td>}
                                                    {showCyclesCol && <td className="tdcenter">{frmtNb(cycles)}</td>}
                                                    {!showSeedsBeforeCycles && showSeedsCol && <td className="tdcenter">{frmtNb(planted)}</td>}
                                                    {showHarvestCol && <td className="tdcenter">{frmtNb(harvest)}</td>}
                                                    {showOilCol && <td className="tdcenter">{frmtNb(oil)}</td>}
                                                    {showCostCol && <td className="tdcenter">{frmtNb(cost)}</td>}
                                                    {showMarketCol && <td className="tdcenter">{frmtNb(market)}</td>}
                                                    {showProfitCol && <td className="tdcenter" style={{ color: ColorValue(profit, 0, 10) }}>{frmtNb(profit)}</td>}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            );
                        })()}
                    </div>
                )}
            </div>
        );
    });

    const totalProfit = blocks.reduce((sum, block, index) => {
        const rows = Array.isArray(block?.rows) ? block.rows : [];
        const isBlockSelected = selectedHomeBlocks?.[index] ?? true;
        if (!isBlockSelected) return sum;
        return sum + rows.reduce((rowSum, row) => {
            const selectionKey = String(row?.selectionKey || row?.key || row?.name || "");
            const rowActive = !block?.itemToggle ? true : (selectedHomeItems?.[selectionKey] ?? true);
            if (!rowActive) return rowSum;
            const rowSet = readModeSet(row, homeMode, forTry);
            return rowSum + getHomeProfitValue(rowSet, homePriceMode);
        }, 0);
    }, 0);
    const priceModeOptions = [
        { value: "prod", label: "Production", icon: imgprodit },
        { value: "market", label: "Market", icon: imgbuyit },
    ];
    return (
        <div ref={homeContainerRef} className={`home-container${modern ? " home-modern" : ""}`}>
            {leftPanel}
            <div className="home-collapsible-wrap">
                {modern ? <div className="home-modern-summary">
                    <div className="home-modern-context">
                        <strong>{curHrvst}</strong>
                        <span>{forTry ? "Tryset" : "Activeset"}</span>
                    </div>
                    <div className="home-modern-totals" title="Totals include only checked blocks and items. Profit is an estimate, not realised earnings.">
                        <span>Cost <strong>{frmtNb(totalCost)}</strong></span>
                        <span>{isDailyMode ? "Profit/day" : "Profit"} <strong style={{ color: ColorValue(totalProfit, 0, 10) }}>{frmtNb(totalProfit)}</strong></span>
                    </div>
                    <div className="home-modern-columns"><span>Production</span><span>Cost</span><span>Profit</span><span /></div>
                </div> : <div className="home-collapsible-header home-harvest-row">
                    <span className="home-harvest-block home-harvest-block-primary">{curHrvst} harvests total :</span>
                    <span className="home-harvest-block home-harvest-block-secondary">
                        {/*
                        <DList
                            name="selectedHomePriceMode"
                            options={priceModeOptions}
                            value={homePriceMode}
                            onChange={handleUIChange}
                            iconOnly={true}
                            height={20}
                            width="auto"
                            className="home-price-mode-picker"
                            menuMinWidth={150}
                        />
                        */}
                        Cost: {frmtNb(totalCost)} - Profit: <span style={{ color: ColorValue(frmtNb(totalProfit), 0, 10) }}>{frmtNb(totalProfit)}</span>
                    </span>
                </div>}
                <div className="collapsible-container">{collapsibleBlocks}</div>
            </div>
        </div>
    );
}
