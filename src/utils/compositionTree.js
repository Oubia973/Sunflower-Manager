export const isCompositionObject = (value) => (
  !!value && typeof value === "object" && !Array.isArray(value)
);

export function normalizeCompositionNode(rawNode) {
  if (typeof rawNode === "number") {
    return { qty: Number(rawNode) || 0, children: {}, raw: {} };
  }
  const raw = isCompositionObject(rawNode) ? rawNode : {};
  return {
    qty: Number(raw.qty ?? raw.quant ?? raw.q ?? 0) || 0,
    children: isCompositionObject(raw.compoit) ? raw.compoit : {},
    raw,
  };
}

export function compositionNodes(tree) {
  if (isCompositionObject(tree?.nodes)) return tree.nodes;
  return isCompositionObject(tree) ? tree : {};
}

// Child quantities are already absolute. The multiplier only represents the
// number of finished items requested by the caller.
export function visitCompositionLeaves(tree, visitor, multiplier = 1) {
  Object.entries(compositionNodes(tree)).forEach(([name, rawNode]) => {
    const node = normalizeCompositionNode(rawNode);
    if (Object.keys(node.children).length > 0) {
      visitCompositionLeaves(node.children, visitor, multiplier);
      return;
    }
    visitor(name, node, node.qty * multiplier);
  });
}

export function flattenCompositionQuantities(tree, multiplier = 1) {
  const quantities = {};
  visitCompositionLeaves(tree, (name, _node, quantity) => {
    quantities[name] = (quantities[name] || 0) + quantity;
  }, multiplier);
  return quantities;
}
