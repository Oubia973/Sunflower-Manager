const isObj = (val) => !!val && typeof val === "object" && !Array.isArray(val);

const isNonEmptyObj = (val) => isObj(val) && Object.keys(val).length > 0;

export const resolveTooltipCostTree = (entry, forTry = false) => {
  if (!isObj(entry)) return null;

  const candidates = forTry
    ? [
        entry.costTreeTry,
        entry.costCompoittry,
        entry.compoittry,
        entry.costTree,
        entry.costCompoit,
        entry.compoit,
      ]
    : [
        entry.costTree,
        entry.costCompoit,
        entry.compoit,
      ];

  for (const candidate of candidates) {
    if (isNonEmptyObj(candidate?.nodes)) {
      return candidate;
    }
  }

  return null;
};

