import { useLayoutEffect, useRef } from "react";

export const FARM_APPLY_CHANGED_MESSAGE = "Farm changed during recalculation. Please retry Apply.";
const normalizeId = value => String(value ?? "").trim();

// Track committed context changes, including A -> B -> A during one Apply.
// Keep requested and published identities separate during a farm transition.
export default function useFarmApplyContext(requestedFarmId, publishedFarmId) {
  const identity = JSON.stringify([normalizeId(requestedFarmId), normalizeId(publishedFarmId)]);
  const context = useRef({ identity, generation: 0, active: true });
  useLayoutEffect(() => {
    if (context.current.identity !== identity) {
      context.current.identity = identity;
      context.current.generation += 1;
    }
  }, [identity]);
  useLayoutEffect(() => {
    context.current.active = true;
    return () => { context.current.active = false; };
  }, []);

  const capture = farmId => {
    const id = normalizeId(farmId);
    const identities = JSON.parse(context.current.identity);
    return { generation: context.current.generation, farmId: id,
      ready: !!id && identities.every(value => !value || value === id) };
  };
  const assertCurrent = (request, payload) => {
    const responseFarmId = normalizeId(payload?.frmid);
    if (!request.ready || !context.current.active || context.current.generation !== request.generation
      || (responseFarmId && responseFarmId !== request.farmId)) {
      const error = new Error(FARM_APPLY_CHANGED_MESSAGE);
      error.code = "FARM_APPLY_CONTEXT_CHANGED";
      throw error;
    }
  };
  return { capture, assertCurrent };
}
