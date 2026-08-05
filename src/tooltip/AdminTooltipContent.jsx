import React, { useEffect, useState } from "react";
import { formatHttpErrorMessage } from "../utils/http.js";
import { imgcancel } from "../constants/images.js";

export default function AdminTooltipContent({
    value,
    onAdminFetch = null,
    API_URL = "",
    onClose = null,
}) {
    const [adminSectionError, setAdminSectionError] = useState({});
    const [adminDaysRange, setAdminDaysRange] = useState("30");
    const [adminFarmId, setAdminFarmId] = useState("");
    const [adminActivityRange, setAdminActivityRange] = useState("30");
    const [adminActionLoading, setAdminActionLoading] = useState("");
    const [adminActionResult, setAdminActionResult] = useState("");
    const [adminImportProgress, setAdminImportProgress] = useState(null);
    const [adminFarmValidation, setAdminFarmValidation] = useState(null);
    const [adminVipFarmId, setAdminVipFarmId] = useState("");
    const [adminVipValidation, setAdminVipValidation] = useState(null);
    const [adminViewOverride, setAdminViewOverride] = useState(null);
    const [adminPanelsOpen, setAdminPanelsOpen] = useState({});
    const [adminCategoryGroupsOpen, setAdminCategoryGroupsOpen] = useState({});
    const [adminTokenDraft, setAdminTokenDraft] = useState("");
    const [adminServerMessage, setAdminServerMessage] = useState("");
    const [adminServerError, setAdminServerError] = useState("");
    const [adminItemsState, setAdminItemsState] = useState(null);
    const [adminSnapshotJob, setAdminSnapshotJob] = useState(null);
    const [adminAboListOpen, setAdminAboListOpen] = useState(false);
    const [adminVipListOpen, setAdminVipListOpen] = useState(true);

    const payload = (value && typeof value === "object") ? value : {};
    const viewRaw = adminViewOverride || payload?.view;
    const view = (viewRaw && typeof viewRaw === "object") ? viewRaw : {};
    const adminConfig = (view?.adminConfig && typeof view.adminConfig === "object") ? view.adminConfig : {};
    const adminLabels = (adminConfig?.labels && typeof adminConfig.labels === "object") ? adminConfig.labels : {};
    const adminMessages = (adminConfig?.messages && typeof adminConfig.messages === "object") ? adminConfig.messages : {};
    const adminUi = (view?.ui && typeof view.ui === "object") ? view.ui : {};
    const adminActionIds = Array.isArray(adminConfig?.actionIds) ? adminConfig.actionIds : [];
    const mobileBookmarklet = String(adminConfig?.mobileBookmarklet || "");
    const lines = Array.isArray(view?.lines) ? view.lines : [];
    const categories = Array.isArray(view?.categories) ? view.categories : [];
    const machineIp = String(view?.machineIp || payload?.view?.machineIp || "");
    const serverToken = (view?.serverToken && typeof view.serverToken === "object") ? view.serverToken : {};
    const vipAdmin = (view?.vipAdmin && typeof view.vipAdmin === "object") ? view.vipAdmin : {};
    const adminRangeOptions = Array.isArray(adminUi?.rangeOptions) ? adminUi.rangeOptions : [];
    const adminImportRangeOptions = Array.isArray(adminUi?.importRangeOptions) ? adminUi.importRangeOptions : [];
    const adminAboRows = Array.isArray(adminUi?.aboRows) ? adminUi.aboRows : [];
    const headerActionMessage = String(adminActionResult || adminServerMessage || "");
    const labelOr = (key) => String(adminLabels?.[key] || "");
    const messageOr = (key) => String(adminMessages?.[key] || "");
    const actionId = (idx) => String(adminActionIds?.[idx] || "");
    const isNumericFarmInput = (input) => /^[0-9]+$/.test(String(input || "").trim());

    const resolveAdminVipTarget = async (rawInput) => {
        const input = String(rawInput || "").trim();
        if (!input) {
            throw new Error(messageOr("farmIdRequired"));
        }

        if (isNumericFarmInput(input)) {
            const farmId = Number(input);
            if (!Number.isFinite(farmId) || farmId <= 0) {
                throw new Error(messageOr("farmIdRequired"));
            }
            return { farmId, username: String(adminVipValidation?.username || "") };
        }

        const response = await fetch(`${String(API_URL).replace(/\/$/, "")}/getfarm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ frmid: input }),
        });

        if (!response.ok) {
            throw new Error(await formatHttpErrorMessage(response, "/getfarm"));
        }

        const responseData = await response.json();
        const farmId = Number(
            responseData?.frmid
            || responseData?.farmData?.frmid
            || responseData?.farmData?._id
            || responseData?.result?.farmId
            || 0
        );
        if (!Number.isFinite(farmId) || farmId <= 0) {
            throw new Error("Unable to resolve VIP farm");
        }

        return {
            farmId,
            username: String(responseData?.username || responseData?.farmData?.username || "").trim(),
        };
    };

    useEffect(() => {
        const items = Array.isArray(view?.items) ? view.items : [];
        if (!items.length) {
            setAdminItemsState(null);
            return;
        }

        let closedCount = 0;
        let openCount = 0;
        const itemsDetails = [];

        items.forEach((item) => {
            const itemId = String(item?.id || item?.itemId || "");
            const itemName = String(item?.name || item?.itemName || itemId);
            const status = String(item?.status || "");
            const closed = status === "closed" || status === "ferme" || status === "fermé" || status === "locked" || status === "bloque" || status === "bloqué";
            const locked = status === "locked" || status === "bloque" || status === "bloqué";

            if (closed) {
                closedCount++;
                itemsDetails.push({ name: itemName, id: itemId, status });
            } else if (!locked) {
                openCount++;
            }
        });

        setAdminItemsState({
            closedCount,
            openCount,
            itemsDetails,
            total: items.length,
        });
    }, [view]);

    useEffect(() => {
        const nextJob = (adminUi?.snapshotJob && typeof adminUi.snapshotJob === "object") ? adminUi.snapshotJob : null;
        if (nextJob) setAdminSnapshotJob(nextJob);
    }, [adminUi?.snapshotJob]);

    const toggleAdminPanel = (panelId) => {
        setAdminPanelsOpen((prev) => ({ ...prev, [panelId]: !prev?.[panelId] }));
    };

    const isAdminPanelOpen = (panelId) => !!adminPanelsOpen?.[panelId];
    const getAboSummary = () => String(adminUi?.aboSummaryDefault || `${adminAboRows.length} farms ABO`);

    const loadSummary = async (nextDaysRange = adminDaysRange) => {
        if (typeof onAdminFetch !== "function") return;
        const days = Math.max(1, Number(nextDaysRange || 30));
        const end = new Date();
        const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000));
        const usersStart = start.toISOString();
        const usersEnd = end.toISOString();
        try {
            const responseData = await onAdminFetch({
                mode: "summary",
                usersStart,
                usersEnd,
            }, true);
            const nextView = (responseData?.view && typeof responseData.view === "object") ? responseData.view : null;
            if (!nextView) return;
            setAdminViewOverride(nextView);
            setAdminSectionError({});
        } catch (error) {
            setAdminSectionError((prev) => ({ ...prev, __summary__: String(error?.message || messageOr("summaryLoadFailed")) }));
        }
    };

    useEffect(() => {
        if (adminActionLoading !== actionId(1)) return undefined;
        const farmId = String(adminFarmId || "").trim();
        if (!farmId || typeof onAdminFetch !== "function") return undefined;

        let stopped = false;
        const poll = async () => {
            try {
                const responseData = await onAdminFetch({
                    action: actionId(3),
                    farmId,
                }, false);
                if (stopped) return;
                const nextProgress = (responseData?.result && typeof responseData.result === "object") ? responseData.result : null;
                setAdminImportProgress(nextProgress);
                if (!responseData?.running) {
                    setAdminActionLoading("");
                    if (String(nextProgress?.status || "") === "done") {
                        setAdminActionResult(String(nextProgress?.message || messageOr("importDone")));
                        await loadSummary(adminDaysRange);
                    } else if (String(nextProgress?.status || "") === "error") {
                        setAdminSectionError((prev) => ({ ...prev, __actions__: String(nextProgress?.error || nextProgress?.message || messageOr("importFailed")) }));
                    }
                    return;
                }
                window.setTimeout(poll, 1000);
            } catch (error) {
                if (stopped) return;
                setAdminSectionError((prev) => ({ ...prev, __actions__: String(error?.message || messageOr("progressUnavailable")) }));
                setAdminActionLoading("");
            }
        };

        const timer = window.setTimeout(poll, 600);
        return () => {
            stopped = true;
            window.clearTimeout(timer);
        };
    }, [adminActionLoading, adminFarmId]);

    useEffect(() => {
        const current = adminSnapshotJob && typeof adminSnapshotJob === "object" ? adminSnapshotJob : null;
        if (!current?.running || typeof onAdminFetch !== "function") return undefined;

        let stopped = false;
        const poll = async () => {
            try {
                const responseData = await onAdminFetch({ action: actionId(12) }, false);
                if (stopped) return;
                const nextJob = (responseData?.result && typeof responseData.result === "object") ? responseData.result : null;
                setAdminSnapshotJob(nextJob);
                if (!responseData?.running) {
                    if (String(nextJob?.status || "") === "done") {
                        setAdminServerMessage(String(nextJob?.message || messageOr("buildSnapshotsStarted")));
                        await loadSummary(adminDaysRange);
                    } else if (String(nextJob?.status || "") === "error") {
                        setAdminServerError(String(nextJob?.error || nextJob?.message || messageOr("buildSnapshotsFailed")));
                    } else if (String(nextJob?.status || "") === "stopped") {
                        setAdminServerMessage(String(nextJob?.message || messageOr("stopSnapshotsRequested")));
                        await loadSummary(adminDaysRange);
                    }
                }
            } catch (error) {
                if (!stopped) setAdminServerError(String(error?.message || messageOr("buildSnapshotsFailed")));
            }
        };

        const timer = setInterval(poll, 5000);
        poll();
        return () => {
            stopped = true;
            clearInterval(timer);
        };
    }, [adminSnapshotJob?.running, onAdminFetch, adminDaysRange]);

    const resetAdminFarmValidation = () => {
        setAdminFarmValidation(null);
        setAdminImportProgress(null);
        setAdminActionResult("");
        setAdminSectionError((prev) => ({ ...prev, __actions__: "" }));
    };

    const resetAdminVipValidation = () => {
        setAdminVipValidation(null);
        setAdminActionResult("");
        setAdminSectionError((prev) => ({ ...prev, __vip__: "" }));
    };

    const validateAdminFarm = async () => {
        if (typeof onAdminFetch !== "function") return;
        const farmId = String(adminFarmId || "").trim();
        if (!farmId) {
            setAdminSectionError((prev) => ({ ...prev, __actions__: messageOr("farmIdRequired") }));
            return;
        }
        setAdminActionLoading(actionId(0));
        setAdminActionResult("");
        setAdminSectionError((prev) => ({ ...prev, __actions__: "" }));
        try {
            const responseData = await onAdminFetch({
                action: actionId(0),
                farmId,
            }, true);
            const result = (responseData?.result && typeof responseData.result === "object") ? responseData.result : null;
            setAdminFarmValidation({
                farmId,
                checked: true,
                days: Number(result?.days || 0),
                minDate: String(result?.minDate || ""),
                maxDate: String(result?.maxDate || ""),
                existed: !!result?.existed,
            });
            setAdminActionResult(String(responseData?.message || messageOr("farmValidated")));
        } catch (error) {
            setAdminFarmValidation(null);
            setAdminSectionError((prev) => ({ ...prev, __actions__: String(error?.message || messageOr("validationFailed")) }));
        } finally {
            setAdminActionLoading("");
        }
    };

    const runAdminAction = async (action) => {
        if (typeof onAdminFetch !== "function") return;
        const farmId = String(adminFarmId || "").trim();
        if (!farmId) {
            setAdminSectionError((prev) => ({ ...prev, __actions__: messageOr("farmIdRequired") }));
            return;
        }
        if (!adminFarmValidation?.checked || String(adminFarmValidation?.farmId || "") !== farmId) {
            setAdminSectionError((prev) => ({ ...prev, __actions__: messageOr("validateFarmFirst") }));
            return;
        }
        setAdminActionLoading(action);
        setAdminActionResult("");
        setAdminSectionError((prev) => ({ ...prev, __actions__: "" }));
        try {
            let responseData = null;
            if (action === actionId(1)) {
                responseData = await onAdminFetch({
                    action,
                    farmId,
                    range: adminActivityRange,
                }, true);
                const nextProgress = (responseData?.result && typeof responseData.result === "object") ? responseData.result : null;
                setAdminImportProgress(nextProgress);
                setAdminActionResult(String(responseData?.message || messageOr("importStarted")));
                return;
            }
            if (action === actionId(2)) {
                const confirmed = window.confirm(`${messageOr("deleteActivityConfirmPrefix")}${farmId}?`);
                if (!confirmed) return;
                responseData = await onAdminFetch({
                    action,
                    farmId,
                }, true);
                setAdminFarmValidation((prev) => prev ? ({
                    ...prev,
                    days: 0,
                    minDate: "",
                    maxDate: "",
                    existed: false,
                }) : prev);
            }
            const message = String(responseData?.message || messageOr("actionCompleted"));
            setAdminActionResult(message);
            setAdminImportProgress(null);
            await loadSummary(adminDaysRange);
        } catch (error) {
            setAdminSectionError((prev) => ({ ...prev, __actions__: String(error?.message || messageOr("actionFailed")) }));
        } finally {
            if (action !== actionId(1)) {
                setAdminActionLoading("");
            }
        }
    };

    const validateAdminVipFarm = async () => {
        if (typeof onAdminFetch !== "function") return;
        const rawFarmId = String(adminVipFarmId || "").trim();
        if (!rawFarmId) {
            setAdminSectionError((prev) => ({ ...prev, __vip__: messageOr("farmIdRequired") }));
            return;
        }
        setAdminActionLoading(actionId(4));
        setAdminActionResult("");
        setAdminSectionError((prev) => ({ ...prev, __vip__: "" }));
        try {
            const target = await resolveAdminVipTarget(rawFarmId);
            const responseData = await onAdminFetch({
                action: actionId(4),
                farmId: target.farmId,
            }, true);
            const result = (responseData?.result && typeof responseData.result === "object") ? responseData.result : null;
            setAdminVipValidation({
                farmId: target.farmId,
                checked: true,
                username: String(result?.username || target.username || ""),
                active: !!result?.active,
                isLifetime: !!result?.isLifetime,
                inAboFile: !!result?.inAboFile,
                hasTempSubscription: !!result?.hasTempSubscription,
                expiresAt: Number(result?.expiresAt || 0),
            });
            setAdminVipFarmId(rawFarmId);
            setAdminActionResult(String(responseData?.message || messageOr("vipChecked")));
        } catch (error) {
            setAdminVipValidation(null);
            setAdminSectionError((prev) => ({ ...prev, __vip__: String(error?.message || messageOr("vipValidationFailed")) }));
        } finally {
            setAdminActionLoading("");
        }
    };

    const runAdminVipAction = async (action) => {
        if (typeof onAdminFetch !== "function") return;
        setAdminActionLoading(action);
        setAdminActionResult("");
        setAdminSectionError((prev) => ({ ...prev, __vip__: "" }));
        try {
            const rawFarmId = String(adminVipFarmId || "").trim();
            const target = adminVipValidation?.checked && Number(adminVipValidation?.farmId || 0) > 0
                ? { farmId: Number(adminVipValidation.farmId), username: String(adminVipValidation.username || "") }
                : await resolveAdminVipTarget(rawFarmId);
            const confirmed = action === actionId(7)
                ? window.confirm(`${messageOr("removeVipConfirmPrefix")}${target.farmId}?`)
                : true;
            if (!confirmed) return;
            const responseData = await onAdminFetch({
                action,
                farmId: target.farmId,
                username: String(adminVipValidation?.username || target.username || ""),
            }, true);
            const result = (responseData?.result && typeof responseData.result === "object") ? responseData.result : null;
            setAdminVipValidation({
                farmId: target.farmId,
                checked: true,
                username: String(result?.username || adminVipValidation?.username || target.username || ""),
                active: !!result?.active,
                isLifetime: !!result?.isLifetime,
                inAboFile: !!result?.inAboFile,
                hasTempSubscription: !!result?.hasTempSubscription,
                expiresAt: Number(result?.expiresAt || 0),
            });
            setAdminActionResult(String(responseData?.message || messageOr("vipActionCompleted")));
        } catch (error) {
            setAdminSectionError((prev) => ({ ...prev, __vip__: String(error?.message || messageOr("vipActionFailed")) }));
        } finally {
            setAdminActionLoading("");
        }
    };

    const updateAdminEnvToken = async () => {
        if (typeof onAdminFetch !== "function") return;
        const token = String(adminTokenDraft || "").trim();
        if (!token) {
            setAdminServerError(messageOr("tokenRequired"));
            return;
        }
        setAdminActionLoading(actionId(8));
        setAdminActionResult("");
        setAdminServerMessage("");
        setAdminServerError("");
        try {
            const responseData = await onAdminFetch({
                action: actionId(8),
                token,
            }, true);
            setAdminServerMessage(String(responseData?.message || messageOr("tokenUpdated")));
            setAdminTokenDraft("");
            await loadSummary(adminDaysRange);
        } catch (error) {
            setAdminServerError(String(error?.message || messageOr("tokenUpdateFailed")));
        } finally {
            setAdminActionLoading("");
        }
    };

    const restartAdminServer = async () => {
        if (typeof onAdminFetch !== "function") return;
        const confirmed = window.confirm(messageOr("restartConfirm"));
        if (!confirmed) return;
        setAdminActionLoading(actionId(9));
        setAdminActionResult("");
        setAdminServerMessage("");
        setAdminServerError("");
        try {
            const responseData = await onAdminFetch({
                action: actionId(9),
            }, true);
            setAdminServerMessage(String(responseData?.message || messageOr("restartRequested")));
        } catch (error) {
            setAdminServerError(String(error?.message || messageOr("restartFailed")));
        } finally {
            setAdminActionLoading("");
        }
    };

    const startSnapshotBuild = async () => {
        if (typeof onAdminFetch !== "function") return;
        const confirmed = window.confirm(messageOr("buildSnapshotsConfirm"));
        if (!confirmed) return;
        setAdminActionLoading(actionId(10));
        setAdminActionResult("");
        setAdminServerMessage("");
        setAdminServerError("");
        try {
            const responseData = await onAdminFetch({ action: actionId(10) }, true);
            const nextJob = (responseData?.result && typeof responseData.result === "object") ? responseData.result : null;
            setAdminSnapshotJob(nextJob);
            setAdminServerMessage(String(responseData?.message || messageOr("buildSnapshotsStarted")));
        } catch (error) {
            setAdminServerError(String(error?.message || messageOr("buildSnapshotsFailed")));
        } finally {
            setAdminActionLoading("");
        }
    };

    const stopSnapshotBuild = async () => {
        if (typeof onAdminFetch !== "function") return;
        const confirmed = window.confirm(messageOr("stopSnapshotsConfirm"));
        if (!confirmed) return;
        setAdminActionLoading(actionId(11));
        setAdminActionResult("");
        setAdminServerMessage("");
        setAdminServerError("");
        try {
            const responseData = await onAdminFetch({ action: actionId(11) }, true);
            const nextJob = (responseData?.result && typeof responseData.result === "object") ? responseData.result : null;
            setAdminSnapshotJob(nextJob);
            setAdminServerMessage(String(responseData?.message || messageOr("stopSnapshotsRequested")));
        } catch (error) {
            setAdminServerError(String(error?.message || messageOr("stopSnapshotsFailed")));
        } finally {
            setAdminActionLoading("");
        }
    };

    const copyMobileTokenBookmarklet = async () => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(mobileBookmarklet);
                setAdminServerMessage(messageOr("bookmarkletCopied"));
            } else {
                setAdminServerMessage(mobileBookmarklet);
            }
            setAdminServerError("");
        } catch (error) {
            setAdminServerError(String(error?.message || messageOr("bookmarkletCopyFailed")));
        }
    };

    const pasteTokenFromClipboard = async () => {
        try {
            if (!navigator?.clipboard?.readText) {
                throw new Error(messageOr("clipboardReadUnavailable"));
            }
            const txt = String(await navigator.clipboard.readText() || "").trim();
            if (!txt) {
                throw new Error(messageOr("clipboardEmpty"));
            }
            setAdminTokenDraft(txt);
            setAdminServerMessage(messageOr("tokenPasted"));
            setAdminServerError("");
        } catch (error) {
            setAdminServerError(String(error?.message || messageOr("clipboardPasteFailed")));
        }
    };

    const getCategorySummary = (cat) => {
        const catId = String(cat?.id || "");
        const baseSummary = String(adminUi?.categorySummaries?.[catId] || "");
        if (catId !== "server") return baseSummary;

        const catLines = Array.isArray(cat?.lines) ? cat.lines : [];
        const uptimeLine = catLines.find((line) => String(line || "").startsWith("Uptime: "));
        const uptimeSummary = String(uptimeLine || "");
        if (!uptimeSummary) return baseSummary;
        if (!baseSummary) return uptimeSummary;
        if (baseSummary.includes(uptimeSummary)) return baseSummary;
        return `${baseSummary} | ${uptimeSummary}`;
    };

    const extractErrorLocation = (txt) => {
        const source = String(txt || "").trim();
        if (!source) return "";

        const patterns = [
            /([A-Za-z]:\\.+?\.(?:js|jsx|ts|tsx|mjs|cjs|json):\d+(?::\d+)?)/,
            /([A-Za-z0-9_./\\-]+\.(?:js|jsx|ts|tsx|mjs|cjs|json):\d+(?::\d+)?)/,
            /([A-Za-z]:\\.+?\.(?:js|jsx|ts|tsx|mjs|cjs|json))\s+line\s+(\d+)(?:\s+col(?:umn)?\s+(\d+))?/i,
            /([A-Za-z0-9_./\\-]+\.(?:js|jsx|ts|tsx|mjs|cjs|json))\s+line\s+(\d+)(?:\s+col(?:umn)?\s+(\d+))?/i,
        ];

        for (let i = 0; i < patterns.length; i += 1) {
            const match = source.match(patterns[i]);
            if (!match) continue;
            if (i < 2) return String(match[1] || "").trim();
            const fileName = String(match[1] || "").trim();
            const lineNumber = String(match[2] || "").trim();
            const colNumber = String(match[3] || "").trim();
            return `${fileName}:${lineNumber}${colNumber ? `:${colNumber}` : ""}`;
        }
        return "";
    };

    const parseAdminErrorLocationParts = (value) => {
        const location = extractErrorLocation(value);
        if (!location) return { file: "", line: "" };
        const match = location.match(/^(.+?):(\d+)(?::\d+)?$/);
        const rawFile = String(match?.[1] || location || "").trim();
        const file = rawFile.split(/[\\/]/).filter(Boolean).pop() || rawFile;
        return {
            file,
            line: String(match?.[2] || "").trim(),
            raw: location,
        };
    };

    const compactAdminErrorDescription = (value) => {
        let text = String(value || "").trim();
        const fallbackText = text
            .replace(/^\[[^\]]+\]\s*:\s*/i, "")
            .replace(/^\d{2}\/\d{2}\/\d{2}:\d{2}(?::\d{2})?\s*-\s*/i, "")
            .trim();
        if (!text) return "Erreur serveur";
        text = text
            .replace(/^\[[^\]]+\]\s*:\s*/i, "")
            .replace(/^\d{2}\/\d{2}\/\d{2}:\d{2}(?::\d{2})?\s*-\s*/i, "")
            .replace(/^\d{2}\/\d{2}(?:\/\d{4})?\s+\d{2}:\d{2}(?::\d{2})?\s*[-:]\s*/i, "")
            .replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s*-\s*/i, "")
            .replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s*\|\s*/i, "")
            .replace(/^\s*(ERROR|WARN(?:ING)?|INFO|DEBUG)\s*\|\s*/i, "")
            .replace(/^\s*(Uncaught Exception|Unhandled Rejection|UncaughtExceptionMonitor)\s*[-:|]?\s*/i, "")
            .replace(/^Crash detected \(no correlated reason in crash logs\)$/i, "Crash serveur sans erreur correlee")
            .replace(/^Error\s*:\s*/i, "")
            .trim();

        const pipeParts = text.split("|").map((part) => part.trim()).filter(Boolean);
        if (pipeParts.length >= 2 && /^(ERROR|WARN(?:ING)?|INFO|DEBUG|OS scan\s*:?)$/i.test(pipeParts[0])) {
            pipeParts.shift();
        }
        if (pipeParts.length >= 2 && /^[A-Za-z0-9_.:-]+$/.test(pipeParts[0])) {
            text = pipeParts.slice(1).join(" | ");
        } else if (pipeParts.length > 0) {
            text = pipeParts.join(" | ");
        }

        text = text
            .replace(/\s+\|\s+[A-Za-z]:\\.+?\.(?:js|jsx|ts|tsx|mjs|cjs|json):\d+(?::\d+)?\s*$/i, "")
            .replace(/\s+\|\s+[A-Za-z0-9_./\\-]+\.(?:js|jsx|ts|tsx|mjs|cjs|json):\d+(?::\d+)?\s*$/i, "")
            .trim();

        if (text.length > 110) text = `${text.slice(0, 107).trim()}...`;
        return text || fallbackText || "Erreur serveur";
    };

    const parseAdminErrorPipeFields = (value) => {
        const clean = String(value || "")
            .replace(/^x\d+(?:\s*\|\s*|\s+)/i, "")
            .replace(/^[A-Za-z][A-Za-z\s]+error\s*:\s*/i, "")
            .replace(/^\[[^\]]+\]\s*:\s*/i, "")
            .replace(/^\d{2}\/\d{2}\/\d{2}:\d{2}(?::\d{2})?\s*-\s*/i, "")
            .replace(/^\d{2}\/\d{2}(?:\/\d{4})?\s+\d{2}:\d{2}(?::\d{2})?\s*[-:]\s*/i, "")
            .replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s*[-|]\s*/i, "")
            .trim();
        const parts = clean.split("|").map((part) => part.trim()).filter(Boolean);
        if (parts.length < 2) return { source: "", description: "" };
        if (/^(ERROR|WARN(?:ING)?|INFO|DEBUG)$/i.test(parts[0])) {
            return {
                source: String(parts[1] || "").trim(),
                description: parts.slice(2).join(" | ").trim(),
            };
        }
        return { source: "", description: "" };
    };

    const isLikelyAdminErrorMessage = (value) => {
        const txt = String(value || "").trim();
        if (!txt) return false;
        return /(?:type|reference|syntax|range|eval|uri)?error\b|exception|rejection|cannot |crash|don't know|undefined|failed|timeout|econnreset|enoent/i.test(txt);
    };

    const sanitizeAdminErrorSource = (value, description = "") => {
        const source = String(value || "").trim();
        if (!source) return "";
        const desc = String(description || "").trim();
        if (desc && source.toLowerCase() === desc.toLowerCase()) return "";
        if (source.length > 80) return "";
        if (isLikelyAdminErrorMessage(source)) return "";
        return source;
    };

    const formatAdminErrorDate = (value) => {
        const txt = String(value || "").trim();
        if (!txt) return "";
        const dt = new Date(txt);
        if (Number.isNaN(dt.getTime())) return "";
        const dd = String(dt.getDate()).padStart(2, "0");
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const hh = String(dt.getHours()).padStart(2, "0");
        const mi = String(dt.getMinutes()).padStart(2, "0");
        return `${dd}/${mm}/${hh}:${mi}`;
    };

    const formatLegacyAdminErrorDate = (value) => {
        const txt = String(value || "").trim();
        const match = txt.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::\d{2})?$/);
        if (!match) return "";
        return `${match[1]}/${match[2]}/${match[4]}:${match[5]}`;
    };

    const formatLocalAdminErrorDate = (value) => {
        const txt = String(value || "").trim().replace(",", " ");
        const match = txt.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?\s+(\d{2}):(\d{2})(?::\d{2})?$/);
        if (!match) return "";
        return `${match[1]}/${match[2]}/${match[4]}:${match[5]}`;
    };

    const formatSlashAdminErrorDate = (value) => {
        const txt = String(value || "").trim();
        const match = txt.match(/^(\d{2})\/(\d{2})\/(\d{2}):(\d{2})(?::\d{2})?$/);
        if (!match) return "";
        return `${match[1]}/${match[2]}/${match[3]}:${match[4]}`;
    };

    const extractErrorDate = (row) => {
        if (row && typeof row === "object" && !Array.isArray(row)) {
            const candidates = [
                row?.date,
                row?.timestamp,
                row?.time,
                row?.createdAt,
                row?.occurredAt,
                row?.dumpEventTime,
            ];
            for (let i = 0; i < candidates.length; i += 1) {
                const formatted = formatAdminErrorDate(candidates[i]);
                if (formatted) return formatted;
                const legacyFormatted = formatLegacyAdminErrorDate(candidates[i]);
                if (legacyFormatted) return legacyFormatted;
                const localFormatted = formatLocalAdminErrorDate(candidates[i]);
                if (localFormatted) return localFormatted;
                const slashFormatted = formatSlashAdminErrorDate(candidates[i]);
                if (slashFormatted) return slashFormatted;
            }
            return "";
        }

        const raw = String(row || "").trim();
        if (!raw) return "";
        const normalizedRaw = raw
            .replace(/^x\d+(?:\s*\|\s*|\s+)/i, "")
            .replace(/^[A-Za-z][A-Za-z\s]+error\s*:\s*/i, "")
            .trim();
        const legacyBracket = normalizedRaw.match(/^\[(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}(?::\d{2})?)\]\s*:/);
        if (legacyBracket) {
            const formatted = formatLegacyAdminErrorDate(legacyBracket[1]);
            if (formatted) return formatted;
        }
        const slashPrefix = normalizedRaw.match(/^(\d{2}\/\d{2}\/\d{2}:\d{2}(?::\d{2})?)\s*-/);
        if (slashPrefix) {
            const formatted = formatSlashAdminErrorDate(slashPrefix[1]);
            if (formatted) return formatted;
        }
        const bracketIso = normalizedRaw.match(/^\[([^\]]+)\]\s*:/);
        if (bracketIso) {
            const formatted = formatAdminErrorDate(bracketIso[1]);
            if (formatted) return formatted;
            const localFormatted = formatLocalAdminErrorDate(bracketIso[1]);
            if (localFormatted) return localFormatted;
            const slashFormatted = formatSlashAdminErrorDate(bracketIso[1]);
            if (slashFormatted) return slashFormatted;
        }
        const looseIso = normalizedRaw.match(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\b/);
        if (looseIso) {
            return formatAdminErrorDate(looseIso[1]);
        }
        return "";
    };

    const formatAdminErrorRow = (row) => {
        const datePrefix = extractErrorDate(row);
        const separator = " | ";
        if (row && typeof row === "object" && !Array.isArray(row)) {
            const count = Math.max(1, Number(row?.count || row?.iterations || row?.iteration || row?.occurrences || 1));
            const shortDescription = String(
                row?.shortDescription
                || row?.descriptionShort
                || row?.description
                || row?.reason
                || row?.message
                || row?.error
                || row?.title
                || ""
            ).trim();
            const fileNameRaw = String(row?.file || row?.fileName || row?.source || "").trim();
            const fileName = fileNameRaw.split(/[\\/]/).filter(Boolean).pop() || fileNameRaw;
            const lineNumber = String(row?.line || row?.lineNumber || "").trim();
            const parsedLocation = parseAdminErrorLocationParts(
                    row?.location
                    || row?.stack
                    || row?.frame
                    || row?.sourceLocation
                    || ""
                );
            const desc = compactAdminErrorDescription(shortDescription);
            const source = sanitizeAdminErrorSource(fileName || parsedLocation.file, desc);
            return [count, datePrefix || "-", desc, source || "-", lineNumber || parsedLocation.line || "-"].join(separator);
        }

        const raw = String(row || "").trim();
        if (!raw) return "";

        const duplicatePrefixMatch = raw.match(/^(x\d+)(?:\s*\|\s*|\s+)/i);
        const count = duplicatePrefixMatch ? String(duplicatePrefixMatch[1] || "").replace(/^x/i, "") : "1";
        const pipeFields = parseAdminErrorPipeFields(raw);

        let text = raw
            .replace(/^x\d+(?:\s*\|\s*|\s+)/i, "")
            .replace(/^[A-Za-z][A-Za-z\s]+error\s*:\s*/i, "")
            .replace(/^\[[^\]]+\]\s*:\s*/, "")
            .trim();

        const locationParts = parseAdminErrorLocationParts(text);
        if (locationParts.raw) {
            text = text
                .replace(new RegExp(`\\s*\\|\\s*${locationParts.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`), "")
                .replace(new RegExp(`${locationParts.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`), "")
                .trim();
        }

        const desc = compactAdminErrorDescription(pipeFields.description || text);
        const source = sanitizeAdminErrorSource(locationParts.file || pipeFields.source, desc);
        return [count || "1", datePrefix || "-", desc, source || "-", locationParts.line || "-"].join(separator);
    };

    const getActivitySummary = () => String(adminUi?.activitySummaryDefault || "");
    const getVipSummary = () => String(adminUi?.vipSummaryDefault || "");
    const snapshotJob = (adminSnapshotJob && typeof adminSnapshotJob === "object")
        ? adminSnapshotJob
        : ((adminUi?.snapshotJob && typeof adminUi.snapshotJob === "object") ? adminUi.snapshotJob : null);
    const snapshotRunning = !!snapshotJob?.running;
    const snapshotCanStop = !!snapshotJob?.canStop;
    const snapshotMemory = snapshotJob?.memory && typeof snapshotJob.memory === "object" ? snapshotJob.memory : null;

    return (
        <>
            <div style={{
                position: "sticky",
                top: 0,
                zIndex: 3,
                margin: "-4px -4px 8px -4px",
                padding: "6px 8px 8px 8px",
                background: "rgba(24, 16, 12, 0.96)",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(4px)",
            }}>
                <div className="horizontal" style={{ gap: 8, height: "auto", alignItems: "center", justifyContent: "space-between" }}>
                    <div className="horizontal" style={{ gap: 8, height: "auto", alignItems: "center" }}>
                        <div><b>{String(view?.title || "Admin")}</b></div>
                        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, opacity: 0.8 }}>{labelOr("range")}</span>
                            <select
                                name="adminDaysRange"
                                value={String(adminDaysRange)}
                                onChange={(e) => {
                                    const nextVal = String(e?.target?.value || "30");
                                    setAdminDaysRange(nextVal);
                                    loadSummary(nextVal);
                                }}
                                style={{ height: 22 }}
                            >
                                {adminRangeOptions.map((option) => (
                                    <option key={String(option.value)} value={String(option.value)}>
                                        {String(option.label)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <button onClick={() => { if (typeof onClose === "function") onClose(); }} className="button">
                        <img src={imgcancel} alt="" className="resico" />
                    </button>
                </div>
                <div style={{ minHeight: 18, marginTop: 6, color: "#9ee6a0", fontSize: 12 }}>
                    {headerActionMessage || ""}
                </div>
            </div>

            {String(view?.error || "") ? <div style={{ color: "#ff8e8e" }}>{String(view.error)}</div> : null}
            {String(adminSectionError?.__summary__ || "") ? <div style={{ color: "#ff8e8e" }}>{String(adminSectionError.__summary__)}</div> : null}

            {categories.length > 0 ? categories.map((cat, catIdx) => {
                const title = String(cat?.title || `Category ${catIdx + 1}`);
                const catLines = Array.isArray(cat?.lines) ? cat.lines : [];
                const catGroups = Array.isArray(cat?.groups) ? cat.groups : [];
                const isServerCategory = String(cat?.id || "") === "server";
                const isErrorsCategory = String(cat?.id || "") === "errors";
                const panelId = `category:${String(cat?.id || catIdx)}`;
                const isPanelOpen = isAdminPanelOpen(panelId);
                return (
                    <div
                        key={`adm-cat-${catIdx}`}
                        style={{
                            marginTop: 8,
                            border: "1px solid rgba(255,255,255,0.22)",
                            borderRadius: 8,
                            padding: "6px 8px",
                            background: "rgba(255,255,255,0.03)",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => toggleAdminPanel(panelId)}
                            style={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                                background: "transparent",
                                color: "inherit",
                                border: "none",
                                padding: 0,
                                textAlign: "left",
                                cursor: "pointer",
                            }}
                        >
                            <span style={{ fontWeight: 700 }}>{isPanelOpen ? "v" : ">"} {title}</span>
                            <span style={{ fontSize: 11, opacity: 0.78, textAlign: "right" }}>{getCategorySummary(cat)}</span>
                        </button>
                        {isPanelOpen ? (
                            <>
                                <div style={{ marginTop: 6 }}>
                                    {catLines.length > 0 ? catLines.map((line, idx) => {
                                        const renderedLine = isErrorsCategory ? formatAdminErrorRow(line) : String(line || "");
                                        return (
                                            <div
                                                key={`adm-cat-line-${catIdx}-${idx}`}
                                                title={isErrorsCategory ? renderedLine : undefined}
                                                style={isErrorsCategory ? {
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                } : undefined}
                                            >
                                                {renderedLine}
                                            </div>
                                        );
                                    }) : <div>{labelOr("noData")}</div>}
                                </div>
                                {isServerCategory ? (
                                    <>
                                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
                                            <label style={{ display: "flex", flexDirection: "column", gap: 3, flex: "1 1 320px" }}>
                                                <span style={{ fontSize: 10, opacity: 0.8 }}>
                                                    {labelOr("newToken")}
                                                    {String(serverToken?.expiresAtLocal || "") ? ` | ${labelOr("currentToken")}: ${String(serverToken.expiresAtLocal)}` : ""}
                                                </span>
                                                <input
                                                    type="text"
                                                    value={adminTokenDraft}
                                                    onChange={(e) => setAdminTokenDraft(String(e?.target?.value || ""))}
                                                    placeholder={labelOr("tokenPlaceholder")}
                                                />
                                            </label>
                                            <button className="graph-tab-btn" onClick={updateAdminEnvToken} disabled={adminActionLoading !== ""}>
                                                {adminActionLoading === actionId(8) ? labelOr("updating") : labelOr("replaceToken")}
                                            </button>
                                            <button className="graph-tab-btn" onClick={pasteTokenFromClipboard} disabled={adminActionLoading !== ""}>
                                                {labelOr("pasteClipboard")}
                                            </button>
                                            <button className="graph-tab-btn" onClick={copyMobileTokenBookmarklet} disabled={adminActionLoading !== ""}>
                                                {labelOr("copyMobileGetter")}
                                            </button>
                                            <button className="graph-tab-btn" onClick={restartAdminServer} disabled={adminActionLoading !== ""}>
                                                {adminActionLoading === actionId(9) ? labelOr("restart") + "..." : labelOr("restartServer")}
                                            </button>
                                        </div>
                                        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.8 }}>
                                            {labelOr("mobileHelp")}
                                        </div>
                                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                                            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 5 }}>{labelOr("snapshots")}</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                                <button
                                                    className="graph-tab-btn"
                                                    onClick={startSnapshotBuild}
                                                    disabled={adminActionLoading !== "" || snapshotRunning}
                                                >
                                                    {adminActionLoading === actionId(10) ? `${labelOr("buildSnapshots")}...` : labelOr("buildSnapshots")}
                                                </button>
                                                <button
                                                    className="graph-tab-btn"
                                                    onClick={stopSnapshotBuild}
                                                    disabled={adminActionLoading !== "" || !snapshotRunning || !snapshotCanStop}
                                                >
                                                    {adminActionLoading === actionId(11) ? `${labelOr("stopSnapshots")}...` : labelOr("stopSnapshots")}
                                                </button>
                                                <span style={{ fontSize: 11, opacity: 0.86 }}>
                                                    {labelOr("snapshotStatus")}: {String(snapshotJob?.status || "idle")}
                                                    {Number(snapshotJob?.processed || 0) > 0 ? ` | farms: ${Number(snapshotJob.processed || 0)}` : ""}
                                                    {snapshotMemory ? ` | rss: ${Number(snapshotMemory.rss || 0)} MB` : ""}
                                                </span>
                                            </div>
                                            {String(snapshotJob?.message || "") ? (
                                                <div style={{ marginTop: 4, fontSize: 11, opacity: 0.78 }}>{String(snapshotJob.message)}</div>
                                            ) : null}
                                        </div>
                                        {String(adminServerError || "") ? <div style={{ color: "#ff8e8e", marginTop: 6 }}>{String(adminServerError)}</div> : null}
                                        {String(adminServerMessage || "") ? <div style={{ color: "#9ee6a0", marginTop: 6 }}>{String(adminServerMessage)}</div> : null}
                                    </>
                                ) : null}
                                {catGroups.length > 0 ? catGroups.map((group, gIdx) => {
                                    const gId = `${String(cat?.id || catIdx)}::${String(group?.id || gIdx)}`;
                                    const isGroupOpen = !!adminCategoryGroupsOpen[gId];
                                    const rows = Array.isArray(group?.rows) ? group.rows : [];
                                    const isAdminErrorGroup = ["latestCrashes", "latestErrors"].includes(String(group?.id || ""));
                                    return (
                                        <div key={`adm-cat-group-${gId}`} style={{ marginTop: 6 }}>
                                            <button
                                                className="graph-tab-btn"
                                                onClick={() => setAdminCategoryGroupsOpen((prev) => ({ ...prev, [gId]: !isGroupOpen }))}
                                            >
                                                {isGroupOpen ? "v" : ">"} {String(group?.title || "Details")} ({rows.length})
                                            </button>
                                            {isGroupOpen ? (
                                                isAdminErrorGroup ? (
                                                    <div style={{ marginTop: 4, fontSize: 11 }}>
                                                        {rows.length > 0 ? rows.map((r, rowIdx) => (
                                                            <div
                                                                key={`adm-cat-group-row-${gId}-${rowIdx}`}
                                                                title={formatAdminErrorRow(r)}
                                                                style={{
                                                                    whiteSpace: "nowrap",
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                }}
                                                            >
                                                                {formatAdminErrorRow(r)}
                                                            </div>
                                                        )) : labelOr("noData")}
                                                    </div>
                                                ) : (
                                                    <pre style={{ whiteSpace: "pre-wrap", marginTop: 4, fontSize: 11 }}>
                                                        {rows.length > 0 ? rows.map((r) => String(r || "")).join("\n") : labelOr("noData")}
                                                    </pre>
                                                )
                                            ) : null}
                                        </div>
                                    );
                                }) : null}
                            </>
                        ) : null}
                    </div>
                );
            }) : lines.map((line, idx) => (
                <div key={`adm-line-${idx}`}>{String(line || "")}</div>
            ))}

            <div style={{
                marginTop: 12,
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
            }}>
                <button
                    type="button"
                    onClick={() => toggleAdminPanel("activity")}
                    style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        background: "transparent",
                        color: "inherit",
                        border: "none",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                    }}
                >
                    <span style={{ fontWeight: 700 }}>{isAdminPanelOpen("activity") ? "v" : ">"} {labelOr("titleActivity")}</span>
                    <span style={{ fontSize: 11, opacity: 0.78, textAlign: "right" }}>{getActivitySummary()}</span>
                </button>
                {isAdminPanelOpen("activity") ? (
                    <>
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
                            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <span>{labelOr("farmId")}</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={adminFarmId}
                                    onChange={(e) => {
                                        setAdminFarmId(String(e?.target?.value || ""));
                                        resetAdminFarmValidation();
                                    }}
                                    style={{ minWidth: 120 }}
                                />
                            </label>
                            <button className="graph-tab-btn" onClick={validateAdminFarm} disabled={adminActionLoading !== ""}>
                                {adminActionLoading === actionId(0) ? labelOr("checking") : labelOr("validate")}
                            </button>
                            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <span style={{ fontSize: 10, opacity: 0.8 }}>{labelOr("importRange")}</span>
                                <select
                                    name="adminActivityRange"
                                    value={String(adminActivityRange)}
                                    onChange={(e) => setAdminActivityRange(String(e?.target?.value || "30"))}
                                    style={{ height: 22 }}
                                >
                                    {adminImportRangeOptions.map((option) => (
                                        <option key={String(option.value)} value={String(option.value)}>
                                            {String(option.label)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                className="graph-tab-btn"
                                onClick={() => runAdminAction(actionId(1))}
                                disabled={adminActionLoading !== "" || !adminFarmValidation?.checked}
                            >
                                {adminActionLoading === actionId(1) ? labelOr("importing") : labelOr("importAction")}
                            </button>
                            <button
                                className="graph-tab-btn"
                                onClick={() => runAdminAction(actionId(2))}
                                disabled={adminActionLoading !== "" || !adminFarmValidation?.checked}
                            >
                                {adminActionLoading === actionId(2) ? labelOr("deleting") : labelOr("deleteAction")}
                            </button>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.8 }}>
                            Actions executees sur la Mongo locale du backend Admin ({machineIp || "IP inconnue"}).
                        </div>
                        {adminFarmValidation?.checked ? (
                            <div style={{ marginTop: 6, fontSize: 12 }}>
                                <div>Validated farm: {String(adminFarmValidation.farmId)}</div>
                                <div>Activity days in DB: {Number(adminFarmValidation.days || 0)}</div>
                                {adminFarmValidation.existed ? (
                                    <div>Range in DB: {String(adminFarmValidation.minDate || "-")} - {String(adminFarmValidation.maxDate || "-")}</div>
                                ) : (
                                    <div>No Activity history in DB for this farm.</div>
                                )}
                            </div>
                        ) : null}
                        {adminItemsState ? (
                            <div style={{
                                marginTop: 8,
                                padding: "6px 8px",
                                background: "rgba(255, 100, 100, 0.1)",
                                border: "1px solid rgba(255, 100, 100, 0.3)",
                                borderRadius: 4,
                                fontSize: 11,
                                color: "#ff8e8e",
                                fontFamily: "monospace"
                            }}>
                                <div><b>Blocs fermes :</b> {adminItemsState.closedCount || 0}</div>
                                <div><b>Blocs ouverts :</b> {adminItemsState.openCount || 0}</div>
                                <div><b>Total :</b> {adminItemsState.total || 0}</div>
                                {adminItemsState.itemsDetails?.length > 0 ? (
                                    <div style={{ marginTop: 4, fontSize: 10 }}>
                                        {adminItemsState.itemsDetails.slice(0, 5).map((item, i) => (
                                            <div key={i}>{item.name} (ID: {item.id})</div>
                                        ))}
                                        {adminItemsState.itemsDetails.length > 5 ? <div>+{adminItemsState.itemsDetails.length - 5} autres...</div> : null}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {adminImportProgress ? (
                            <div style={{ marginTop: 6, fontSize: 12 }}>
                                <div>
                                    Status: {String(adminImportProgress?.status || "-")}
                                    {adminImportProgress?.currentDate ? ` | Date: ${String(adminImportProgress.currentDate)}` : ""}
                                </div>
                                <div>
                                    Replay range: {String(adminImportProgress?.replayStartDate || "-")} - {String(adminImportProgress?.endDate || "-")}
                                </div>
                                <div>
                                    Store range: {String(adminImportProgress?.startDate || "-")} - {String(adminImportProgress?.endDate || "-")}
                                </div>
                                <div>
                                    Replay: {Number(adminImportProgress?.processedDays || 0)}/{Number(adminImportProgress?.totalDays || 0)}
                                    {" "} | stored: {Number(adminImportProgress?.importedDays || 0)}
                                    {" "} | completed: {Number(adminImportProgress?.completedExistingDays || 0)}
                                    {" "} | existing: {Number(adminImportProgress?.skippedExistingDays || 0)}
                                    {" "} | missing: {Number(adminImportProgress?.missingDays || 0)}
                                </div>
                                {String(adminImportProgress?.message || "") ? <div>{String(adminImportProgress.message)}</div> : null}
                            </div>
                        ) : null}
                        {String(adminSectionError?.__actions__ || "") ? <div style={{ color: "#ff8e8e", marginTop: 6 }}>{String(adminSectionError.__actions__)}</div> : null}
                    </>
                ) : null}
            </div>

            <div style={{
                marginTop: 12,
                padding: "8px 10px",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
            }}>
                <button
                    type="button"
                    onClick={() => toggleAdminPanel("vip")}
                    style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        background: "transparent",
                        color: "inherit",
                        border: "none",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                    }}
                >
                    <span style={{ fontWeight: 700 }}>{isAdminPanelOpen("vip") ? "v" : ">"} {labelOr("vipPanel")}</span>
                    <span style={{ fontSize: 11, opacity: 0.78, textAlign: "right" }}>{getVipSummary()}</span>
                </button>
                {isAdminPanelOpen("vip") ? (
                    <>
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            <button
                                className="graph-tab-btn"
                                onClick={() => setAdminAboListOpen((prev) => !prev)}
                                disabled={adminAboRows.length < 1}
                            >
                                {adminAboListOpen ? "v" : ">"} ABO ({adminAboRows.length})
                            </button>
                            <span style={{ fontSize: 11, opacity: 0.78 }}>{getAboSummary()}</span>
                        </div>
                        {adminAboListOpen ? (
                            <div style={{
                                marginTop: 8,
                                padding: "6px 8px",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 6,
                                background: "rgba(255,255,255,0.03)",
                                fontSize: 11,
                            }}>
                                {adminAboRows.length > 0 ? adminAboRows.map((entry, idx) => (
                                    <div
                                        key={String(entry?.id || entry?.farmId || `abo-${idx}`)}
                                        style={{
                                            padding: "5px 0",
                                            borderBottom: idx < adminAboRows.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                                        }}
                                    >
                                        <div><b>{String(entry?.title || "-")}</b> <span style={{ opacity: 0.8 }}>#{String(entry?.id || "")}</span></div>
                                        {String(entry?.meta1 || "") ? <div>{String(entry.meta1)}</div> : null}
                                        {String(entry?.meta2 || "") ? <div>{String(entry.meta2)}</div> : null}
                                        {String(entry?.meta3 || "") ? <div>{String(entry.meta3)}</div> : null}
                                    </div>
                                )) : <div>{labelOr("aboEmpty") || "Aucune donnee ABO disponible"}</div>}
                            </div>
                        ) : null}
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
                            <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                <span>{labelOr("farmId")} / username</span>
                                <input
                                    type="text"
                                    inputMode="text"
                                    autoComplete="off"
                                    spellCheck={false}
                                    placeholder="farm id ou username"
                                    value={adminVipFarmId}
                                    onChange={(e) => {
                                        setAdminVipFarmId(String(e?.target?.value || ""));
                                        resetAdminVipValidation();
                                    }}
                                    style={{ minWidth: 120 }}
                                />
                            </label>
                            <button className="graph-tab-btn" onClick={validateAdminVipFarm} disabled={adminActionLoading !== ""}>
                                {adminActionLoading === actionId(4) ? labelOr("checking") : labelOr("validate")}
                            </button>
                            <button className="graph-tab-btn" onClick={() => runAdminVipAction(actionId(5))} disabled={adminActionLoading !== ""}>
                                {adminActionLoading === actionId(5) ? labelOr("addingVip") : labelOr("addVipAction")}
                            </button>
                            <button className="graph-tab-btn" onClick={() => runAdminVipAction(actionId(6))} disabled={adminActionLoading !== ""}>
                                {adminActionLoading === actionId(6) ? labelOr("addingVip3") : labelOr("addVip3Action")}
                            </button>
                            <button className="graph-tab-btn" onClick={() => runAdminVipAction(actionId(7))} disabled={adminActionLoading !== ""}>
                                {adminActionLoading === actionId(7) ? labelOr("deleting") : labelOr("removeVipAction")}
                            </button>
                        </div>
                        {adminVipValidation?.checked ? (
                            <div style={{ marginTop: 6, fontSize: 12 }}>
                                <div>{labelOr("validatedFarm")}{String(adminVipValidation.farmId)}</div>
                                {String(adminVipValidation.username || "") ? <div>{labelOr("username")}: {String(adminVipValidation.username)}</div> : null}
                                <div>{labelOr("vipActive")}{adminVipValidation.active ? labelOr("yes") : labelOr("no")}</div>
                                <div>{labelOr("lifetime")}{adminVipValidation.isLifetime ? labelOr("yes") : labelOr("no")}</div>
                                <div>{labelOr("inAboFile")}{adminVipValidation.inAboFile ? labelOr("yes") : labelOr("no")}</div>
                                <div>{labelOr("tempSubscription")}{adminVipValidation.hasTempSubscription ? labelOr("yes") : labelOr("no")}</div>
                                {adminVipValidation.expiresAt > 0 ? (
                                    <div>{labelOr("expiresAt")}{new Date(adminVipValidation.expiresAt).toLocaleString("fr-FR")}</div>
                                ) : null}
                            </div>
                        ) : null}
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                            <button
                                className="graph-tab-btn"
                                onClick={() => setAdminVipListOpen((prev) => !prev)}
                                disabled={!Array.isArray(adminUi?.vipRows) || adminUi.vipRows.length < 1}
                            >
                                {adminVipListOpen ? "v" : ">"} {labelOr("latestPaidFarms")} ({Array.isArray(adminUi?.vipRows) ? adminUi.vipRows.length : 0})
                            </button>
                        </div>
                        {adminVipListOpen && Array.isArray(adminUi?.vipRows) && adminUi.vipRows.length > 0 ? (
                            <div style={{ marginTop: 8, fontSize: 12 }}>
                                <div style={{ display: "grid", gap: 4 }}>
                                    {adminUi.vipRows.map((entry, idx) => (
                                        <div
                                            key={String(entry?.id || `vip-payment-${idx}`)}
                                            style={{
                                                padding: "6px 8px",
                                                border: "1px solid rgba(255,255,255,0.12)",
                                                borderRadius: 6,
                                                background: "rgba(255,255,255,0.03)",
                                                fontSize: 11,
                                            }}
                                        >
                                            <div><b>{String(entry?.title || "-")}</b></div>
                                            {String(entry?.meta1 || "") ? <div>{String(entry.meta1)}</div> : null}
                                            {String(entry?.meta2 || "") ? <div>{String(entry.meta2)}</div> : null}
                                            {String(entry?.meta3 || "") ? <div>{String(entry.meta3)}</div> : null}
                                            {String(entry?.meta4 || "") ? <div>{String(entry.meta4)}</div> : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {String(adminSectionError?.__vip__ || "") ? <div style={{ color: "#ff8e8e", marginTop: 6 }}>{String(adminSectionError.__vip__)}</div> : null}
                    </>
                ) : null}
            </div>
        </>
    );
}
