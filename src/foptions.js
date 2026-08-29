import React, { useEffect, useState, useRef, useMemo } from 'react';
import DropdownCheckbox from './listcol.js';
import DList from "./dlist.jsx";
import { FormControl, InputLabel, Select, MenuItem, Switch, FormControlLabel } from '@mui/material';
import { frmtNb } from './fct.js';
import { computeGemsRatio, getGemsPackUsd } from './gemsRatio.js';
import { promptInfo } from './promptW';
import { fetchJson } from './services/apiClient.js';
import {
    imgna, imgusdc, imgCoins, imgSFL, imgGem, imgoptions, imgcancel, imgrefresh, imgrdy,
    imgstoneRes, imgironOre, imggoldOre,
} from './constants/images.js';
import { ANIMAL_COST_ALLOCATION_OPTIONS } from './constants/animalCostAllocation.js';
import { buildToolBurnOptions, resolveToolBurnSelection } from './utils/toolBurnOptions.js';
import CoinEconomySummary from './components/CoinEconomySummary.jsx';

const imgusdcIcon = <img src={imgusdc} alt="USDC" style={{ width: "15px", height: "15px" }} />
const turtleResourceIcons = {
    gold: { src: imggoldOre, alt: "Gold" },
    iron: { src: imgironOre, alt: "Iron" },
    stone: { src: imgstoneRes, alt: "Stone" },
};

function renderTurtlePriority(order) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            {order.map((resource, index) => {
                const icon = turtleResourceIcons[resource];
                return (
                    <React.Fragment key={resource}>
                        {index > 0 ? <span aria-hidden="true">→</span> : null}
                        <img src={icon.src} alt={icon.alt} title={icon.alt} style={{ width: 17, height: 17, objectFit: "contain" }} />
                    </React.Fragment>
                );
            })}
        </span>
    );
}

const TURTLE_ALLOCATION_OPTIONS = [
    { value: 0, label: "Auto", searchText: "auto actual real optimized" },
    { value: 1, label: "Real placement", searchText: "real actual placement" },
    { value: 2, label: renderTurtlePriority(["gold", "iron", "stone"]), searchText: "gold iron stone" },
    { value: 3, label: renderTurtlePriority(["gold", "stone", "iron"]), searchText: "gold stone iron" },
    { value: 4, label: renderTurtlePriority(["iron", "gold", "stone"]), searchText: "iron gold stone" },
    { value: 5, label: renderTurtlePriority(["iron", "stone", "gold"]), searchText: "iron stone gold" },
    { value: 6, label: renderTurtlePriority(["stone", "gold", "iron"]), searchText: "stone gold iron" },
    { value: 7, label: renderTurtlePriority(["stone", "iron", "gold"]), searchText: "stone iron gold" },
];

function formatUsdLabel(value) {
    const num = Number(value) || 0;
    return num.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function renderGemPackOption(pack) {
    const usd = getGemsPackUsd(pack);
    const gemLabel = <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{pack}{imgGem}</span>;
    const usdLabel = <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{formatUsdLabel(usd)}{imgusdcIcon}</span>;
    return {
        value: pack,
        searchText: `${pack} gems ${usd} usdc`,
        label: gemLabel,
        labelEnd: usdLabel,
        triggerLabel: <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{gemLabel}{usdLabel}</span>,
    };
}

function ModalOptions({ onClose, dataSet, onOptionChange, API_URL, itemTable, toolTable, coinActivity, bestCoinRatio, isAbo }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState("general");
    const [justOpened, setJustOpened] = useState(true);
    const [notifTestBusy, setNotifTestBusy] = useState(false);
    const [tradeTax, setTradeTax] = useState(dataSet.tradeTax || "");
    const [gemsPack, setGemsPack] = useState(Number(dataSet.gemsPack || 7400));
    const [draftOptions, setDraftOptions] = useState(() => ({
        inputFarmTime: String(dataSet.inputFarmTime ?? 15),
        inputMaxBB: String(dataSet.inputMaxBB ?? 1),
        coinsRatio: String(dataSet.coinsRatio ?? 1000),
        animalLvl: { ...(dataSet.animalLvl || {}) },
    }));
    const toolBurnOptions = useMemo(
        () => buildToolBurnOptions(itemTable, toolTable),
        [itemTable, toolTable]
    );
    const selectedToolBurns = useMemo(
        () => resolveToolBurnSelection(dataSet.toolsBurnCraft, toolBurnOptions),
        [dataSet.toolsBurnCraft, toolBurnOptions]
    );
    //const [gemRatio, setGemRatio] = useState(dataSet.gemsRatio || "");
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const tooltipRef = useRef(null);
    const dragStartMouse = useRef({ x: 0, y: 0 });
    const dragStartOffset = useRef({ x: 0, y: 0 });
    const dragFrameRef = useRef(0);
    const dragLiveOffset = useRef({ x: 0, y: 0 });
    const getClientPos = (e) => {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };
    const isInteractive = (target) =>
        !!target.closest(
            'input, textarea, select, button, a, label, [role="button"], .MuiInputBase-root, .MuiButtonBase-root'
        );
    const handleMouseDown = (e) => {
        if (!e.target.closest(".options-modal__header") || isInteractive(e.target)) return;
        const { x, y } = getClientPos(e);
        dragStartMouse.current = { x, y };
        dragStartOffset.current = dragOffset;
        dragLiveOffset.current = dragOffset;
        setDragging(true);
    };
    const handleMouseMove = (e) => {
        if (!dragging) return;
        const { x, y } = getClientPos(e);
        dragLiveOffset.current = {
            x: dragStartOffset.current.x + (x - dragStartMouse.current.x),
            y: dragStartOffset.current.y + (y - dragStartMouse.current.y),
        }
        if (!dragFrameRef.current) {
            dragFrameRef.current = window.requestAnimationFrame(() => {
                dragFrameRef.current = 0;
                if (!tooltipRef.current) return;
                const { x: dx, y: dy } = dragLiveOffset.current;
                tooltipRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
            });
        }
    };
    const handleMouseUp = () => {
        if (dragFrameRef.current) {
            window.cancelAnimationFrame(dragFrameRef.current);
            dragFrameRef.current = 0;
        }
        setDragOffset(dragLiveOffset.current);
        setDragging(false);
    };
    const handleNotifHelpClick = async (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        await promptInfo(
            "Browser notifications:\nWork from a normal browser tab and are the easiest to start, but they can be less reliable depending on the browser.\nPWA notifications:\nUsually work a bit better because the site is installed like an app while still using web push.\nNative app notifications:\nUsually the most reliable option on Android because they use native mobile notifications.\nAndroid app GitHub:\nhttps://github.com/Oubia973/SunflowerManager",
            "Notifications",
            "Got it"
        );
    };

    const handleNotifTestClick = async (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (notifTestBusy) return;

        const farmId = String(dataSet?.farmId || "").trim();
        if (!farmId) {
            await promptInfo("No farm is selected right now.", "Notifications", "OK");
            return;
        }

        setNotifTestBusy(true);
        try {
            const payload = await fetchJson(API_URL, "/notif-test", {
                method: "POST",
                body: {
                    farmId,
                    deviceId: dataSet?.deviceId || "",
                },
            });
            await promptInfo(
                `Test notification sent immediately for ${payload.itemName || "a random item"}.`,
                "Notifications",
                "OK"
            );
        } catch (error) {
            console.error("Notif test error:", error);
            await promptInfo("Unable to send the notification test right now.", "Notifications", "OK");
        } finally {
            setNotifTestBusy(false);
        }
    };

    const closeModal = () => {
        setIsOpen(false);
        setTimeout(onClose, 300);
    };
    const handleDonClick = (address, element) => {
        if (!address) return;
        const textarea = document.createElement('textarea');
        textarea.value = address;
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        if (success) {
            const tooltip = document.createElement('div');
            tooltip.classList.add('tooltipfrmid');
            tooltip.textContent = address + ' copied !';
            const rect = element.getBoundingClientRect();
            tooltip.style.top = rect.top + 40 + 'px';
            tooltip.style.left = rect.left - 70 + 'px';
            document.body.appendChild(tooltip);
            setTimeout(() => {
                document.body.removeChild(tooltip);
            }, 2000);
            document.body.removeChild(textarea);
        }
    }
    const paymentWalletAddress = "0xAc3c7f9f1f8492Cc10A4fdb8C738DD82013d61dA";
    const paymentExplorerBaseUrl = "https://polygonscan.com";
    const paymentToken = "USDC";
    const resetTax = async () => {
        try {
            const requestData = {
                frmid: dataSet.farmId,
                username: dataSet.username,
            };
            const responseData = await fetchJson(API_URL, "/settax", {
                method: 'POST',
                body: requestData,
            });
            dataSet.tradeTax = responseData;
            setTradeTax(responseData);
        } catch (error) {
            if (error?.status === 429) {
                console.log('Too many requests, wait a few seconds');
            } else {
                console.log(`Error : ${error?.message || error}`);
            }
        }
    };

    const handleAnimalCostHelpClick = async (e) => {
        e?.preventDefault?.();
        e?.stopPropagation?.();
        await promptInfo(
            "Animals can produce two resources from the same feeding cycle. This setting decides how that single cycle cost is assigned to them.\n\nBy quantity: every produced unit receives the same cost. It is stable and independent of market prices.\n\nBy market value: the cycle cost is split according to each output's net market value. Market prices only determine the split; they do not change the total production cost. If no usable market value exists, the calculation falls back to quantity.\n\nFull cost per product: keeps the historical calculation by assigning the entire feeding cost to each product. This double-counts the cycle when both products are considered together.\n\nThe selected unit costs are also used by downstream production calculations, such as Leather or Wool used for Oil Drills.",
            "Animal production cost",
            "Got it"
        );
    };
    function handleChangeTradeTax(e) {
        setTradeTax(e.target.value);
    }
    const sanitizeNumber = (raw, { min = null, max = null, fallback = 0, allowDecimal = false } = {}) => {
        const cleaned = allowDecimal
            ? String(raw ?? "").replace(/[^0-9.]/g, "")
            : String(raw ?? "").replace(/\D/g, "");
        let xvalue = Number(cleaned);
        if (isNaN(xvalue)) xvalue = fallback;
        if (min !== null && xvalue < min) xvalue = min;
        if (max !== null && xvalue > max) xvalue = max;
        return xvalue;
    };
    const commitNumber = (name, raw, opts) => {
        const value = sanitizeNumber(raw, opts);
        onOptionChange({ target: { name, value } });
        return value;
    }
    function handleChangeGemRatio(e) {
        const gemPack = Number(e.target.value);
        setGemsPack(gemPack);
        dataSet.gemsPack = gemPack;
        const gemRatioValue = computeGemsRatio(gemPack, dataSet.usdSfl);
        dataSet.gemsRatio = gemRatioValue;
        onOptionChange({ target: { name: "GemsRatio", value: gemRatioValue } });
    }
    const handleClickOutside = (event) => {
        if (justOpened) return;
        if (!event.target.closest(".tooltip")) {
            //closeModal();
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
            setIsOpen(true);
        }, 50);
    }, []);
    useEffect(() => {
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
        };
    }, [justOpened]);
    useEffect(() => {
        //setTradeTax(dataSet.tradeTax || "");
    }, [dataSet]);
    useEffect(() => {
        setDraftOptions({
            inputFarmTime: String(dataSet.inputFarmTime ?? 15),
            inputMaxBB: String(dataSet.inputMaxBB ?? 1),
            coinsRatio: String(dataSet.coinsRatio ?? 1000),
            animalLvl: { ...(dataSet.animalLvl || {}) },
        });
        setTradeTax(dataSet.tradeTax ?? "");
        setGemsPack(Number(dataSet.gemsPack || 7400));
    }, [dataSet]);
    useEffect(() => {
        if (!dragging) return undefined;

        const onMouseMove = (event) => handleMouseMove(event);
        const onMouseUp = () => handleMouseUp();

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("touchmove", onMouseMove, { passive: false });
        window.addEventListener("touchend", onMouseUp);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("touchmove", onMouseMove);
            window.removeEventListener("touchend", onMouseUp);
        };
    }, [dragging]);
    return (
        <div
            className={`tooltip-wrapper options-modal-wrapper ${isOpen ? "open" : ""}`}
            onTouchEnd={handleMouseUp}>
            <div className="tooltip options-modal"
                ref={tooltipRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                style={{
                    position: "fixed",
                    left: "max(12px, calc(50% - 220px))",
                    top: "max(14px, 13dvh)",
                    transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
                    willChange: "transform",
                    touchAction: "none",
                    transition: dragging ? "none" : undefined,
                    cursor: dragging ? "grabbing" : "grab",
                }}
            >
                <header className="options-modal__header">
                    <div>
                        <strong>Preferences</strong>
                        <span>Customize calculations and alerts</span>
                    </div>
                    <button onClick={closeModal} className="button" aria-label="Close preferences"><img src={imgcancel} alt="" className="resico" /></button>
                </header>
                <nav className="options-modal__tabs" aria-label="Preference categories">
                    {[
                        ["general", "General"],
                        ["economy", "Economy"],
                        ["production", "Production"],
                        ["animals", "Animals"],
                        ["notifications", "Alerts"],
                    ].map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            className={activeSection === id ? "active" : ""}
                            onClick={() => setActiveSection(id)}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
                <div className="options-modal__content">
                <section className={`options-section ${activeSection === "general" ? "active" : ""}`}>
                    <h3>General</h3>
                <div><input type="checkbox" onChange={onOptionChange} checked={dataSet.autoRefresh !== false}
                    name={"autoRefresh"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Auto refresh tables</div>
                <div><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.checkPlacedEquiped || 0}
                    name={"checkPlacedEquiped"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Check boosts placed/equipped</div>
                <div><input type="number"
                    onChange={(e) => setDraftOptions(prev => ({ ...prev, inputFarmTime: e.target.value }))}
                    onBlur={(e) => {
                        const value = commitNumber("FarmTime", e.target.value, { min: 1, max: 24, fallback: 15 });
                        setDraftOptions(prev => ({ ...prev, inputFarmTime: String(value) }));
                    }}
                    value={draftOptions.inputFarmTime}
                    name={"FarmTime"} style={{ textAlign: "left", width: "45px" }} />Hours you can check your farm daily</div>
                <div><input type="number"
                    onChange={(e) => setDraftOptions(prev => ({ ...prev, inputMaxBB: e.target.value }))}
                    onBlur={(e) => {
                        const value = commitNumber("inputMaxBB", e.target.value, { min: 0, fallback: 1 });
                        setDraftOptions(prev => ({ ...prev, inputMaxBB: String(value) }));
                    }}
                    value={draftOptions.inputMaxBB}
                    name={"inputMaxBB"} style={{ textAlign: "left", width: "45px" }} />Restock daily</div>
                <div><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.autoRefill || 0}
                    name={"autoRefill"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Auto restock by time
                    {/* <input type="checkbox" onChange={onOptionChange} checked={!!dataSet.showRestockCost || 0}
                        name={"showRestockCost"} style={{ width: "18px", height: "18px", marginRight: 6 }} />show in tooltip */}
                </div>
                <div><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.restockCostDaily || 0}
                    name={"restockCostDaily"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Restock counted in daily</div>
                <div><input type="checkbox" onChange={onOptionChange} checked={dataSet.averageDailyCycles !== false}
                    name={"averageDailyCycles"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Daily cycles average when more than 24h</div>
                </section>
                <section className={`options-section ${activeSection === "economy" ? "active" : ""}`}>
                    <h3>Economy</h3>
                <div className="options-coin-ratio-setting"><input type="number"
                    onChange={(e) => setDraftOptions(prev => ({ ...prev, coinsRatio: e.target.value }))}
                    onBlur={(e) => {
                        const value = commitNumber("CoinsRatio", e.target.value, { min: 300, fallback: 1000 });
                        setDraftOptions(prev => ({ ...prev, coinsRatio: String(value) }));
                    }}
                    value={draftOptions.coinsRatio}
                    name={"CoinsRatio"} style={{ textAlign: "left", width: "52px" }} />
                    <span className="options-coin-ratio-unit">Coins{imgCoins} per {imgSFL}Flower</span>
                    <label><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.autoCoinRatio || 0}
                        name={"autoCoinRatio"} />Auto</label></div>
                <CoinEconomySummary
                    activity={coinActivity}
                    farmId={dataSet.farmId}
                    coinsRatio={draftOptions.coinsRatio}
                    bestCoinRatio={bestCoinRatio}
                    isAbo={isAbo}
                    includeDeliveries={dataSet.coinRatioIncludeDeliveries !== false}
                    includeDig={dataSet.coinRatioIncludeDig !== false}
                    showBetty={dataSet.coinRatioShowBetty !== false}
                    onOptionChange={onOptionChange}
                />
                <div style={{ display: 'flex', alignItems: 'center' }}><input type="text" disabled onChange={onOptionChange} value={dataSet.gemsRatio || 0.07}
                    name={"GemsRatio"} style={{ textAlign: "left", width: "45px" }} />Flower{imgSFL}/{imgGem}Gems
                    {/* <FormControl variant="standard" id="formselectinv" className="selectinv" size="small">
                            <InputLabel></InputLabel>
                            <Select value={dataSet.gemsPack} onChange={handleChangeGemRatio}>
                                <MenuItem value="100">100{imgGem}</MenuItem>
                                <MenuItem value="650">650{imgGem}</MenuItem>
                                <MenuItem value="1350">1350{imgGem}</MenuItem>
                                <MenuItem value="2800">2800{imgGem}</MenuItem>
                                <MenuItem value="7400">7400{imgGem}</MenuItem>
                                <MenuItem value="15500">15k5{imgGem}</MenuItem>
                                <MenuItem value="200000">200k{imgGem}</MenuItem>
                            </Select>
                        </FormControl> */}
                    <DList
                        name="gemPack"
                        options={[
                            renderGemPackOption(100),
                            renderGemPackOption(650),
                            renderGemPackOption(1350),
                            renderGemPackOption(2800),
                            renderGemPackOption(7400),
                            renderGemPackOption(15500),
                            renderGemPackOption(200000),
                        ]}
                        value={gemsPack}
                        onChange={handleChangeGemRatio}
                        menuMinWidth={180}
                    />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}><input type="number"
                    onChange={handleChangeTradeTax}
                    onBlur={(e) => {
                        const value = commitNumber("tradeTax", e.target.value, { min: 0, fallback: 0, allowDecimal: true });
                        setTradeTax(String(value));
                    }}
                    value={tradeTax}
                    name={"tradeTax"} style={{ textAlign: "left", width: "45px" }} />
                    <button
                        onPointerDown={(e) => {
                            const el = e.currentTarget;
                            if (el.dataset.locked === "1") {
                                e.preventDefault();
                                e.stopPropagation();
                                return;
                            }
                            el.dataset.locked = "1";
                        }}
                        onClick={(e) => {
                            const el = e.currentTarget;
                            if (el.disabled) return;
                            resetTax();
                            el.disabled = true;
                            el.classList.add("is-wait");
                            setTimeout(() => {
                                el.disabled = false;
                                el.classList.remove("is-wait");
                                el.dataset.locked = "";
                            }, 2000);
                        }}
                        //onClick={resetTax}
                        className="button small-btn"><img src={imgrefresh} alt="" className="resico" />
                    </button>
                    Trade Tax
                    <input type="checkbox" onChange={onOptionChange} checked={!!dataSet.autoTradeTax}
                        name={"autoTradeTax"} style={{ width: "18px", height: "18px", marginRight: 6 }} />Auto refresh
                </div>
                </section>
                <section className={`options-section ${activeSection === "animals" ? "active" : ""}`}>
                    <h3>Animal levels</h3>
                    <div className="options-animal-grid">
                {dataSet.animalLvl && Object.entries(dataSet.animalLvl).map(([animal, lvl]) => (
                    <div key={animal}>
                        <input
                            type="number"
                            min={1}
                            max={15}
                            name={`animalLvl_${animal}`}
                            value={(draftOptions.animalLvl && draftOptions.animalLvl[animal] !== undefined)
                                ? draftOptions.animalLvl[animal]
                                : lvl}
                            onChange={e => {
                                const value = e.target.value;
                                setDraftOptions(prev => ({
                                    ...prev,
                                    animalLvl: {
                                        ...(prev.animalLvl || {}),
                                        [animal]: value,
                                    },
                                }));
                            }}
                            onBlur={e => {
                                const value = commitNumber(`animalLvl_${animal}`, e.target.value, { min: 1, max: 15, fallback: 7 });
                                setDraftOptions(prev => ({
                                    ...prev,
                                    animalLvl: {
                                        ...(prev.animalLvl || {}),
                                        [animal]: String(value),
                                    },
                                }));
                            }}
                            style={{ textAlign: "left", width: "45px" }}
                        />
                        <label style={{ marginRight: "8px" }}>{animal} lvl</label>
                    </div>
                ))}
                    </div>
                </section>
                <section className={`options-section ${activeSection === "notifications" ? "active" : ""}`}>
                    <h3>Notifications</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                        type="checkbox"
                        onChange={onOptionChange}
                        checked={!!dataSet.useNotifications}
                        name={"useNotifications"}
                        style={{ width: "18px", height: "18px", marginRight: 6 }}
                    />
                    <span style={{ fontSize: 15, marginRight: 6 }}>Notifications</span>
                    {/* <DropdownCheckbox
                        options={dataSet.notifList}
                        onChange={onOptionChange}
                        listIcon={imgoptions}
                    /> */}
                    <div className="dlist-icon-only">
                        <DList
                            name="NotifList"
                            options={dataSet.notifList}
                            onChange={onOptionChange}
                            listIcon={imgoptions}
                            multiple
                            clearable={false}
                            emitEvent={false}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleNotifHelpClick}
                        title="Notifications help"
                        className="button small-btn"
                        style={{ marginLeft: 2 }}
                    >
                        <img src={imgna} alt="?" className="itico" />
                    </button>
                    <button
                        type="button"
                        onClick={handleNotifTestClick}
                        title="Send test notification"
                        className="button small-btn"
                        disabled={notifTestBusy}
                        style={{ marginLeft: 2, opacity: notifTestBusy ? 0.6 : 1 }}
                    >
                        <img
                            src={imgrdy}
                            alt="Test"
                            style={{ width: "auto", height: "auto" }}
                        />
                    </button>
                </div>
                </section>
                <section className={`options-section ${activeSection === "production" ? "active" : ""}`}>
                    <h3>Production</h3>
                <div
                    title="Auto uses the real turtle coverage while nodes and turtle selections are unchanged, then switches to a simulated priority."
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                    <span>Emerald Turtle priority</span>
                    <DList
                        name="turtleAllocationMode"
                        options={TURTLE_ALLOCATION_OPTIONS}
                        value={Number(dataSet.turtleAllocationMode ?? 0)}
                        onChange={onOptionChange}
                        width={126}
                        menuMinWidth={154}
                        maxListHeight={260}
                    />
                </div>
                <div><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.oilFood}
                    name={"oilFood"} style={{ width: "18px", height: "18px", marginRight: 12 }} />use Oil for foods</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label style={{ display: "inline-flex", alignItems: "center" }}>
                        <input type="checkbox" onChange={onOptionChange} checked={!!dataSet.toolsBurn}
                            name={"toolsBurn"} style={{ width: "18px", height: "18px", marginRight: 12 }} />
                        Ressources burned by tools in daily
                    </label>
                    <DList
                        options={toolBurnOptions}
                        value={selectedToolBurns}
                        onChange={(selection) => onOptionChange(selection, "toolsBurnCraft")}
                        multiple
                        closeOnSelect={false}
                        emitEvent={false}
                        clearable={false}
                        listIcon={imgoptions}
                        iconOnly
                        height={26}
                        menuMinWidth={210}
                    />
                </div>
                </section>
                <section className={`options-section ${activeSection === "animals" ? "active" : ""}`}>
                    <h3>Animal costs</h3>
                <div><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.usePriceFood}
                    name={"usePriceFood"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Use cheaper food for animals</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Animal cost allocation</span>
                    <DList
                        name="animalCostAllocationMode"
                        options={ANIMAL_COST_ALLOCATION_OPTIONS}
                        value={Number(dataSet.animalCostAllocationMode ?? 0)}
                        onChange={onOptionChange}
                        width={158}
                        menuMinWidth={190}
                    />
                    <button type="button" onClick={handleAnimalCostHelpClick} title="Animal production cost help" className="button small-btn">
                        <img src={imgna} alt="?" className="itico" />
                    </button>
                </div>
                {/* <div><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.mergeAniProd}
                    name={"mergeAniProd"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Set animals 2nd prod.cost to 0</div> */}
                <div><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.ignoreAniLvl}
                    name={"ignoreAniLvl"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Ignore animals above selected lvl</div>
                {/* <div><input type="checkbox" onChange={onOptionChange} checked={!!dataSet.chumFishCost}
                    name={"chumFishCost"} style={{ width: "18px", height: "18px", marginRight: 12 }} />Chum cost in Fish cost</div> */}
                {dataSet.isAbo ? (<>
                </>) : null}
                </section>
                </div>
                <footer className="options-modal__about">
                    <span>Support Sunflower Manager</span>
                    <span>{paymentWalletAddress ? (
                        <a
                            id="copy-link"
                            href="#"
                            onClick={(event) => {
                                event.preventDefault();
                                handleDonClick(paymentWalletAddress, event.target);
                            }}
                            title={`Click to copy ${paymentToken} wallet`}
                        >
                            Copy donation address
                        </a>
                    ) : (
                        <span>Wallet unavailable</span>
                    )}</span>
                    {/* {paymentWalletAddress ? (
                        <div>
                            <a
                                href={`${paymentExplorerBaseUrl}/address/${paymentWalletAddress}`}
                                title="Open PolygonScan"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Open PolygonScan
                            </a>
                        </div>
                    ) : null} */}
                    <span>or visit my farm
                        <a id="visit-link" href="https://sunflower-land.com/play/#/visit/1972" title="Clic to visit my farm" target="_blank" rel="noopener noreferrer">
                            : Oubia</a>
                    </span>
                </footer>
            </div>
        </div>
    );
}

export default ModalOptions;
