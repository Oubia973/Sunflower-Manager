import React, { useMemo, useState } from "react";
import { frmtNb } from "../../../fct.js";
import { imgcoins, imgna, imgsfl } from "../../../constants/images.js";
import {
  compositionNodes,
  normalizeCompositionNode,
  visitCompositionLeaves,
} from "../../../utils/compositionTree.js";

function collectBranchPaths(tree, parent = "root", paths = []) {
  Object.entries(compositionNodes(tree)).forEach(([name, rawNode], index) => {
    const node = normalizeCompositionNode(rawNode);
    const path = `${parent}/${name}:${index}`;
    if (Object.keys(node.children).length) {
      paths.push(path);
      collectBranchPaths(node.children, path, paths);
    }
  });
  return paths;
}

export function flattenLeaves(tree, output = {}, multiplier = 1) {
  visitCompositionLeaves(tree, (name, node, quantity) => {
    const current = output[name] || { qty: 0, cost: 0, market: 0, hasCost: false, hasMarket: false };
    const cost = nodeCost(node.raw, quantity, "cost");
    const market = nodeCost(node.raw, quantity, "market");
    current.qty += quantity;
    if (Number.isFinite(cost)) { current.cost += cost; current.hasCost = true; }
    if (Number.isFinite(market)) { current.market += market; current.hasMarket = true; }
    output[name] = current;
  }, multiplier);
  return output;
}

function nodeCost(raw, quantity, kind) {
  const total = Number(raw?.[`${kind}Total`]);
  if (Number.isFinite(total)) {
    const baseQuantity = Number(raw?.qty ?? raw?.quant ?? raw?.q ?? 0);
    return baseQuantity > 0 ? total * (quantity / baseQuantity) : total;
  }
  const unit = Number(raw?.[`${kind}Unit`]);
  return Number.isFinite(unit) ? unit * quantity : null;
}

function hasAnyCostData(tree) {
  return Object.values(compositionNodes(tree)).some((rawNode) => {
    const node = normalizeCompositionNode(rawNode);
    if (
      Number.isFinite(Number(node.raw?.costUnit))
      || Number.isFinite(Number(node.raw?.costTotal))
      || Number.isFinite(Number(node.raw?.marketUnit))
      || Number.isFinite(Number(node.raw?.marketTotal))
    ) return true;
    return hasAnyCostData(node.children);
  });
}

function resourceLabel(name) {
  return String(name).toLowerCase() === "sfl" ? "Coins" : name;
}

function ResourceIcon({ name, catalog }) {
  if (String(name).toLowerCase() === "sfl") {
    return <img className="composition-tree__icon" src={imgcoins} alt="" title="Coins" />;
  }
  const entry = catalog?.[name] || {};
  return <img className="composition-tree__icon" src={entry.image || entry.img || imgna} alt="" title={name} />;
}

function CostValue({ value }) {
  if (!Number.isFinite(value)) return <span className="composition-tree__empty-cost">—</span>;
  return <>{frmtNb(value)}<img className="composition-tree__currency" src={imgsfl} alt="Flower" /></>;
}

export default function CompositionTree({
  costTree,
  quantity = 1,
  catalog = {},
  totalCost,
  totalMarket,
}) {
  const roots = useMemo(() => compositionNodes(costTree), [costTree]);
  const branchPaths = useMemo(() => collectBranchPaths(roots), [roots]);
  const finalResources = useMemo(() => flattenLeaves(roots), [roots]);
  const hasCostColumns = useMemo(() => (
    hasAnyCostData(roots)
    || Number.isFinite(Number(totalCost ?? costTree?.totalCost))
    || Number.isFinite(Number(totalMarket ?? costTree?.totalMarket))
  ), [roots, totalCost, totalMarket, costTree]);
  const [view, setView] = useState(() => branchPaths.length > 0 ? "tree" : "final");
  const [expanded, setExpanded] = useState(() => new Set());
  const allExpanded = branchPaths.length > 0 && branchPaths.every((path) => expanded.has(path));
  const multiplier = Number(quantity) || 1;

  const toggle = (path) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    return next;
  });

  const toggleAll = () => setExpanded(allExpanded ? new Set() : new Set(branchPaths));

  const renderTree = (tree, depth = 0, parent = "root") => Object.entries(compositionNodes(tree)).map(([name, rawNode], index) => {
    const node = normalizeCompositionNode(rawNode);
    if (!(node.qty > 0)) return null;
    const path = `${parent}/${name}:${index}`;
    const hasChildren = Object.keys(node.children).length > 0;
    const isOpen = expanded.has(path);
    const displayQuantity = node.qty * multiplier;
    return <React.Fragment key={path}>
      <div className="composition-tree__row" style={{ "--composition-depth": depth }}>
        <button
          type="button"
          className={`composition-tree__branch ${hasChildren ? "has-children" : ""} ${isOpen ? "is-open" : ""}`}
          onClick={() => hasChildren && toggle(path)}
          aria-expanded={hasChildren ? isOpen : undefined}
          disabled={!hasChildren}
        >
          <span className="composition-tree__chevron" aria-hidden="true">›</span>
          <ResourceIcon name={name} catalog={catalog} />
          <span className="composition-tree__name">{resourceLabel(name)}</span>
        </button>
        <strong className="composition-tree__qty">×{frmtNb(displayQuantity)}</strong>
        {hasCostColumns ? <><span className="composition-tree__cost"><CostValue value={nodeCost(node.raw, displayQuantity, "cost")} /></span>
        <span className="composition-tree__cost"><CostValue value={nodeCost(node.raw, displayQuantity, "market")} /></span></> : null}
      </div>
      {hasChildren && isOpen ? renderTree(node.children, depth + 1, path) : null}
    </React.Fragment>;
  });

  return <div className={`composition-tree ${hasCostColumns ? "has-costs" : "is-compact"}`}>
    {branchPaths.length > 0 ? <div className="composition-tree__toolbar">
      <div className="composition-tree__views" aria-label="Composition view">
        <button type="button" className={view === "tree" ? "is-active" : ""} onClick={() => setView("tree")}>Structure</button>
        <button type="button" className={view === "final" ? "is-active" : ""} onClick={() => setView("final")}>Final resources</button>
      </div>
      {view === "tree" ? <button type="button" className="composition-tree__expand" onClick={toggleAll}>{allExpanded ? "Collapse all" : "Expand all"}</button> : null}
    </div> : null}
    <div className="composition-tree__head">
      <span>Component</span><span>Qty</span>{hasCostColumns ? <><span>Prod.</span><span>Market</span></> : null}
    </div>
    <div className="composition-tree__body">
      {view === "tree" ? renderTree(roots) : Object.entries(finalResources).map(([name, resource]) => <div className="composition-tree__row is-final" key={name}>
        <span className="composition-tree__final-name"><ResourceIcon name={name} catalog={catalog} /><span>{resourceLabel(name)}</span></span>
        <strong className="composition-tree__qty">×{frmtNb(resource.qty * multiplier)}</strong>
        {hasCostColumns ? <><span className="composition-tree__cost"><CostValue value={resource.hasCost ? resource.cost * multiplier : null} /></span>
        <span className="composition-tree__cost"><CostValue value={resource.hasMarket ? resource.market * multiplier : null} /></span></> : null}
      </div>)}
    </div>
    {hasCostColumns && (Number.isFinite(Number(totalCost ?? costTree?.totalCost)) || Number.isFinite(Number(totalMarket ?? costTree?.totalMarket))) ? <div className="composition-tree__total">
      <strong>Total</strong><span />
      <span><CostValue value={Number(totalCost ?? costTree?.totalCost)} /></span>
      <span><CostValue value={Number(totalMarket ?? costTree?.totalMarket)} /></span>
    </div> : null}
  </div>;
}
