import React, { useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
import { frmtNb, convTime } from '../fct.js';
import TradesTooltip from './TradesTooltip.jsx';
import createSetCompoTable from './compoTable.js';
import { selectCurrentProjection } from '../utils/farmState.js';
import DailyProfitTooltipDetails from './DailyProfitTooltipDetails.jsx';
import FishCostTooltipDetails from './FishCostTooltipDetails.jsx';
import FetchCostTooltipDetails from './FetchCostTooltipDetails.jsx';
import CrustaceanCostTooltipDetails from './CrustaceanCostTooltipDetails.jsx';
import MarketComparisonTooltipDetails from './MarketComparisonTooltipDetails.jsx';
import DeliveryCostTooltipDetails from './DeliveryCostTooltipDetails.jsx';
import DeliveryBountyCostTooltipDetails from './DeliveryBountyCostTooltipDetails.jsx';
import DeliveryRatioTooltipDetails from './DeliveryRatioTooltipDetails.jsx';
import ProductionCostTooltipDetails from './ProductionCostTooltipDetails.jsx';
import HarvestTooltipDetails from './HarvestTooltipDetails.jsx';
import AnimalUnitCostTooltipDetails from './AnimalUnitCostTooltipDetails.jsx';
import ItemCostTooltipDetails from './ItemCostTooltipDetails.jsx';
import { CropMachineDailyTooltipDetails, CropMachineGainTooltipDetails, CropMachineQueueTooltipDetails } from './CropMachineTooltipDetails.jsx';
import DigRatioTooltipDetails from './DigRatioTooltipDetails.jsx';
import { ActivityMaxTooltipDetails, ActivityXpTooltipDetails } from './ActivityTooltipDetails.jsx';
import DailyBurnTooltipDetails from './DailyBurnTooltipDetails.jsx';
import ChoreComponentsTooltipDetails from './ChoreComponentsTooltipDetails.jsx';
import GainHTooltipDetails from './GainHTooltipDetails.jsx';
import BalanceTooltipDetails from './BalanceTooltipDetails.jsx';
import SupplyTooltipDetails from './SupplyTooltipDetails.jsx';
import BuildCraftTooltipDetails from './BuildCraftTooltipDetails.jsx';
import CookCostTooltipDetails from './CookCostTooltipDetails.jsx';
import BoostTooltipDetails from './BoostTooltipDetails.jsx';
import RngRealizedTooltipDetails from './RngRealizedTooltipDetails.jsx';
import RngItemSummaryTooltipDetails from './RngItemSummaryTooltipDetails.jsx';
import {
    imgna,
    imgcoins as imgcoinsSrc,
    imggem as imggemSrc,
    imgSFL,
    imgCoins,
    imgmix,
    imgomni,
    imgusdc,
    imgExchng,
    imglightning as imglightningSrc,
    imgmark as imgmarkSrc,
    imgpotionticket as imgpotionticketSrc,
    imgkeytreasure as imgkeytreasureSrc,
    imgkeyrare as imgkeyrareSrc,
    imgkeyluxury as imgkeyluxurySrc,
    imglovecharm as imglovecharmSrc,
    imgcheer as imgcheerSrc,
    imgchkn,
    imgcow,
    imgsheep,
    imgcrop,
    imgbeehive,
    imgflowerbed,
    imgappleTree,
    imgwood,
    imgstone,
    imgironSmall,
    imggoldSmall,
    imgcrimstoneRock5,
    imgsunstoneRock1,
    imgoil,
    imglavaPit,
    imggreenhousePot,
    imgl2StoneRock,
    imgl3StoneRock,
    imgl2IronRock,
    imgl3IronRock,
    imgl2GoldRock,
    imgl3GoldRock,
    imgoilReserveFull,
    imgwinter,
    imgspring,
    imgsummer,
    imgautumn,
    imgsaltfarm,
    imgsummerBasicAncientTree,
    imgsummerBasicSacredTree,
    imgtentacle,
} from '../constants/images.js';

const isObj = (val) => !!val && typeof val === "object" && !Array.isArray(val);

const mergeRows = (base, next) => {
    if (isObj(base) && isObj(next)) {
        return { ...base, ...next };
    }
    return next !== undefined ? next : base;
};

const mergeRootTables = (...roots) => {
    const out = {};
    roots.forEach((root) => {
        if (!isObj(root)) return;
        Object.entries(root).forEach(([tableName, table]) => {
            if (!isObj(table)) {
                out[tableName] = table;
                return;
            }
            const prevTable = isObj(out[tableName]) ? out[tableName] : {};
            const nextTable = { ...prevTable };
            Object.entries(table).forEach(([rowName, row]) => {
                nextTable[rowName] = mergeRows(prevTable[rowName], row);
            });
            out[tableName] = nextTable;
        });
    });
    return out;
};

const Tooltip = ({ onClose, item, context, value, clickPosition, dataSet, dataSetFarm, bdrag = true, forTry }) => {
    const invPageData = selectCurrentProjection(dataSetFarm, "invData") || {};
    const cookPageData = selectCurrentProjection(dataSetFarm, "cookData") || {};
    const mapPageData = selectCurrentProjection(dataSetFarm, "mapData") || {};
    const fishPageData = selectCurrentProjection(dataSetFarm, "fishData") || {};
    const bountyPageData = selectCurrentProjection(dataSetFarm, "bountyData") || {};
    const deliveryPageData = selectCurrentProjection(dataSetFarm, "deliveryData") || {};
    const petPageData = selectCurrentProjection(dataSetFarm, "petData") || {};
    const animalPageData = selectCurrentProjection(dataSetFarm, "animalData") || {};
    const craftPageData = selectCurrentProjection(dataSetFarm, "craftData") || {};
    const flowerPageData = selectCurrentProjection(dataSetFarm, "flowerData") || {};
    const expandPageData = selectCurrentProjection(dataSetFarm, "expandPageData") || {};
    const cropMachinePageData = selectCurrentProjection(dataSetFarm, "cropMachineData") || {};
    const tryNftPageData = selectCurrentProjection(dataSetFarm, "tryNftData") || {};
    const Animals = dataSetFarm?.Animals || invPageData?.tooltipData?.Animals || {};
    const invTooltipData = invPageData?.tooltipData || {};
    const cookTooltipData = cookPageData?.tooltipData || {};
    const mapTooltipData = mapPageData?.tooltipData || {};
    const tooltipDataBlocks = [
        invTooltipData,
        cookTooltipData,
        mapTooltipData,
        fishPageData?.tooltipData,
        bountyPageData?.tooltipData,
        deliveryPageData?.tooltipData,
        petPageData?.tooltipData,
        animalPageData?.tooltipData,
        craftPageData?.tooltipData,
        flowerPageData?.tooltipData,
        expandPageData?.tooltipData,
        tryNftPageData?.tooltipData,
    ].filter(isObj);
    const dailyProfitTooltips = Object.assign(
        {},
        ...tooltipDataBlocks.map((block) => isObj(block?.dailyProfit) ? block.dailyProfit : {})
    );
    const crustaceanCostTooltips = Object.assign(
        {},
        ...tooltipDataBlocks.map((block) => isObj(block?.crustaceanCosts) ? block.crustaceanCosts : {})
    );
    const costBreakdownTooltips = Object.assign(
        {},
        ...tooltipDataBlocks.map((block) => isObj(block?.costBreakdowns) ? block.costBreakdowns : {})
    );
    const shrineCostTooltips = Object.assign(
        {},
        ...tooltipDataBlocks.map((block) => isObj(block?.shrineCosts) ? block.shrineCosts : {})
    );
    const fishCostTooltips = Object.assign(
        {},
        ...tooltipDataBlocks.map((block) => isObj(block?.fishCosts) ? block.fishCosts : {})
    );
    const marketComparisonBlocks = tooltipDataBlocks
        .map((block) => block?.marketComparisons)
        .filter(isObj);
    const marketComparisonItems = Object.assign(
        {},
        ...marketComparisonBlocks.map((block) => isObj(block?.items) ? block.items : {})
    );
    const marketComparisonMeta = marketComparisonBlocks.find((block) => isObj(block?._meta))?._meta || {};
    const productionCostBlocks = tooltipDataBlocks.map((block) => block?.productionCosts).filter(isObj);
    const productionCostTooltips = Object.assign(
        {},
        ...productionCostBlocks.map((block) => isObj(block?.items) ? block.items : {})
    );
    const productionCostMeta = productionCostBlocks.find((block) => isObj(block?._meta))?._meta || {};
    const getProductionCostContract = (itemName) => {
        const entry = productionCostTooltips?.[itemName];
        const mode = entry?.[ForTry ? "try" : "active"];
        return mode ? { ...entry.shared, ...mode, taxPercent: productionCostMeta.taxPercent } : null;
    };
    const getFeedCostContract = (foodName) => tooltipDataBlocks
        .map((block) => block?.feedCosts?.[ForTry ? "try" : "active"]?.[foodName])
        .find(isObj) || null;
    const mergeTooltipRoot = (rootKey) => mergeRootTables(...tooltipDataBlocks.map((block) => block?.[rootKey]));
    const tooltipItables = mergeRootTables(
        cropMachinePageData?.itables,
        invPageData?.itables,
        cookPageData?.itables,
        mapPageData?.itables,
        fishPageData?.itables,
        bountyPageData?.itables,
        deliveryPageData?.itables,
        craftPageData?.itables,
        flowerPageData?.itables,
        expandPageData?.itables,
        mergeTooltipRoot("itables"),
        dataSetFarm?.itables,
    );
    const tooltipBoostables = mergeRootTables(
        invPageData?.boostables,
        cookPageData?.boostables,
        mapPageData?.boostables,
        mergeTooltipRoot("boostables"),
        dataSetFarm?.boostables,
    );
    const {
        it = {},
        food = {},
        pfood = {},
        flower = {},
        fish = {},
        buildng = {},
        craft = {},
        tool = {},
        bounty = {},
        petit = {},
        compost = {},
        crustacean = {},
        mutant = {},
    } = tooltipItables || {};
    const {
        shrine = {},
    } = tooltipBoostables || {};
    const imgsfl = imgSFL;
    const imgcoins = imgCoins;
    const { coinsRatio } = dataSet.options;
    const tktName = dataSetFarm?.constants?.tktName || dataSet?.tktName || 'Tickets';
    const ForTry = forTry;
    let sflortry = ForTry ? "sfltry" : "sfl";
    function key(name) {
        if (name === "isactive") { return ForTry ? "tryit" : "isactive"; }
        return ForTry ? name + "try" : name;
    }
    const imggem = <img src={imggemSrc} style={{ width: "15px", height: "15px" }} />
    const imgmark = <img src={imgmarkSrc} style={{ width: "15px", height: "15px" }} />
    const imgpotionticket = <img src={imgpotionticketSrc} style={{ width: "20px", height: "15px" }} />
    const imgkeytreasure = <img src={imgkeytreasureSrc} style={{ width: "15px", height: "15px" }} />
    const imgkeyrare = <img src={imgkeyrareSrc} style={{ width: "15px", height: "15px" }} />
    const imgkeyluxury = <img src={imgkeyluxurySrc} style={{ width: "15px", height: "15px" }} />
    const imglovecharm = <img src={imglovecharmSrc} style={{ width: "20px", height: "15px" }} />
    const imgcheer = <img src={imgcheerSrc} style={{ width: "20px", height: "15px" }} />
    const imgusdcIcon = <img src={imgusdc} style={{ width: "15px", height: "15px" }} />
    const imgmp = <img src={imgExchng?.props?.src} style={{ width: "15px", height: "15px" }} />
    const Item =
        it?.[item] ||
        food?.[item] ||
        pfood?.[item] ||
        fish?.[item] ||
        flower?.[item] ||
        bounty?.[item] ||
        crustacean?.[item] ||
        craft?.[item] ||
        tool?.[item] ||
        compost?.[item] ||
        petit?.[item] ||
        {};
    const tradeTax = (100 - dataSet.options.tradeTax) / 100;
    let txt = "";
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [justOpened, setJustOpened] = useState(true);
    const [pos, setPos] = useState({ x: (clickPosition?.x ?? 200) - 100, y: (clickPosition?.y ?? 200) - 100 });
    //const [pos, setPos] = useState({ x: 200, y: 200 });
    const [dragging, setDragging] = useState(false);
    const offset = useRef({ x: 0, y: 0 });
    const margin = 0;
    const tooltipRef = useRef(null);
    const wrapperRef = useRef(null);
    const [tooltipSize, setTooltipSize] = useState({ w: 0, h: 0 });
    const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
    const [compoExpanded, setCompoExpanded] = useState({});
    const [compoClosing, setCompoClosing] = useState({});
    const compoCloseTimersRef = useRef({});
    const seasonButtons = [
        { key: "spring", title: "Spring", icon: imgspring.props?.src },
        { key: "summer", title: "Summer", icon: imgsummer.props?.src },
        { key: "autumn", title: "Autumn", icon: imgautumn.props?.src },
        { key: "winter", title: "Winter", icon: imgwinter.props?.src },
    ];
    const initialTooltipSeason = String(
        cookPageData?.meta?.curSeason ||
        tryNftPageData?.meta?.curSeason ||
        dataSetFarm?.curSeason ||
        "spring"
    ).toLowerCase();
    const [tooltipSeason, setTooltipSeason] = useState(initialTooltipSeason);

    const handleBackdropDown = (e) => {
        if (e.target === wrapperRef.current) startClose();
    };
    const getClientPos = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };
    const readTooltipSize = () => {
        const el = tooltipRef.current;
        if (!el) return { w: 0, h: 0 };
        return { w: el.offsetWidth || 0, h: el.offsetHeight || 0 };
    };
    useLayoutEffect(() => {
        if (!isOpen || isClosing) return;
        const tEl = tooltipRef.current;
        const readContainer = () => {
            setContainerSize({ w: window.innerWidth, h: window.innerHeight });
        };
        const readTooltip = () => {
            setTooltipSize(readTooltipSize());
        };
        readContainer();
        requestAnimationFrame(readTooltip);
        const ro = new ResizeObserver(() => {
            readContainer();
            requestAnimationFrame(readTooltip);
        });
        if (tEl) ro.observe(tEl);
        window.addEventListener("resize", readContainer);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", readContainer);
        };
    }, [isOpen]);
    const clamp = (x, y) => {
        const maxX = Math.max(margin, (containerSize.w || 0) - (tooltipSize.w || 0) - margin);
        const maxY = Math.max(margin, (containerSize.h || 0) - (tooltipSize.h || 0) - margin);
        return {
            x: Math.min(Math.max(x, margin), maxX),
            y: Math.min(Math.max(y, margin), maxY),
        };
    };
    const safeClamp = (x, y) => {
        if (!tooltipSize.w || !tooltipSize.h || !containerSize.w || !containerSize.h) {
            return { x, y };
        }
        return clamp(x, y);
    };
    const handleMouseDown = (e) => {
        const { x, y } = getClientPos(e);
        setDragging(!!bdrag);
        offset.current = { x: x - pos.x, y: y - pos.y };
    };
    const isDeliveryTooltip = context === "deliverycost" || context === "deliverybountycost";
    const deliveryDragHandleProps = bdrag ? {
        onMouseDown: (e) => {
            e.stopPropagation();
            handleMouseDown(e);
        },
    } : {};
    const handleMouseMove = (e) => {
        if (!dragging) return;
        const { x, y } = getClientPos(e);
        const nx = x - offset.current.x;
        const ny = y - offset.current.y;
        setPos(clamp(nx, ny));
    };
    const handleMouseUp = () => setDragging(false);
    const { x: sx, y: sy } = useMemo(() => clamp(pos.x, pos.y), [pos, containerSize, tooltipSize]);
    const openTooltip = () => {
        setIsClosing(false);
        setIsOpen(true);
    };
    const startClose = () => {
        setIsClosing(true);
    };
    const closeModal = () => {
        setIsOpen(false);
        setTimeout(onClose, 300);
    };
    const handleClickOutside = (event) => {
        if (justOpened) return;
        if (!event.target.closest(".tooltip")) {
            closeModal();
        }
    };
    useEffect(() => {
        const timer = setTimeout(() => {
            setJustOpened(false);
        }, 200);
        return () => clearTimeout(timer);
    }, []);
    useEffect(() => {
        setTimeout(() => {
            //setPos({ x: "50%", y: "50%" });
            openTooltip();
        }, 50);
    }, []);
    useEffect(() => {
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, [justOpened]);
    useEffect(() => {
        if (!isOpen || !justOpened) return;
        const dx = (tooltipSize.w || 0) / 2;
        const dy = (tooltipSize.h || 0) / 2;
        const desiredX = (clickPosition?.x ?? 0) - dx;
        const desiredY = (clickPosition?.y ?? 0) - dy;
        setPos(safeClamp(desiredX, desiredY));
        setJustOpened(false);
    }, [
        isOpen,
        clickPosition?.x,
        clickPosition?.y,
        tooltipSize.w,
        tooltipSize.h,
        containerSize.w,
        containerSize.h,
    ]);
    useEffect(() => {
        const el = tooltipRef.current;
        if (!el) return;
        const onEnd = (e) => {
            if (!isClosing) return;
            if (e.propertyName !== "transform" && e.propertyName !== "opacity") return;
            setIsOpen(false);
            setIsClosing(false);
            onClose?.();
        };
        el.addEventListener("transitionend", onEnd);
        return () => el.removeEventListener("transitionend", onEnd);
    }, [isClosing, onClose]);
    useEffect(() => {
        if (!bdrag) return;
        if (dragging) document.body.classList.add("no-select");
        else document.body.classList.remove("no-select");
        return () => document.body.classList.remove("no-select");
    }, [dragging, bdrag]);
    useEffect(() => {
        return () => {
            Object.values(compoCloseTimersRef.current).forEach((id) => clearTimeout(id));
            compoCloseTimersRef.current = {};
        };
    }, []);
    let ToolTStyle = {
        position: "fixed",
        left: `${sx}px`,
        top: `${sy}px`,
        cursor: bdrag ? (dragging ? "grabbing" : "grab") : "default",
        touchAction: bdrag ? "none" : "auto",
        willChange: "transform,left,top",
    };
    if (!bdrag) {
        ToolTStyle = {
            position: "fixed",
            left: `${sx}px`,
            top: `${sy}px`,
            cursor: "default",
            touchAction: "auto",
            WebkitUserSelect: "text",
            userSelect: "text",
            WebkitTouchCallout: "default",
        };
    }

    const setCompoTable = createSetCompoTable({
        ForTry,
        keyFn: key,
        dataSet,
        currentItem: Item,
        tables: { it, fish, bounty, flower, craft, petit, crustacean, tool, pfood, food },
        shrine,
        sflortry,
        assets: { imgna, imgmix, imgmp, imgsfl },
        compoState: {
            compoExpanded,
            setCompoExpanded,
            compoClosing,
            setCompoClosing,
            compoCloseTimersRef,
        },
    });
    const renderSeasonButtons = (activeSeason) => (
        <div style={{ display: "flex", gap: 6, marginTop: 6, marginBottom: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {seasonButtons.map((season) => {
                const isActive = activeSeason === season.key;
                return (
                    <button
                        key={season.key}
                        type="button"
                        onClick={() => setTooltipSeason(season.key)}
                        title={season.title}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 28,
                            height: 28,
                            padding: 0,
                            borderRadius: 6,
                            border: isActive ? "1px solid rgb(255, 208, 120)" : "1px solid rgba(255, 255, 255, 0.2)",
                            background: isActive ? "rgba(255, 196, 92, 0.2)" : "rgba(20, 8, 8, 0.85)",
                            boxShadow: isActive ? "0 0 10px rgba(255, 196, 92, 0.18)" : "none",
                            cursor: "pointer",
                        }}
                    >
                        <img src={season.icon} alt={season.title} style={{ width: 18, height: 18 }} />
                    </button>
                );
            })}
        </div>
    );

    try {
        {
            if (context === "costp") {
                const productionContract = getProductionCostContract(item);
                txt = productionContract ? (
                    <ProductionCostTooltipDetails
                        contract={productionContract}
                        itemName={item}
                        isPurchased={!!productionContract.isPurchased}
                        setCompoTable={setCompoTable}
                        icons={{
                            fallback: imgna,
                            coins: imgcoins,
                            flower: imgsfl,
                            market: imgmp,
                            oil: productionContract.oilImage || imgna,
                            mix: imgmix,
                            omni: imgomni,
                            seasons: { winter: imgwinter, spring: imgspring, summer: imgsummer, autumn: imgautumn },
                            nodes: {
                                fallback: imgna, greenhouse: imggreenhousePot, crop: imgcrop, wood: imgwood,
                                stone: imgstone, iron: imgironSmall, gold: imggoldSmall, crimstone: imgcrimstoneRock5,
                                sunstone: imgsunstoneRock1, salt: imgsaltfarm, obsidian: imglavaPit, oil: imgoilReserveFull,
                                fruit: imgappleTree, honey: imgbeehive, flower: imgflowerbed,
                                chicken: imgchkn, cow: imgcow, sheep: imgsheep,
                            },
                        }}
                    />
                ) : (
                    <div>Production cost details unavailable. Refresh this page to load the current calculation.</div>
                );
            }
            if (context === "harvest") {
                const harvestContract = getProductionCostContract(item);
                txt = harvestContract ? (
                    <HarvestTooltipDetails
                        contract={harvestContract}
                        itemName={item}
                        growing={Number(value) > 0}
                        isPurchased={!!harvestContract.isPurchased}
                        icons={{
                            fallback: imgna,
                            coins: imgcoins,
                            flower: imgsfl,
                            market: imgmp,
                            oil: harvestContract.oilImage || imgna,
                            mix: imgmix,
                            omni: imgomni,
                            nodes: {
                                fallback: imgna, greenhouse: imggreenhousePot, crop: imgcrop, wood: imgwood,
                                stone: imgstone, iron: imgironSmall, gold: imggoldSmall, crimstone: imgcrimstoneRock5,
                                sunstone: imgsunstoneRock1, salt: imgsaltfarm, obsidian: imglavaPit, oil: imgoilReserveFull,
                                fruit: imgappleTree, honey: imgbeehive, flower: imgflowerbed,
                                chicken: imgchkn, cow: imgcow, sheep: imgsheep,
                            },
                            secondaryNodes: {
                                wood: { secondary: imgsummerBasicAncientTree, tertiary: imgsummerBasicSacredTree },
                                stone: { secondary: imgl2StoneRock, tertiary: imgl3StoneRock },
                                iron: { secondary: imgl2IronRock, tertiary: imgl3IronRock },
                                gold: { secondary: imgl2GoldRock, tertiary: imgl3GoldRock },
                            },
                        }}
                    />
                ) : (
                    <div>Harvest details unavailable. Refresh this page to load the current calculation.</div>
                );
            }
            if (context === "dailysfl") {
                const dailyEntry = dailyProfitTooltips?.[item];
                const dailyMode = dailyEntry?.[ForTry ? "try" : "active"];
                const backendDaily = dailyMode ? { ...(dailyEntry?.shared || {}), ...dailyMode } : null;
                txt = isObj(backendDaily) ? (
                    <DailyProfitTooltipDetails
                        contract={backendDaily}
                        itemName={item}
                        icons={{ fallback: imgna, coins: imgcoins, flower: imgsfl, market: imgmp, gem: imggem }}
                    />
                ) : (
                    <div>Daily Profit details unavailable. Refresh this page to load the current calculation.</div>
                );
            }
            if (context === "cmdailysfl") {
                txt = <CropMachineDailyTooltipDetails
                    contract={(value && typeof value === "object") ? value : {}}
                    itemName={item}
                    icons={{ fallback: imgna, oil: value?.oilImage || imgna, flower: imgsfl, market: imgmp, gem: imggem }}
                />;
            }
            if (context === "cmgainh") {
                txt = <CropMachineGainTooltipDetails
                    contract={(value && typeof value === "object") ? value : {}}
                    itemName={item}
                    icons={{ fallback: imgna, flower: imgsfl, market: imgmp }}
                />;
            }
        }
        if (context === "homecmdailyqueue") {
            txt = <CropMachineQueueTooltipDetails
                contract={(value && typeof value === "object") ? value : {}}
                itemName={item}
                icons={{ fallback: imgna, flower: imgsfl }}
            />;
        }
        if (context === "costitem") {
            txt = <ItemCostTooltipDetails
                contract={(value && typeof value === "object") ? value : {}}
                season={tooltipSeason}
                renderSeasonButtons={renderSeasonButtons}
                setCompoTable={setCompoTable}
                icons={{ fallback: imgna, flower: imgsfl, market: imgmp }}
            />;
        }
        if (context === "animalcostu") {
            const animalContract = (value && typeof value === "object") ? value : {};
            const normalizedFoodName = animalContract.foodName === "Mix Food" ? "Mix" : animalContract.foodName;
            txt = <AnimalUnitCostTooltipDetails
                contract={animalContract}
                feedCostContract={getFeedCostContract(normalizedFoodName)}
                setCompoTable={setCompoTable}
                icons={{
                    fallback: imgna,
                    mix: imgmix,
                    omni: imgomni,
                    animals: { Chicken: imgchkn, Cow: imgcow, Sheep: imgsheep },
                    flower: imgsfl,
                    market: imgmp,
                }}
            />;
        }
        if (context === "buildcraft") {
            txt = <BuildCraftTooltipDetails contract={value} fallbackImage={imgna} />;
        }
        if (context === "th") {
            if (item === "quantity") {
                txt = (
                    <><div>Farm : how much you have in your farm</div>
                        <div>Daily : how much you can make daily</div>
                        <div>Restock : how much you can make by restock</div>
                        <div>Custom : you can change quantity to see total prices as you want</div>
                    </>
                );
            }
            if (item === "cost") {
                txt = (
                    <><div>Your production cost</div>
                        <div>/Unit : by unit</div>
                        <div>/Quantity : total by quantity</div>
                        <div>Checkbox : subtract production costs from price totals</div>
                    </>
                );
            }
            if (item === "withdraw") {
                txt = (
                    <><div>How much you can withdraw</div>
                    </>
                );
            }
            if (item === "coef") {
                txt = (
                    <><div>Sell price / Prod price</div>
                    </>
                );
            }
            if (item === "diff") {
                txt = (
                    <><div>% difference with Market price</div>
                    </>
                );
            }
            if (item === "time") {
                txt = (
                    <>
                        <div>Shows the effective production time after boosts.</div>
                        <div>Click a Time value to see the detailed boost breakdown.</div>
                    </>
                );
            }
            if (item === "yield") {
                txt = (
                    <><div>Amount by node with your boosts</div>
                    </>
                );
            }
            if (item === "harvest") {
                txt = (
                    <><div>Amount average on all nodes with your boosts</div>
                    </>
                );
            }
            if (item === "toharvest") {
                txt = (
                    <><div>Amount on all nodes in your farm</div>
                    </>
                );
            }
            if (item === "gainh") {
                txt = (
                    <>
                        <div>Estimated gain per hour in continuous mode</div>
                        <div>Uses a 24/24 pace without stock, restock or farm-time limits</div>
                        <div>Click an item value for details</div>
                    </>
                );
            }
        }
        if (context === "gainh") {
            txt = value ? <GainHTooltipDetails contract={value} icons={{ fallback: imgna, flower: imgsfl }} />
                : <div>Hourly details unavailable. Refresh this page to load the current calculation.</div>;
        }
        if (context === "boostdetails") {
            txt = <BoostTooltipDetails contract={value} fallbackImage={imgna} />;
        }
        if (context === "rngrealized") {
            txt = <RngRealizedTooltipDetails contract={value} fallbackImage={imgna} />;
        }
        if (context === "rngsummary") {
            txt = <RngItemSummaryTooltipDetails contract={value} fallbackImage={imgna} />;
        }
        if (context === "trynfthelp") {
            txt = (
                <>
                    <div>The Active items are on your farm.</div>
                    <div>Select NFT/Craft/Skills/Buds you want on Try checkboxes</div>
                    <div>and clic Refresh button to see changes.</div>
                    <div>Then on main page you can switch Activeset/Tryset to see differences</div>
                </>
            );
        }
        if (context === "trynftsupply") {
            txt = <SupplyTooltipDetails contract={value} fallbackImage={imgna} />;
        }
        if (context === "trades") {
            txt = <TradesTooltip contract={(value && typeof value === "object") ? value : null} />;
        }
        if (context === "balance") {
            txt = value ? <BalanceTooltipDetails contract={value} icons={{
                gem: imggem, flower: imgsfl, mark: imgmark, loveCharm: imglovecharm, cheer: imgcheer,
                potionTicket: imgpotionticket, treasureKey: imgkeytreasure, rareKey: imgkeyrare,
                luxuryKey: imgkeyluxury, usd: imgusdcIcon,
            }} /> : <div>Balance details unavailable. Refresh the farm to load the current calculation.</div>;
        }
        if (context === "cookcost") {
            const requestedQty = Number((value && typeof value === "object") ? (value.qty ?? 1) : value) || 1;
            const cookContracts = (Array.isArray(item) ? item : [item]).filter(Boolean).map((cookItem) => {
                const entry = costBreakdownTooltips?.[cookItem];
                return {
                    itemName: cookItem,
                    ...(entry?.shared || {}),
                    ...(entry?.[ForTry ? "try" : "active"] || {}),
                };
            });
            txt = <CookCostTooltipDetails
                contracts={cookContracts}
                quantity={requestedQty}
                season={tooltipSeason}
                initialSeason={initialTooltipSeason}
                renderSeasonButtons={renderSeasonButtons}
                setCompoTable={setCompoTable}
                fallbackImage={imgna}
            />;
        }
        if (context === "shrinecost") {
            const shrineContract = shrineCostTooltips?.[item]?.[ForTry ? "try" : "active"];
            txt = shrineContract?.costTree
                ? setCompoTable(item, Number(value ?? 1) || 1, {
                    costTree: shrineContract.costTree,
                    img: shrineContract.itemImage || imgna,
                    label: item,
                }).table
                : <div>Shrine cost details unavailable. Refresh this page to load the current calculation.</div>;
        }
        if (context === "crustaceancost") {
            const qty = Number(value ?? 1) || 1;
            const mode = ForTry ? "try" : "active";
            const crustaceanContract = crustaceanCostTooltips?.[item]?.[mode];
            const sharedRod = fishCostTooltips?._shared?.[mode];
            const costContract = crustaceanContract || (item === "Rod" && sharedRod?.rodCostTree ? {
                itemImage: sharedRod.rodImage,
                costTree: sharedRod.rodCostTree,
                yield: 1,
            } : null);
            txt = costContract ? (
                <CrustaceanCostTooltipDetails
                    contract={costContract}
                    itemName={item}
                    quantity={qty}
                    setCompoTable={setCompoTable}
                    fallbackImage={imgna}
                />
            ) : (
                <div>Cost details unavailable. Refresh this page to load the current calculation.</div>
            );
        }
        if (context === "fishcost") {
            const v = (value && typeof value === "object") ? value : {};
            const fishContract = fishCostTooltips?.[item]?.[ForTry ? "try" : "active"];
            const sharedFishContract = fishCostTooltips?._shared?.[ForTry ? "try" : "active"];
            txt = fishContract ? (
                <FishCostTooltipDetails
                    contract={fishContract}
                    sharedContract={sharedFishContract}
                    itemName={item}
                    quantity={Number(v.qty ?? value ?? 1) || 1}
                    includeChum={!!(v.includeChum ?? fishContract.includeChumByDefault)}
                    setCompoTable={setCompoTable}
                    icons={{ fallback: imgna, flower: imgsfl, market: imgmp }}
                />
            ) : (
                <div>Fish cost details unavailable. Refresh this page to load the current calculation.</div>
            );
        }
        if (context === "market") {
            const marketEntry = marketComparisonItems?.[item];
            const marketMode = marketEntry?.[ForTry ? "try" : "active"];
            const marketContract = marketMode ? { ...marketEntry.shared, ...marketMode } : null;
            txt = marketContract ? (
                <MarketComparisonTooltipDetails
                    contract={marketContract}
                    taxPercent={marketComparisonMeta.taxPercent}
                    itemName={item}
                    quantity={Number(value?.itemQuant || 1)}
                    includeProductionCost={!!value?.CostChecked}
                    icons={{ fallback: imgna, market: imgmp, flower: imgsfl }}
                />
            ) : (
                <div>Marketplace details unavailable. Refresh this page to load the current calculation.</div>
            );
        }
        if (context === "craftcompo") {
            const craftEntry = costBreakdownTooltips?.[item];
            const craftMode = craftEntry?.[ForTry ? "try" : "active"];
            txt = craftMode?.costTree ? <ItemCostTooltipDetails
                contract={{
                    itemName: item,
                    itemImage: craftEntry?.shared?.itemImage || imgna,
                    quantity: 1,
                    costTree: craftMode.costTree,
                }}
                season={tooltipSeason}
                renderSeasonButtons={renderSeasonButtons}
                setCompoTable={setCompoTable}
                icons={{ fallback: imgna, flower: imgsfl, market: imgmp }}
            /> : <div>Craft composition unavailable. Refresh this page to load the current calculation.</div>;
        }
        if (context === "ratiodig" || context === "ratiodigp") {
            txt = <DigRatioTooltipDetails
                contract={(value && typeof value === "object") ? value : null}
                isPattern={context === "ratiodigp"}
                icons={{ fallback: imgna, coins: imgcoins, flower: imgsfl }}
            />;
        }
        if (context === "fetchcost") {
            txt = <FetchCostTooltipDetails
                contract={(value && typeof value === "object") ? value : {}}
                itemName={item}
                icons={{ fallback: imgna, energy: imglightningSrc, flower: imgsfl, market: imgmp }}
            />;
        }
        if (context === "deliverycost") {
            txt = <DeliveryCostTooltipDetails
                contract={(value && typeof value === "object") ? value : {}}
                icons={{ fallback: imgna, market: imgExchng }}
                dragHandleProps={deliveryDragHandleProps}
            />;
        }
        if (context === "deliverybountycost") {
            txt = <DeliveryBountyCostTooltipDetails
                contract={(value && typeof value === "object") ? value : {}}
                ticketName={tktName}
                icons={{ fallback: imgna, market: imgExchng }}
                dragHandleProps={deliveryDragHandleProps}
            />;
        }
        if (context === "deliveryratio") {
            txt = <DeliveryRatioTooltipDetails
                contract={(value && typeof value === "object") ? value : {}}
                itemName={item}
                icons={{ coins: imgcoins, flower: imgsfl, market: imgExchng }}
            />;
        }
        if (context === "username") {
            const username = dataSet?.options?.username || "No Name";
            const farmId = dataSet?.options?.farmId || "Unknown";
            txt = <><div>{`User: ${username}`}</div>
                <div>{`farm ID: ${farmId}`}</div></>;
        }
        if (context === "activitymax") {
            txt = <ActivityMaxTooltipDetails contract={value} fallbackDate={item} dragHandleProps={deliveryDragHandleProps} />;
        }
        if (context === "activityxp") {
            txt = <ActivityXpTooltipDetails contract={value} fallbackDate={item} fallbackImage={imgna} dragHandleProps={deliveryDragHandleProps} />;
        }
        if (context === "totChoreComp") {
            txt = <ChoreComponentsTooltipDetails contract={value} icons={{ fallback: imgna, market: imgExchng }} />;
        }
        if (context === "askIA") {
            if (value) {
                const formatIAAnswerJSX = (answer) => {
                    if (!answer) return null;
                    const parts = answer
                        .replace(/\\n/g, "\n")
                        .split(/(<[^>]+>)/g); // garde les <Item>
                    return parts.map((part, index) => {
                        const match = part.match(/^<(.+)>$/);
                        if (match) {
                            const itemName = match[1];
                            const item = it?.[itemName];
                            const img = item?.img || item?.icon || null;
                            return (
                                <span key={index} style={{ whiteSpace: "nowrap" }}>
                                    {img && (<img src={img} alt={itemName} title={itemName}
                                        style={{ width: 16, height: 16, verticalAlign: "middle", marginRight: 4 }} />)}{itemName} </span>
                            );
                        }
                        return <span key={index}>{part}</span>;
                    });
                };
                const formatIAAnswerHTML = (answer) => {
                    return answer
                        .replace(/\\n/g, "\n")
                        .replace(/\*\*(.*?)\*\*/g, "🔹 $1")
                        .trim();
                };
                const textIA = formatIAAnswerJSX(value);
                //const username = dataSet?.options?.username || "No Name";
                //const farmId = dataSet?.options?.farmId || "Unknown";
                txt = <><pre style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{textIA}</pre></>;
            }
        }
        if (context === "dailyBurn") {
            txt = <DailyBurnTooltipDetails contract={value} />;
        }
    } catch (error) {
        console.log("tooltip: ", error);
    }

    const isEmptyTxt = txt === "" || txt === null || txt === undefined;
    useEffect(() => {
        if (isEmptyTxt) {
            closeModal();
        }
    }, [isEmptyTxt]);
    if (isEmptyTxt) {
        return null;
    }
    return (
        <div ref={wrapperRef}
            className={`tooltip-wrapper ${isOpen ? "open" : ""} ${isClosing ? "closing" : ""}`}
            onMouseDown={handleBackdropDown}
            onTouchStart={handleBackdropDown}
            onMouseMove={bdrag ? handleMouseMove : undefined}
            onTouchMove={bdrag ? handleMouseMove : undefined}
            onMouseUp={bdrag ? handleMouseUp : undefined}
            onTouchEnd={bdrag ? handleMouseUp : undefined}>
            <div ref={tooltipRef}
                className={`tooltip ${!bdrag ? "scrollable" : ""} ${context === "trades" ? "tooltip-trades-mode" : ""} ${(context === "deliverycost" || context === "deliverybountycost") ? "tooltip-delivery-mode" : ""} ${(context === "rngrealized" || context === "rngsummary") ? "tooltip-rng-mode" : ""}`}
                onMouseDown={(e) => {
                    e.stopPropagation();
                    if (!bdrag || isDeliveryTooltip) return;
                    handleMouseDown(e);
                }}
                onTouchStart={(e) => {
                    e.stopPropagation();
                    if (!bdrag || isDeliveryTooltip) return;
                    handleMouseDown(e);
                }}
                onDragStart={(e) => e.preventDefault()}
                style={ToolTStyle}
            /* style={{
                left: typeof pos.x === "number" ? `${pos.x}px` : pos.x,
                top: typeof pos.y === "number" ? `${pos.y}px` : pos.y,
            }}> */
            /* style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            }}> */
            >
                {txt}
            </div>
        </div>
    );
};

export default Tooltip;
