import React, { useEffect, useRef, useState } from "react";
import { CircularProgress } from "@mui/material";
import { useAppCtx } from "../context/AppCtx";
import { frmtNb, getOrCreateDeviceId } from "../fct.js";
import { fetchJson } from "../services/apiClient.js";
import DList from "../dlist.jsx";
import { selectCurrentProjection } from "../utils/farmState.js";
import {
  imgbuyit,
  imgExchng,
  imgprodit,
  imgna,
  imgconfirm,
  imgcancel,
  imgchkn,
  imgcow,
  imgpoppy,
  imgfish,
  imgobsidian,
  imgchapterTrack,
  imgdelivBoard,
  imgchores,
  imgsynced,
  imgdoubledelivery,
  imgsfl,
  imgpurpleDaffodil,
  imgisopod,
  imgblackMagic,
  imgbigOrange,
  imgdoll,
  getNpcIconPath,
} from "../constants/images.js";

function formatBadgeDate(date) {
  if (!date) return "-";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "-";
  return value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
  });
}

function getNpcIcon(name) {
  return getNpcIconPath(name);
}

function getCategoryIcon(category) {
  if (category === "Chickens") return imgchkn;
  if (category === "Barn") return imgcow;
  return imgpoppy;
}

const POPPY_CATEGORY_ICONS = {
  Flower: imgpurpleDaffodil,
  Fish: imgfish,
  Crustacean: imgisopod,
  Exotic: imgblackMagic,
  "Giant Fruit": imgbigOrange,
  Dolls: imgdoll,
  Obsidian: imgobsidian,
};
const CHAPTER_TICKET_BOOST_WEARABLES = ["Swamp Lily Hat", "Swamp Armor", "Swamp Pants"];

export default function ChapterTable() {
  const stickyBarRef = useRef(null);
  const chapterHeaderTopRowRef = useRef(null);
  const chapterHeaderSubRowRef = useRef(null);
  const poppySelectionSyncRef = useRef({ selectedWeek: null });
  const [chapterHeaderStickyTop, setChapterHeaderStickyTop] = useState(0);
  const [chapterHeaderTopRowHeight, setChapterHeaderTopRowHeight] = useState(0);
  const [chapterHeaderSubRowHeight, setChapterHeaderSubRowHeight] = useState(0);
  const [chapterDeliveryEnabled, setChapterDeliveryEnabled] = useState(true);
  const [chapterDailyChestEnabled, setChapterDailyChestEnabled] = useState(true);
  const {
    data: {
      dataSet,
      dataSetFarm,
    },
    ui: {
      chapterNpcSelection,
      chapterNpcCostOverride,
      chapterCurrentTickets,
      chapterBountySelection,
      chapterBountyCostOverride,
      chapterBountyReplace,
      chapterBountyOverride,
      chapterBountyRewardType,
      chapterVipDone,
      chapterChoresEnabled,
      chapterChoreSelection,
      chapterChoresExpanded,
      chapterDeliveryExpanded,
      chapterPoppyExpanded,
      chapterPoppyCategorySelection,
      chapterCostMode,
      chapterCostType,
      TryChecked,
    },
    actions: {
      handleUIChange,
      setUIField,
    },
    img: {
      imgSFL
    },
    config: { API_URL },
  } = useAppCtx();
  const imgDone = <img src={imgconfirm} alt={""} className="itico" title={"Done"} />;
  const imgCancel = <img src={imgcancel} alt={""} className="itico" title={"Not done"} />;

  const orderstable = dataSetFarm?.orderstable || {};
  const chapterPageData = selectCurrentProjection(dataSetFarm, "chapterData") || {};
  const chapterMeta = chapterPageData?.meta || {};
  const tktName = dataSetFarm?.constants?.tktName || dataSet?.tktName || "Tickets";
  const imgtkt = dataSetFarm?.constants?.imgtkt || dataSet?.imgtkt || imgna;
  const imgTKT = <img src={imgtkt} alt="" className="itico" />;
  const marketIconSrc = imgExchng?.props?.src;
  const flowerIconSrc = imgprodit?.props?.src || imgsfl;
  const coinsRatio = Number(dataSet?.options?.coinsRatio || 1000) || 1;
  const seasonStartRaw = dataSetFarm?.constants?.dateSeason || "";
  const seasonQuestStartRaw = dataSetFarm?.constants?.dateSeasonDailyStart || seasonStartRaw;
  const seasonEndRaw = dataSetFarm?.constants?.dateSeasonEnd || "";
  const seasonAuctionTicketWeekStartRaw = dataSetFarm?.constants?.dateSeasonAuctionTicketWeekStart || "";
  const calendarDates = Array.isArray(chapterMeta?.calendarDates) ? chapterMeta.calendarDates : [];
  const isDoubleDeliveryActive = chapterMeta?.seasonEvent === "doubledelivery";
  const vipChapterTickets = 290;
  const isTryMode = !!TryChecked;
  const chapterTicketBoost = CHAPTER_TICKET_BOOST_WEARABLES.reduce((sum, name) => {
    const wearable = dataSetFarm?.boostables?.nftw?.[name] || {};
    return sum + (Number(isTryMode ? wearable?.tryit : wearable?.isactive) > 0 ? 1 : 0);
  }, 0);
  const costMode = chapterCostMode === "market" ? "market" : "prod";
  const isMarketCostMode = costMode === "market";
  const costType = chapterCostType === "custom" ? "custom" : "average";
  const isCustomCostType = costType === "custom";
  const costModeIconSrc = isMarketCostMode ? marketIconSrc : flowerIconSrc;
  const costModeOptions = [
    { value: "prod", label: "Production", iconSrc: flowerIconSrc },
    { value: "market", label: "Market", iconSrc: marketIconSrc },
  ];
  const bountyRewardType = chapterBountyRewardType === "custom" ? "custom" : "actual";
  const isCustomBountyRewardType = bountyRewardType === "custom";
  const bountyRewardTypeOptions = [
    { value: "actual", label: "Actual" },
    { value: "custom", label: "Custom" },
  ];
  const costTypeOptions = [
    { value: "average", label: "Average" },
    { value: "custom", label: "Custom" },
  ];
  const handleCostHelpClick = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.55)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "99999";

    const box = document.createElement("div");
    box.style.width = "min(520px, 92vw)";
    box.style.background = "#151515";
    box.style.border = "1px solid rgba(255,255,255,0.25)";
    box.style.borderRadius = "8px";
    box.style.padding = "12px";
    box.style.color = "#fff";

    const titleEl = document.createElement("div");
    titleEl.textContent = "Cost";
    titleEl.style.fontWeight = "700";
    titleEl.style.marginBottom = "8px";

    const messageEl = document.createElement("div");
    messageEl.style.lineHeight = "1.35";
    messageEl.style.marginBottom = "12px";

    const lines = [
      { icon: flowerIconSrc, text: ": production prices." },
      { icon: marketIconSrc, text: ": bought at market prices." },
      { text: "Cost per ticket values are based on the current delivery and bounty prices." },
      { text: "These prices can change from one day or week to the next." },
    ];

    lines.forEach((line, index) => {
      const lineEl = document.createElement("div");
      lineEl.style.display = "flex";
      lineEl.style.alignItems = "center";
      lineEl.style.gap = "6px";
      if (index < lines.length - 1) {
        lineEl.style.marginBottom = "4px";
      }
      if (line.icon) {
        const iconEl = document.createElement("img");
        iconEl.src = line.icon;
        iconEl.alt = "";
        iconEl.style.width = "16px";
        iconEl.style.height = "16px";
        iconEl.style.objectFit = "contain";
        lineEl.appendChild(iconEl);
      }
      lineEl.appendChild(document.createTextNode(line.text));
      messageEl.appendChild(lineEl);
    });

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "8px";

    const okBtn = document.createElement("button");
    okBtn.textContent = "Got it";
    okBtn.className = "graph-mode-btn is-active";

    actions.appendChild(okBtn);
    box.appendChild(titleEl);
    box.appendChild(messageEl);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.remove();
    };

    okBtn.addEventListener("click", cleanup);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup();
    });
    okBtn.focus();
  };
  const [chapterProjection, setChapterProjection] = useState(null);
  const [chapterCalculationLoading, setChapterCalculationLoading] = useState(false);
  const chapterRequestSeqRef = useRef(0);
  const chapterAbortRef = useRef(null);
  const farmId = Number(dataSetFarm?.frmid || dataSet?.options?.farmId || 0);
  const validChapterChoreSelection = Object.fromEntries(
    Object.entries(chapterChoreSelection || {})
      .filter(([key, value]) => key && key.length <= 160 && typeof value === "boolean")
      .slice(0, 150)
  );
  const chapterRequest = {
    farmId,
    deviceId: getOrCreateDeviceId(),
    options: {
      tryMode: isTryMode,
      deliveryEnabled: chapterDeliveryEnabled !== false,
      dailyChestEnabled: chapterDailyChestEnabled !== false,
      choresEnabled: chapterChoresEnabled !== false,
      vipEnabled: chapterVipDone !== false,
      costMode,
      costType,
      bountyRewardType,
      currentTickets: Number(chapterCurrentTickets || 0),
      ticketBoost: chapterTicketBoost,
      coinsRatio,
      npcSelection: chapterNpcSelection || {},
      npcCostOverride: chapterNpcCostOverride || {},
      bountySelection: chapterBountySelection || {},
      bountyCostOverride: chapterBountyCostOverride || {},
      bountyOverride: chapterBountyOverride || {},
      choreSelection: validChapterChoreSelection,
      poppyCategorySelection: chapterPoppyCategorySelection || {},
      dailyChestDate: selectCurrentProjection(dataSetFarm, "homeData")?.dailyChest?.collectedAt
        || dataSet?.dailychest?.chest
        || chapterMeta?.dailyChestDate
        || "",
    },
  };
  const chapterRequestSignature = JSON.stringify({
    request: chapterRequest,
    tryitRevision: Number(dataSetFarm?.tryitRevision || 0),
    chapterTicketBoost: Number(orderstable?.chapterTicketBoost || 0),
    chapterTicketBoosttry: Number(orderstable?.chapterTicketBoosttry || 0),
    directChapterTicketBoost: chapterTicketBoost,
  });

  useEffect(() => {
    if (!farmId) return undefined;
    const requestId = ++chapterRequestSeqRef.current;
    chapterAbortRef.current?.abort?.();
    setChapterCalculationLoading(true);
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      chapterAbortRef.current = controller;
      try {
        const requestOptions = {
          method: "POST",
          signal: controller.signal,
          timeoutMs: 10000,
          body: {
            ...chapterRequest,
            source: {
              orderstable: dataSetFarm?.orderstable || {},
              constants: dataSetFarm?.constants || {},
              frmData: {
                calendarDates,
                seasonEvent: chapterMeta?.seasonEvent || "",
                dailychest: { chest: chapterRequest.options.dailyChestDate || "" },
              },
            },
          },
        };
        let result;
        try {
          result = await fetchJson(API_URL, "/getchaptercalc", requestOptions);
        } catch (error) {
          if (error?.status !== 409) throw error;
          result = await fetchJson(API_URL, "/getchaptercalc", {
            ...requestOptions,
            body: {
              ...chapterRequest,
              source: {
                orderstable: dataSetFarm?.orderstable || {},
                constants: dataSetFarm?.constants || {},
                frmData: {
                  calendarDates,
                  seasonEvent: chapterMeta?.seasonEvent || "",
                  dailychest: { chest: chapterRequest.options.dailyChestDate || "" },
                },
              },
            },
          });
        }
        if (requestId === chapterRequestSeqRef.current) setChapterProjection(result);
      } catch (error) {
        if (requestId === chapterRequestSeqRef.current && error?.code !== "REQUEST_CANCELLED") {
          console.log(`Chapter calculation error: ${error?.message || error}`);
        }
      } finally {
        if (requestId === chapterRequestSeqRef.current) setChapterCalculationLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      if (requestId === chapterRequestSeqRef.current) chapterAbortRef.current?.abort?.();
    };
  }, [API_URL, farmId, chapterRequestSignature]);

  const deliveryRows = (chapterProjection?.deliveryRows || [])
    .map((row) => ({ ...row, icon: getNpcIcon(row.name) }));
  const choreRowsWithTickets = chapterProjection?.choreRows || [];
  const bountyRows = (chapterProjection?.bountyRows || []).map((row) => ({ ...row, icon: getCategoryIcon(row.key) }));
  const poppyBountyCategoryRows = (chapterProjection?.poppyCategoryRows || []).map((row) => ({ ...row, icon: POPPY_CATEGORY_ICONS[row.key] || imgpoppy }));
  const bountyLineValues = chapterProjection?.bountyLineValues || [];
  const metrics = chapterProjection?.metrics || {};
  const vipChapterEnabled = metrics.vipChapterEnabled ?? (chapterVipDone !== false);
  const vipChapterPendingTickets = Number(metrics.vipChapterPendingTickets || 0);
  const choresSelectionEnabled = chapterChoresEnabled !== false;
  const deliverySelectionEnabled = chapterDeliveryEnabled !== false;
  const dailyChestSelectionEnabled = chapterDailyChestEnabled !== false;
  const currentTicketsValue = Number(metrics.currentTickets || 0);
  const remainingDaysValue = Number(metrics.remainingDays || 0);
  const remainingWeeksValue = Number(metrics.remainingWeeks || 0);
  const totalChapterDaysValue = Number(metrics.totalChapterDays || 0);
  const totalChapterWeeksValue = Number(metrics.totalChapterWeeks || 0);
  const totalQuestDaysValue = Number(metrics.totalQuestDays || 0);
  const totalQuestWeeksValue = Number(metrics.totalQuestWeeks || 0);
  const selectedNpcTickets = Number(metrics.selectedNpcTickets || 0);
  const selectedNpcCount = Number(metrics.selectedNpcCount || 0);
  const selectedNpcCompletedCount = Number(metrics.selectedNpcCompletedCount || 0);
  const selectedNpcPendingToday = Number(metrics.deliveryLeft || 0);
  const selectedChoresCount = Number(metrics.selectedChoresCount || 0);
  const selectedChoresCompletedCount = Number(metrics.selectedChoresCompletedCount || 0);
  const selectedChoresWeeklyTickets = Number(metrics.selectedChoresWeeklyTickets || 0);
  const choresPendingTickets = Number(metrics.choresPendingTickets || 0);
  const choresTickets = Number(metrics.choresTickets || 0);
  const choresCompletedCount = Number(metrics.choresCompletedCount || 0);
  const choresTotalCount = Number(metrics.choresTotalCount || 0);
  const dailyChestDone = !!metrics.dailyChestDone;
  const dailyChestTickets = 1;
  const poppyBountiesCompletedCount = Number(metrics.poppyBountiesCompletedCount || 0);
  const poppyBountiesTotalCount = Number(metrics.poppyBountiesTotalCount || 0);
  const selectedPoppyWeek = Number(metrics.selectedPoppyWeek || 0);
  const selectedPoppyLeft = Number(metrics.selectedPoppyLeft || 0);
  const selectedPoppyTotal = Number(metrics.selectedPoppyTotal || 0);
  const selectedPoppyCostLeft = Number(metrics.selectedPoppyCostLeft || 0);
  const selectedPoppyCostTotal = Number(metrics.selectedPoppyCostTotal || 0);
  const selectedPoppyCompletedCount = Number(metrics.selectedPoppyCompletedCount || 0);
  const selectedPoppyTotalCount = Number(metrics.selectedPoppyTotalCount || 0);
  const poppyDisplayScale = Number(metrics.poppyDisplayScale || 1);
  const hasPoppyBounties = !!metrics.hasPoppyBounties;
  const poppyBountiesDone = !!metrics.poppyBountiesDone;
  const seasonStartLabel = formatBadgeDate(seasonStartRaw);
  const seasonQuestStartLabel = formatBadgeDate(seasonQuestStartRaw);
  const auctionTicketWeekStartLabel = formatBadgeDate(seasonAuctionTicketWeekStartRaw);
  const weeklyTickets = Number(metrics.totalWeekTickets || 0);
  const remainingTodayDoubleDeliveryBonus = Number(metrics.doubleRemainingToday || 0);
  const selectedNpcDoubleBonusPending = Number(metrics.selectedNpcDoubleBonusPending || 0);
  const weekDoubleDeliveryBonus = Number(metrics.doubleWeek || 0);
  const doubleDeliveryDoneThisWeek = !!metrics.doubleDoneThisWeek;
  const chapterDoubleDeliveryBonusDisplay = Number(metrics.doubleChapter || 0);
  const totalFromZeroDoubleDeliveryBonusDisplay = Number(metrics.doubleTotal || 0);
  const dailyChestChapterLeftDisplay = Number(metrics.dailyChestLeft || 0);
  const dailyChestChapterTotalDisplay = Number(metrics.dailyChestTotal || 0);
  const deliveryDailyDoneLabel = selectedNpcCount > 0 ? `${selectedNpcCompletedCount}/${selectedNpcCount}` : "-";
  const deliveryDailyWeek = Number(metrics.deliveryWeek || 0);
  const deliveryDailyChapterLeftDisplay = Number(metrics.deliveryLeft || 0);
  const deliveryDailyChapterTotalDisplay = Number(metrics.deliveryTotal || 0);
  const dailyChestWeek = 7;
  const choresWeek = Number(metrics.choresWeek || 0);
  const choresChapterLeft = Number(metrics.choresLeft || 0);
  const choresChapterTotal = Number(metrics.choresTotal || 0);
  const bountyChapterLeft = Number(metrics.bountyLeft || 0);
  const bountyChapterTotal = Number(metrics.bountyTotal || 0);
  const bountyWeekTickets = Number(metrics.bountyWeek || 0);
  const poppyBonusWeekDisplay = Number(metrics.poppyBonusWeekDisplay || 0);
  const poppyChapterLeftDisplay = Number(metrics.poppyLeft || 0);
  const poppyChapterTotalDisplay = Number(metrics.poppyTotal || 0);
  const currentWeekPendingTickets = Number(metrics.currentWeekPendingTickets || 0);
  const totalDailyTickets = Number(metrics.totalDailyTickets || 0);
  const totalWeekTickets = Number(metrics.totalWeekTickets || 0);
  const totalChapterTickets = Number(metrics.totalChapterTickets || 0);
  const totalFromZeroTickets = Number(metrics.totalFromZeroTickets || 0);
  const hasEstimatedProjection = !!metrics.hasEstimatedProjection;
  const appliedChapterTicketBoost = Number(metrics.chapterTicketBoost || 0);
  const projectedEndSeasonTickets = Number(metrics.projectedEndTickets || 0);
  const totalNpcCostLeftDisplay = Number(metrics.npcCostLeft || 0);
  const totalNpcCostTotalDisplay = Number(metrics.npcCostTotal || 0);
  const totalBountyCostLeft = Number(metrics.bountyCostLeft || 0);
  const totalBountyCostTotal = Number(metrics.bountyCostTotal || 0);
  const selectedAverageCostTktDisplay = Number(metrics.averageCostPerTicket || 0);
  useEffect(() => {
    const updateChapterHeaderTop = () => {
      setChapterHeaderStickyTop(stickyBarRef.current?.offsetHeight || 0);
      setChapterHeaderTopRowHeight(chapterHeaderTopRowRef.current?.offsetHeight || 0);
      setChapterHeaderSubRowHeight(chapterHeaderSubRowRef.current?.offsetHeight || 0);
    };
    const raf = requestAnimationFrame(updateChapterHeaderTop);
    window.addEventListener("resize", updateChapterHeaderTop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateChapterHeaderTop);
    };
  }, [chapterCurrentTickets, remainingDaysValue, selectedNpcTickets, weeklyTickets, projectedEndSeasonTickets]);
  const chapterStatusBadge = (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        columnGap: "8px",
        rowGap: "2px",
        margin: "0",
        padding: "4px 8px",
        border: "1px solid rgb(90, 90, 90)",
        borderRadius: "6px",
        background: "rgba(0, 0, 0, 0.28)",
        width: "auto",
        maxWidth: "400px",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>
        <img src={imgtkt} alt="" className="itico" />
      </span>
      <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>
        Current:
        <input
          type="number"
          min="0"
          name="chapterCurrentTickets"
          value={chapterCurrentTickets ?? 0}
          onChange={handleUIChange}
          style={{ width: "52px", height: "20px" }}
        />
      </span>
      <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>
        Days left: {frmtNb(remainingDaysValue)}
      </span>
      {/* <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>
        Delivery left: {frmtNb(selectedNpcPendingToday)}
      </span>
      <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>
        Chest left: {frmtNb(dailyChestDone ? 0 : dailyChestTickets)}
      </span>
      <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>
        Weekly left: {frmtNb(currentWeekPendingTickets)}
      </span> */}
      <span style={{ fontSize: "12px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "2px" }}>
        End season: {frmtNb(projectedEndSeasonTickets)}
      </span>
      <span
        style={{
          fontSize: "11px",
          width: "100%",
          color: "rgba(255, 255, 255, 0.82)",
          whiteSpace: "normal",
        }}
      >
        Season start: {seasonStartLabel} | Tickets start: {seasonQuestStartLabel} | Auctions week: {auctionTicketWeekStartLabel}
      </span>
      {hasEstimatedProjection ? (
        <span
          title="Current rewards are not Chapter tickets. Week, Left and Total use conservative planning values; Daily remains the actual reward."
          style={{ fontSize: "11px", width: "100%", color: "rgb(255, 205, 105)" }}
        >
          ≈ Estimated projection — current non-ticket rewards are not counted as tickets
          {appliedChapterTicketBoost > 0 ? ` · Ticket boost +${frmtNb(appliedChapterTicketBoost)}` : ""}
        </span>
      ) : null}
    </div>
  );

  return (
    <>
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
        {chapterStatusBadge}
      </div>
      <table
        className="table chapter-table"
        style={{
          "--chapter-head-top": `${chapterHeaderStickyTop}px`,
          "--chapter-head-row-h": `${chapterHeaderTopRowHeight}px`,
          "--chapter-head-sub-row-h": `${chapterHeaderSubRowHeight}px`,
        }}
      >
        <thead>
          <tr ref={chapterHeaderTopRowRef}>
            <th className="thcenter chapter-check-sticky" rowSpan="2">Take</th>
            <th className="th-icon chapter-icon-sticky" rowSpan="2"> </th>
            <th className="thcenter" rowSpan="2">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Source
                {chapterCalculationLoading ? <CircularProgress size={13} thickness={5} color="inherit" /> : null}
              </span>
            </th>
            <th className="thcenter" rowSpan="2">Done</th>
            <th className="thcenter" rowSpan="2">Daily</th>
            <th className="thcenter">Week</th>
            <th className="thcenter" colSpan="2"><span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>Chapter<img src={imgtkt} alt="" className="itico" /></span></th>
            <th className="thcenter"><img src={costModeIconSrc} alt="" className="itico" />/{imgTKT}</th>
            <th className="thcenter" colSpan="2">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Cost
                <span className="dlist-icon-only chapter-cost-mode-picker">
                  <DList
                    name="chapterCostMode"
                    options={costModeOptions}
                    value={costMode}
                    onChange={(value) => setUIField("chapterCostMode", value)}
                    listIcon={costModeIconSrc}
                    clearable={false}
                    emitEvent={false}
                    iconOnly
                    menuIconOnly
                  //menuMinWidth={42}
                  />
                </span>
                <button
                  type="button"
                  className="button small-btn"
                  onClick={handleCostHelpClick}
                  title="Cost info"
                  style={{ marginLeft: 2 }}
                >
                  <img src={imgna} alt="?" className="itico" />
                </button>
              </span>
            </th>
          </tr>
          <tr ref={chapterHeaderSubRowRef}>
            <th className="thcenter">
              <DList
                name="chapterBountyRewardType"
                options={bountyRewardTypeOptions}
                value={bountyRewardType}
                onChange={(value) => setUIField("chapterBountyRewardType", value)}
                clearable={false}
                emitEvent={false}
                menuMinWidth={0}
              />
            </th>
            <th className="thcenter">Left</th>
            <th className="thcenter">Total</th>
            <th className="thcenter">
              <DList
                name="chapterCostType"
                options={costTypeOptions}
                value={costType}
                onChange={(value) => setUIField("chapterCostType", value)}
                clearable={false}
                emitEvent={false}
                width="auto"
              />
            </th>
            <th className="thcenter">Left</th>
            <th className="thcenter">Total</th>
          </tr>
          <tr className="chapter-total-row">
            <th className="thcenter chapter-check-sticky"> </th>
            <th className="th-icon chapter-total-icon chapter-icon-sticky">{imgTKT}</th>
            <th className="thcenter">Total</th>
            <th className="thcenter"></th>
            <th className="thcenter">{frmtNb(totalDailyTickets)}</th>
            <th className="thcenter">{frmtNb(totalWeekTickets)}</th>
            <th className="thcenter">{frmtNb(totalChapterTickets)}</th>
            <th className="thcenter">{frmtNb(totalFromZeroTickets)}</th>
            <th className="thcenter">{selectedAverageCostTktDisplay > 0 ? frmtNb(selectedAverageCostTktDisplay) : ""}</th>
            <th className="thcenter">{(totalNpcCostLeftDisplay + totalBountyCostLeft) > 0 ? frmtNb(totalNpcCostLeftDisplay + totalBountyCostLeft) : ""}</th>
            <th className="thcenter">{(totalNpcCostTotalDisplay + totalBountyCostTotal) > 0 ? frmtNb(totalNpcCostTotalDisplay + totalBountyCostTotal) : ""}</th>
          </tr>
        </thead>
        <tbody>
          <tr style={dailyChestSelectionEnabled ? undefined : { opacity: 0.45 }}>
            <td className="tdcenter chapter-check-sticky">
              <input
                type="checkbox"
                checked={!!chapterDailyChestEnabled}
                onChange={(e) => {
                  setChapterDailyChestEnabled(!!e.target.checked);
                }}
                style={{ width: "16px", height: "16px" }}
              />
            </td>
            <td id="iccolumn" className="chapter-icon-sticky"><img src={imgsynced} alt="" className="itico" /></td>
            <td className="tditem">Daily Chest</td>
            <td className="tdcenter">{dailyChestDone ? imgDone : imgCancel}</td>
            <td className="tdcenter">{frmtNb(dailyChestTickets)}</td>
            <td className="tdcenter">{frmtNb(dailyChestTickets * 7)}</td>
            <td className="tdcenter">{frmtNb(dailyChestChapterLeftDisplay)}</td>
            <td className="tdcenter">{frmtNb(dailyChestChapterTotalDisplay)}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
          </tr>
          <tr style={deliverySelectionEnabled ? undefined : { opacity: 0.45 }}>
            <td className="tdcenter chapter-check-sticky">
              <input
                type="checkbox"
                checked={deliverySelectionEnabled}
                onChange={(e) => {
                  setChapterDeliveryEnabled(!!e.target.checked);
                }}
                style={{ width: "16px", height: "16px" }}
              />
            </td>
            <td id="iccolumn" className="chapter-icon-sticky"><img src={imgdelivBoard} alt="" className="itico" /></td>
            <td className="tditem">
              <button
                type="button"
                onClick={() => setUIField("chapterDeliveryExpanded", !chapterDeliveryExpanded)}
                style={{ background: "transparent", border: "none", color: "inherit", padding: 0, cursor: "pointer" }}
              >
                {chapterDeliveryExpanded ? "▾" : "▸"} Delivery daily
              </button>
            </td>
            <td className="tdcenter">{deliveryDailyDoneLabel}</td>
            <td className="tdcenter">{frmtNb(selectedNpcTickets)}</td>
            <td className="tdcenter">{frmtNb(deliveryDailyWeek)}</td>
            <td className="tdcenter">{frmtNb(deliveryDailyChapterLeftDisplay)}</td>
            <td className="tdcenter">{frmtNb(deliveryDailyChapterTotalDisplay)}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
          </tr>
          {chapterDeliveryExpanded ? deliveryRows.map((row) => {
            const isChecked = chapterNpcSelection?.[row.key] ?? true;
            return (
              <tr key={row.key} style={(isChecked && deliverySelectionEnabled) ? { opacity: 0.9 } : { opacity: 0.45 }}>
                <td className="tdcenter chapter-check-sticky"></td>
                <td id="iccolumn" className="chapter-icon-sticky">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setUIField("chapterNpcSelection", (prev) => ({
                        ...(prev || {}),
                        [row.key]: checked,
                      }));
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                </td>
                <td className="tditem">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <img src={row.icon} alt="" className="itico" />
                    <span>{row.name}{row.estimated ? " ≈" : ""}</span>
                  </span>
                </td>
                <td className="tdcenter">{row.completed ? imgDone : imgCancel}</td>
                <td className="tdcenter">{frmtNb(row.reward)}</td>
                <td className="tdcenter">{frmtNb(row.week)}</td>
                <td className="tdcenter">{frmtNb(row.left)}</td>
                <td className="tdcenter">{frmtNb(row.total)}</td>
                <td className="tdcenter">
                  {isCustomCostType ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.overrideRaw}
                      placeholder={Number.isFinite(row.baseCostTkt) ? String(frmtNb(row.baseCostTkt)) : ""}
                      onChange={(e) => {
                        setUIField("chapterNpcCostOverride", (prev) => ({
                          ...(prev || {}),
                          [row.key]: e.target.value,
                        }));
                      }}
                      style={{ width: "58px", height: "18px" }}
                    />
                  ) : frmtNb(row.costTkt)}
                </td>
                <td className="tdcenter">{frmtNb(row.costLeft)}</td>
                <td className="tdcenter">{frmtNb(row.costTotal)}</td>
              </tr>
            );
          }) : null}
          <tr style={deliverySelectionEnabled ? undefined : { opacity: 0.45 }}>
            <td className="tdcenter chapter-check-sticky"> </td>
            <td id="iccolumn" className="chapter-icon-sticky"><img src={imgdoubledelivery} alt="" className="itico" /></td>
            <td className="tditem">Double delivery</td>
            <td className="tdcenter">{doubleDeliveryDoneThisWeek || (isDoubleDeliveryActive && selectedNpcDoubleBonusPending === 0) ? imgDone : imgCancel}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter">{frmtNb(weekDoubleDeliveryBonus)}</td>
            <td className="tdcenter">{frmtNb(chapterDoubleDeliveryBonusDisplay)}</td>
            <td className="tdcenter">{frmtNb(totalFromZeroDoubleDeliveryBonusDisplay)}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
          </tr>
          <tr style={choresSelectionEnabled ? undefined : { opacity: 0.45 }}>
            <td className="tdcenter chapter-check-sticky">
              <input
                type="checkbox"
                checked={!!chapterChoresEnabled}
                onChange={(e) => {
                  setUIField("chapterChoresEnabled", !!e.target.checked);
                }}
                style={{ width: "16px", height: "16px" }}
              />
            </td>
            <td id="iccolumn" className="chapter-icon-sticky"><img src={imgchores} alt="" className="itico" /></td>
            <td className="tditem">
              <button
                type="button"
                onClick={() => setUIField("chapterChoresExpanded", !chapterChoresExpanded)}
                style={{ background: "transparent", border: "none", color: "inherit", padding: 0, cursor: "pointer" }}
              >
                {chapterChoresExpanded ? "▾" : "▸"} Chores
              </button>
            </td>
            <td className="tdcenter">{selectedChoresCount > 0 ? `${selectedChoresCompletedCount}/${selectedChoresCount}` : "-"}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter">{frmtNb(choresWeek)}</td>
            <td className="tdcenter">{frmtNb(choresChapterLeft)}</td>
            <td className="tdcenter">{frmtNb(choresChapterTotal)}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
          </tr>
          {chapterChoresExpanded ? choreRowsWithTickets.map((row) => {
            const isChecked = chapterChoreSelection?.[row.choreKey] ?? true;
            const isEnabled = choresSelectionEnabled && isChecked;
            return (
              <tr key={row.choreKey} style={isEnabled ? { opacity: 0.9 } : { opacity: 0.45 }}>
                <td className="tdcenter chapter-check-sticky"></td>
                <td id="iccolumn" className="chapter-icon-sticky">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setUIField("chapterChoreSelection", (prev) => ({
                        ...(prev || {}),
                        [row.choreKey]: checked,
                      }));
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                </td>
                <td className="tditem">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {row.itemimg ? <img src={row.itemimg} alt="" className="itico" /> : null}
                    <span>{row.description || row.item || row.choreKey}</span>
                  </span>
                </td>
                <td className="tdcenter">{row.completed ? imgDone : imgCancel}</td>
                <td className="tdcenter"></td>
                <td className="tdcenter">{frmtNb(row.weeklyTickets)}</td>
                <td className="tdcenter"></td>
                <td className="tdcenter"></td>
                <td className="tdcenter"></td>
                <td className="tdcenter"></td>
                <td className="tdcenter"></td>
              </tr>
            );
          }) : null}
          {bountyRows.map((row) => {
            const rowValues = bountyLineValues.find((entry) => entry.key === row.key) || { week: 0, left: 0, total: 0 };
            return (
              <tr key={row.key} style={row.selected ? undefined : { opacity: 0.45 }}>
                <td className="tdcenter chapter-check-sticky">
                  <input
                    type="checkbox"
                    checked={!!row.selected}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setUIField("chapterBountySelection", (prev) => ({
                        ...(prev || {}),
                        [row.key]: checked,
                      }));
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                </td>
                <td id="iccolumn" className="chapter-icon-sticky"><img src={row.icon} alt="" className="itico" /></td>
                <td className="tditem">
                  {row.key === "Poppy" ? (
                    <button
                      type="button"
                      onClick={() => setUIField("chapterPoppyExpanded", !chapterPoppyExpanded)}
                      style={{ background: "transparent", border: "none", color: "inherit", padding: 0, cursor: "pointer" }}
                    >
                      {chapterPoppyExpanded ? "▾" : "▸"} {row.label}{row.estimated ? " ≈" : ""}
                    </button>
                  ) : <span>{row.label}{row.estimated ? " ≈" : ""}</span>}
                </td>
                <td className="tdcenter">
                  {row.key === "Poppy" && !row.done
                    ? (selectedPoppyTotalCount > 0 ? `${selectedPoppyCompletedCount}/${selectedPoppyTotalCount}` : "-")
                    : (row.done ? imgDone : imgCancel)}
                </td>
                <td className="tdcenter"></td>
                <td className="tdcenter">
                  {isCustomBountyRewardType ? (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={row.overrideRaw}
                      placeholder={Number.isFinite(row.baseReward) ? String(frmtNb(row.baseReward)) : ""}
                      onChange={(e) => {
                        setUIField("chapterBountyOverride", (prev) => ({
                          ...(prev || {}),
                          [row.key]: e.target.value,
                        }));
                      }}
                      style={{ width: "44px", height: "18px" }}
                    />
                  ) : frmtNb(rowValues.week)}
                </td>
                <td className="tdcenter">{frmtNb(rowValues.left)}</td>
                <td className="tdcenter">{frmtNb(rowValues.total)}</td>
                <td className="tdcenter">
                  {row.key === "Poppy" && isCustomCostType ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.costOverrideRaw}
                      placeholder={Number.isFinite(row.baseCostTkt) ? String(frmtNb(row.baseCostTkt)) : ""}
                      onChange={(e) => {
                        setUIField("chapterBountyCostOverride", (prev) => ({
                          ...(prev || {}),
                          [row.key]: e.target.value,
                        }));
                      }}
                      style={{ width: "58px", height: "18px" }}
                    />
                  ) : (row.selected && row.effectiveDisplayCostTkt > 0 ? frmtNb(row.effectiveDisplayCostTkt) : "")}
                </td>
                <td className="tdcenter">{row.selected && row.effectiveCostTkt > 0 ? frmtNb(row.effectiveCostTkt * rowValues.left) : ""}</td>
                <td className="tdcenter">{row.selected && row.effectiveCostTkt > 0 ? frmtNb(row.effectiveCostTkt * rowValues.total) : ""}</td>
              </tr>
            )
          })}
          {chapterPoppyExpanded && bountyRows.some((row) => row.key === "Poppy") ? poppyBountyCategoryRows.map((row) => {
            const poppySelected = bountyRows.find((entry) => entry.key === "Poppy")?.selected ?? true;
            const isChecked = chapterPoppyCategorySelection?.[row.key] ?? true;
            const displayWeek = Number(row.week || 0) * poppyDisplayScale;
            const displayLeft = Number(row.left || 0) * poppyDisplayScale;
            const displayTotal = Number(row.total || 0) * poppyDisplayScale;
            return (
              <tr key={`poppy-${row.key}`} style={poppySelected && isChecked ? { opacity: 0.9 } : { opacity: 0.45 }}>
                <td className="tdcenter chapter-check-sticky"></td>
                <td id="iccolumn" className="chapter-icon-sticky">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setUIField("chapterPoppyCategorySelection", (prev) => ({
                        ...(prev || {}),
                        [row.key]: checked,
                      }));
                    }}
                    style={{ width: "16px", height: "16px" }}
                  />
                </td>
                <td className="tditem">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <img src={row.icon} alt="" className="itico" />
                    <span>{row.label}{row.estimated ? " ≈" : ""}</span>
                  </span>
                </td>
                <td className="tdcenter">{row.totalCount > 0 ? `${row.completedCount}/${row.totalCount}` : "-"}</td>
                <td className="tdcenter"></td>
                <td className="tdcenter">{frmtNb(displayWeek)}</td>
                <td className="tdcenter">{frmtNb(displayLeft)}</td>
                <td className="tdcenter">{frmtNb(displayTotal)}</td>
                <td className="tdcenter">{row.costTkt > 0 ? frmtNb(row.costTkt) : ""}</td>
                <td className="tdcenter">{row.costTkt > 0 ? frmtNb(row.costTkt * displayLeft) : ""}</td>
                <td className="tdcenter">{row.costTkt > 0 ? frmtNb(row.costTkt * displayTotal) : ""}</td>
              </tr>
            );
          }) : null}
          <tr style={hasPoppyBounties ? undefined : { opacity: 0.45 }}>
            <td className="tdcenter chapter-check-sticky"> </td>
            <td id="iccolumn" className="chapter-icon-sticky">{imgTKT}</td>
            <td className="tditem">Poppy bonus</td>
            <td className="tdcenter">{poppyBountiesDone ? imgDone : imgCancel}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter">{frmtNb(poppyBonusWeekDisplay)}</td>
            <td className="tdcenter">{frmtNb(poppyChapterLeftDisplay)}</td>
            <td className="tdcenter">{frmtNb(poppyChapterTotalDisplay)}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
          </tr>
          <tr>
            <td className="tdcenter chapter-check-sticky">
              <input
                type="checkbox"
                checked={!!vipChapterEnabled}
                onChange={(e) => {
                  setUIField("chapterVipDone", !!e.target.checked);
                }}
                style={{ width: "16px", height: "16px" }}
              />
            </td>
            <td id="iccolumn" className="chapter-icon-sticky"><img src={imgchapterTrack} alt="" className="itico" /></td>
            <td className="tditem">VIP Chapter points</td>
            <td className="tdcenter">{vipChapterEnabled ? imgDone : imgCancel}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
            <td className="tdcenter">{frmtNb(vipChapterPendingTickets)}</td>
            <td className="tdcenter">{frmtNb(vipChapterEnabled ? vipChapterTickets : 0)}</td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
            <td className="tdcenter"></td>
          </tr>
        </tbody>
      </table>
    </>
  );
}








