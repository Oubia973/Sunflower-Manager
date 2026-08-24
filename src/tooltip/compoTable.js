import React from "react";
import { frmtNb } from "../fct.js";
import { imgcoins } from "../constants/images.js";
import {
    flattenCompositionQuantities,
    isCompositionObject,
    normalizeCompositionNode,
} from "../utils/compositionTree.js";

const isObj = isCompositionObject;

const normalizeCompoNode = (rawNode) => {
    const node = normalizeCompositionNode(rawNode);
    return { qty: node.qty, compoit: node.children };
};

const isTreeCompo = (compoMap) => {
    if (!isObj(compoMap)) return false;
    return Object.values(compoMap).some((rawNode) => typeof rawNode !== "number");
};

const cloneScaledTree = (tree, factor = 1) => {
    const out = {};
    if (!isObj(tree)) return out;
    Object.entries(tree).forEach(([name, rawNode]) => {
        const node = normalizeCompoNode(rawNode);
        const qty = node.qty * factor;
        if (!(qty > 0)) return;
        const nextNode = { qty };
        const childTree = cloneScaledTree(node.compoit, factor);
        if (Object.keys(childTree).length > 0) {
            nextNode.compoit = childTree;
        }
        out[name] = nextNode;
    });
    return out;
};

const flattenCompoTree = (tree, out = {}, multiplier = 1) => {
    const flattened = flattenCompositionQuantities(tree, multiplier);
    Object.entries(flattened).forEach(([name, quantity]) => {
        out[name] = (out[name] || 0) + quantity;
    });
    return out;
};

const createSetCompoTable = ({
    ForTry,
    keyFn,
    dataSet,
    currentItem,
    tables,
    shrine = {},
    sflortry,
    assets,
    compoState,
}) => {
    const {
        it = {},
        fish = {},
        bounty = {},
        flower = {},
        craft = {},
        petit = {},
        crustacean = {},
        tool = {},
        pfood = {},
        food = {},
    } = tables || {};
    const { imgna, imgmix, imgmp, imgsfl } = assets;
    const { compoExpanded, setCompoExpanded, compoClosing, setCompoClosing, compoCloseTimersRef } = compoState;

    const getItemBase = (name) => [it, fish, bounty, flower, craft, petit, crustacean, tool, pfood, food].find((src) => src?.[name]);

    const getToolCompoTree = (toolName, toolQty = 1) => {
        const out = {};
        const toolEntry = tool?.[toolName];
        if (!toolEntry) return out;
        const qtyMul = Number(toolQty || 0) || 0;
        if (qtyMul <= 0) return out;

        const sflQty = Number(toolEntry?.[sflortry] ?? toolEntry?.sfl ?? 0);
        if (sflQty > 0) {
            out.sfl = { qty: sflQty * qtyMul };
        }

        const added = new Set(["sfl"]);
        Object.keys(toolEntry).forEach((rawKey) => {
            if (!rawKey || rawKey.endsWith("try")) return;
            if (added.has(rawKey)) return;
            const itemSrc = getItemBase(rawKey);
            const itemEntry = itemSrc?.[rawKey];
            if (!itemEntry) return;
            const qBase = ForTry ? (toolEntry?.[rawKey + "try"] ?? toolEntry?.[rawKey]) : toolEntry?.[rawKey];
            const qNum = Number(qBase || 0);
            if (qNum > 0) {
                const qty = qNum * qtyMul;
                const node = { qty };
                const childTree = cloneScaledTree(itemEntry?.compoit || {}, qty);
                if (Object.keys(childTree).length > 0) {
                    node.compoit = childTree;
                }
                out[rawKey] = node;
                added.add(rawKey);
            }
        });
        return out;
    };
    const buildCompoTreeFromMap = (compoMap) => {
        const out = {};
        if (!isObj(compoMap)) return out;
        Object.entries(compoMap).forEach(([name, rawQty]) => {
            const qty = Number(rawQty || 0);
            if (!(qty > 0)) return;
            const itemSrc = getItemBase(name);
            const itemEntry = itemSrc?.[name];
            const node = { qty };
            const childTree = cloneScaledTree(itemEntry?.compoit || {}, qty);
            if (Object.keys(childTree).length > 0) {
                node.compoit = childTree;
            }
            out[name] = node;
        });
        return out;
    };

    const getRowValues = (keyItem, compoQuant, rawNode = null) => {
        const cleanName = ForTry ? keyItem.replace(/try$/, "") : keyItem;
        const itemBase = getItemBase(cleanName);
        if (!itemBase && keyItem !== "sfl") return null;
        const icompoToAdd = keyItem === "sfl" ? imgcoins : (itemBase[cleanName]?.img || imgna);
        const titleImg = keyItem === "sfl" ? "Coins" : keyItem;
        const icompoImg = <img src={icompoToAdd} alt={keyItem} className="resicon" title={titleImg} />;
        const nodeCostUnit = Number(rawNode?.costUnit);
        const nodeMarketUnit = Number(rawNode?.marketUnit);
        const nodeCostTotal = Number(rawNode?.costTotal);
        const nodeMarketTotal = Number(rawNode?.marketTotal);
        const compoCost = Number.isFinite(nodeCostUnit)
            ? nodeCostUnit
            : keyItem === "sfl" ? (1 / dataSet.options.coinsRatio) : (itemBase[cleanName][keyFn("cost")] / dataSet.options.coinsRatio);
        const nodeQty = normalizeCompoNode(rawNode).qty;
        const nodeTotalFactor = nodeQty > 0 ? (compoQuant / nodeQty) : 1;
        const icompoValue = Number.isFinite(nodeCostTotal) ? nodeCostTotal * nodeTotalFactor : compoQuant * (compoCost || 0);
        const marketUnit = Number(itemBase?.[cleanName]?.[keyFn("costp2pt")] ?? itemBase?.[cleanName]?.costp2pt ?? 0);
        const marketOrFallback = Number.isFinite(nodeMarketUnit)
            ? nodeMarketUnit
            : keyItem === "sfl" ? (1 / dataSet.options.coinsRatio)
            : marketUnit > 0 ? marketUnit : Number(itemBase?.[cleanName]?.costp2pt ?? 0);
        const icompoValueM = Number.isFinite(nodeMarketTotal) ? nodeMarketTotal * nodeTotalFactor : compoQuant * marketOrFallback;
        const compName = cleanName !== "sfl" ? cleanName : "Coins";
        return { compName, icompoImg, icompoValue, icompoValueM };
    };

    const shouldDisplayToolKey = (toolEntry, rawKey) => {
        const isTryKey = rawKey.endsWith("try");
        const baseKey = isTryKey ? rawKey.replace(/try$/, "") : rawKey;
        if (!ForTry) {
            return !isTryKey;
        }
        if (isTryKey) {
            return true;
        }
        return (toolEntry?.[baseKey + "try"] === undefined);
    };

    return function setCompoTable(item, quant, override = null) {
        let itemTable = {};
        let itemImgName = imgna;
        const parsedQuant = Number(quant);
        let itemQuant = Number.isFinite(parsedQuant) ? parsedQuant : 1;
        const customCompo = isObj(override?.costTree?.nodes) ? override.costTree.nodes : (isObj(override?.compoit) ? override.compoit : null);
        const customImg = override?.img;
        const customLabel = override?.label;
        const forceFlatTool = !!override?.forceFlatTool;

        if (customCompo) {
            itemTable = isTreeCompo(customCompo) ? customCompo : buildCompoTreeFromMap(customCompo);
            itemImgName = customImg || itemImgName;
        }

        if (!customCompo && craft[item]?.compo) {
            itemTable = craft[item]?.compo;
            itemImgName = craft[item]?.img;
        }
        if (!customCompo && tool?.[item]) {
            if (forceFlatTool) {
                const srcTool = tool?.[item] || {};
                const normalizedTool = {};
                Object.keys(srcTool).forEach((rawKey) => {
                    if (!rawKey) return;
                    if (!shouldDisplayToolKey(srcTool, rawKey)) return;
                    if (rawKey === "sfl") {
                        const sflQty = Number(srcTool?.[sflortry] ?? srcTool?.sfl ?? 0);
                        if (sflQty > 0) {
                            normalizedTool.sfl = sflQty;
                        }
                        return;
                    }
                    if (rawKey === "sfltry") return;
                    const baseName = rawKey.replace(/try$/, "");
                    const itemBase = getItemBase(baseName);
                    if (!itemBase?.[baseName]) return;
                    const qNum = Number(srcTool?.[rawKey] || 0);
                    if (qNum > 0) {
                        normalizedTool[rawKey] = qNum;
                    }
                });
                itemTable = normalizedTool;
            } else {
                const toolChildren = getToolCompoTree(item, 1);
                itemTable = Object.keys(toolChildren).length > 0
                    ? { [item]: { qty: 1, compoit: toolChildren } }
                    : {};
            }
            itemImgName = tool?.[item]?.img;
        }
        if (!customCompo && food[item]?.compo) {
            itemTable = ForTry
                ? (food[item]?.costTreeTry?.nodes || food[item]?.compoittry || food[item]?.costTree?.nodes || food[item]?.compoit)
                : (food[item]?.costTree?.nodes || food[item]?.compoit);
            itemImgName = food[item]?.img;
        }
        if (!customCompo && pfood[item]?.compo) {
            itemTable = ForTry
                ? (pfood[item]?.costTreeTry?.nodes || pfood[item]?.compoittry || pfood[item]?.costTree?.nodes || pfood[item]?.compoit)
                : (pfood[item]?.costTree?.nodes || pfood[item]?.compoit);
            itemImgName = pfood[item]?.img;
        }
        if (!customCompo && shrine[item]?.compo) {
            itemTable = shrine[item]?.compo;
            itemImgName = shrine[item]?.img;
        }
        if (!customCompo && (crustacean?.[item]?.costTree || crustacean?.[item]?.costTreeTry || crustacean?.[item]?.costCompoit || crustacean?.[item]?.costCompoittry || crustacean?.[item]?.compoit || crustacean?.[item]?.compoittry)) {
            itemTable = ForTry
                ? (crustacean[item].costTreeTry?.nodes || crustacean[item].costCompoittry || crustacean[item].compoittry || crustacean[item].costTree?.nodes || crustacean[item].costCompoit || crustacean[item].compoit)
                : (crustacean[item].costTree?.nodes || crustacean[item].costCompoit || crustacean[item].compoit);
            itemImgName = crustacean[item]?.img;
            const toolName = crustacean[item]?.tool;
            const transformed = {};
            Object.entries(itemTable || {}).forEach(([name, rawNode]) => {
                const node = normalizeCompoNode(rawNode);
                if (node.qty <= 0) return;
                const hasNodeChildren = Object.keys(node.compoit || {}).length > 0;
                const baseNode = {};
                if (Number.isFinite(Number(rawNode?.costUnit))) baseNode.costUnit = Number(rawNode.costUnit);
                if (Number.isFinite(Number(rawNode?.marketUnit))) baseNode.marketUnit = Number(rawNode.marketUnit);
                if (Number.isFinite(Number(rawNode?.costTotal))) baseNode.costTotal = Number(rawNode.costTotal);
                if (Number.isFinite(Number(rawNode?.marketTotal))) baseNode.marketTotal = Number(rawNode.marketTotal);
                if (toolName && name === toolName) {
                    const toolChildren = hasNodeChildren ? node.compoit : getToolCompoTree(toolName, node.qty);
                    transformed[name] = Object.keys(toolChildren).length > 0
                        ? { ...baseNode, qty: node.qty, compoit: toolChildren }
                        : { ...baseNode, qty: node.qty };
                } else {
                    transformed[name] = hasNodeChildren ? { ...baseNode, qty: node.qty, compoit: node.compoit } : { ...baseNode, qty: node.qty };
                }
            });
            itemTable = transformed;
        }
        if (!customCompo && item === "Obsidian") {
            itemTable = ForTry ? currentItem.compotry : currentItem.compo;
            itemImgName = it["Obsidian"]?.img;
        }
        if (!customCompo && item === "Mix Food") {
            itemTable = {
                Corn: itemQuant,
                Barley: itemQuant,
                Wheat: itemQuant,
            };
            itemQuant = 1;
            itemImgName = imgmix;
        }

        const isTool = tool?.[item];
        const isPfood = !!pfood?.[item];
        const headerLabel = customLabel || item;
        const itemImg = <img src={itemImgName} alt={headerLabel ?? "?"} style={{ width: "22px", height: "22px" }} />;
        let totalCost = 0;
        let totalCostM = 0;
        const hasTreeCompo = isTreeCompo(itemTable);
        const compoList = hasTreeCompo ? flattenCompoTree(itemTable) : itemTable;
        const hasBackendCostUnits = hasTreeCompo && Object.values(itemTable).some((rawNode) =>
            Number.isFinite(Number(rawNode?.costUnit)) || Number.isFinite(Number(rawNode?.marketUnit))
            || Number.isFinite(Number(rawNode?.costTotal)) || Number.isFinite(Number(rawNode?.marketTotal))
        );
        const itemQuantTxt = itemQuant > 1 ? (" x" + itemQuant) : "";

        const totalEntries = hasBackendCostUnits ? itemTable : compoList;
        Object.entries(totalEntries).forEach(([keyItem, rawNode]) => {
            const node = hasBackendCostUnits ? normalizeCompoNode(rawNode) : null;
            const compoQuant = hasBackendCostUnits ? node.qty * itemQuant : rawNode * itemQuant;
            let hasQuant = compoQuant > 0;
            if (isTool && keyItem !== "sfl") {
                hasQuant = shouldDisplayToolKey(tool[item], keyItem) && compoQuant > 0;
            }
            if (!hasQuant) return;
            const rowVals = getRowValues(keyItem, compoQuant, rawNode);
            if (!rowVals) return;
            totalCost += rowVals.icompoValue;
            totalCostM += rowVals.icompoValueM;
        });

        const tableContent = hasTreeCompo
            ? (() => {
                const rows = [];
                const toggleRow = (rowKey) => {
                    const isOpen = !!compoExpanded[rowKey];
                    const existing = compoCloseTimersRef.current[rowKey];
                    if (existing) {
                        clearTimeout(existing);
                        delete compoCloseTimersRef.current[rowKey];
                    }
                    if (isOpen) {
                        setCompoClosing((prev) => {
                            const next = { ...prev };
                            delete next[rowKey];
                            return next;
                        });
                        setCompoExpanded((prev) => ({ ...prev, [rowKey]: false }));
                    } else {
                        setCompoClosing((prev) => {
                            const next = { ...prev };
                            delete next[rowKey];
                            return next;
                        });
                        setCompoExpanded((prev) => ({ ...prev, [rowKey]: true }));
                    }
                };

                const pushRows = (tree, depth = 0, path = "root", ancestorClosing = false) => {
                    if (!isObj(tree)) return;
                    Object.entries(tree).forEach(([keyItem, rawNode], idx) => {
                        const node = normalizeCompoNode(rawNode);
                        const compoQuant = node.qty * itemQuant;
                        if (!(compoQuant > 0)) return;
                        const rowVals = getRowValues(keyItem, compoQuant, rawNode);
                        if (!rowVals) return;
                        const rowKey = `${path}-${keyItem}-${idx}`;
                        const hasChildren = Object.keys(node.compoit).length > 0;
                        const defaultOpen = isPfood && depth === 0;
                        const isOpen = (compoExpanded[rowKey] === undefined) ? defaultOpen : !!compoExpanded[rowKey];
                        const isSelfClosing = !!compoClosing[rowKey];
                        const isClosingRow = ancestorClosing;
                        const childClosing = ancestorClosing || isSelfClosing;
                        const indent = `${10 + (depth * 16)}px`;
                        const depthShade = Math.max(148, 226 - (depth * 14));
                        const rowTextColor = depth > 0 ? `rgb(${depthShade}, ${depthShade - 10}, ${depthShade - 22})` : undefined;
                        rows.push(
                            <tr key={rowKey} className={`tooltip-compo-row ${isClosingRow ? "tooltip-compo-row-closing" : ""}`} style={rowTextColor ? { color: rowTextColor } : undefined}>
                                <td className="tdcenterbrd tooltip-compo-firstcol">
                                    <div className="tooltip-compo-cell-inner">
                                    <span className="tooltip-compo-label" style={{ paddingLeft: indent }}>
                                        {hasChildren ? (
                                            <button
                                                type="button"
                                                onClick={() => toggleRow(rowKey)}
                                                className={`tooltip-compo-toggle ${isOpen && !childClosing ? "open" : ""}`}
                                                title={isOpen ? "Collapse" : "Expand"}
                                            >
                                                {"▸"}
                                            </button>
                                        ) : <span className="tooltip-compo-toggle-spacer" />}
                                        {frmtNb(compoQuant)} {rowVals.icompoImg}{rowVals.compName}
                                    </span>
                                    </div>
                                </td>
                                <td className="tdcenterbrd"><div className="tooltip-compo-cell-inner">{frmtNb(rowVals.icompoValue)}</div></td>
                                <td className="tdcenterbrd"><div className="tooltip-compo-cell-inner">{frmtNb(rowVals.icompoValueM)}</div></td>
                            </tr>
                        );
                        if (hasChildren && (isOpen || childClosing)) {
                            pushRows(node.compoit, depth + 1, rowKey, childClosing);
                        }
                    });
                };
                pushRows(itemTable, 0, "root");
                return rows;
            })()
            : Object.keys(compoList).map((keyItem) => {
                const compoQuant = compoList[keyItem] * itemQuant;
                const cleanName = ForTry ? keyItem.replace(/try$/, "") : keyItem;
                let hasQuant = compoQuant > 0;
                if (isTool && keyItem !== "sfl") {
                    hasQuant = shouldDisplayToolKey(tool[item], keyItem) && compoQuant > 0;
                }
                if (!hasQuant) return null;
                const rowVals = getRowValues(keyItem, compoQuant, compoList[keyItem]);
                if (!rowVals) return null;
                return (
                    <tr key={`${keyItem}-${compoQuant}`}>
                        <td className="tdcenterbrd tooltip-compo-firstcol">
                            <div className="tooltip-compo-cell-inner">
                                <span className="tooltip-compo-label">
                                    {frmtNb(compoQuant)} {rowVals.icompoImg}{rowVals.compName}
                                </span>
                            </div>
                        </td>
                        <td className="tdcenterbrd"><div className="tooltip-compo-cell-inner">{frmtNb(rowVals.icompoValue, 3)}</div></td>
                        <td className="tdcenterbrd"><div className="tooltip-compo-cell-inner">{frmtNb(rowVals.icompoValueM, 3)}</div></td>
                    </tr>
                );
            });

        const tableHeader = (
            <thead>
                <tr className="tooltip-compo-head-row">
                    <th className="tdcenterbrd tooltip-compo-head-first">{itemImg}{headerLabel}{itemQuantTxt}</th>
                    <th className="tdcenterbrd tooltip-compo-head">Prod cost</th>
                    <th className="tdcenterbrd tooltip-compo-head">{imgmp} cost</th>
                </tr>
                <tr className="tooltip-compo-total-row">
                    <th className="tdcenterbrd tooltip-compo-head-first">TOTAL</th>
                    <th className="tdcenterbrd tooltip-compo-head">{frmtNb(totalCost)}{imgsfl}</th>
                    <th className="tdcenterbrd tooltip-compo-head">{frmtNb(totalCostM)}{imgsfl}</th>
                </tr>
            </thead>
        );

        const table = (
            <>
                <table className="tooltip-compo-table">
                    {tableHeader}
                    <tbody>
                        {tableContent}
                    </tbody>
                </table>
            </>
        );
        return {
            table,
            totalCost,
            totalCostM,
        };
    };
};

export default createSetCompoTable;
