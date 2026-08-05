/**
 * UI Handlers - Handle UI state changes from form inputs
 * Extracted from App.js handleUIChange, setUIField, handleHomeClic, handleSetHrvMax, handleInvBuyRefresh
 */

/**
 * Create UI handlers
 */
export function createUIHandlers(
  setUI,
  setdataSetFarm,
  dataSetFarmRef = null,
  pendingSaveRef,
  markTryitPending = null,
  buildAndWriteSnapshot = null,
  // Optional dependencies for extended handlers
  invBuyRefreshCooldownUntilRef = null,
  getPrices = null,
  autoRefreshForceNormalFirstCycleRef = null,
  setAutoRefreshDurationMs = null,
  setAutoRefreshNextAt = null,
  setAutoRefreshNonce = null,
  dataSetFarm = null,
  dataSet = null,
  tryitConfig = null,
  setCookie = null
) {
  const isPlainObject = (value) => (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
  );

  const hasSameShallowValue = (a, b) => {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((value, index) => Object.is(value, b[index]));
    }
    if (!isPlainObject(a) || !isPlainObject(b)) return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && Object.is(a[key], b[key]));
  };

  /**
   * Handle home section toggle (isOpen)
   */
  function handleHomeClic(index) {
    setUIField('isOpen', (prevState) => ({
      ...prevState,
      [index]: !prevState[index],
    }));
  }

  /**
   * Set harvest max values based on TryChecked mode
   */
  function handleSetHrvMax(TryChecked) {
    const it = dataSetFarm?.itables?.it
      || dataSetFarm?.invData?.itables?.it
      || dataSetFarm?.cookData?.itables?.it;
    if (!it) return;
    const next = {};
    for (const item in it) {
      const dc = TryChecked
        ? (it[item]?.dailycycletry ?? it[item]?.dailycycle ?? 0)
        : (it[item]?.dailycycle ?? 0);

      if (dc > 0) next[item] = Number(dc);
    }
    setUI((prev) => ({
      ...prev,
      ...(TryChecked
        ? { xHrvsttry: next }
        : { xHrvst: next }),
    }));
  }

  /**
   * Refresh inventory after purchase
   */
  async function handleInvBuyRefresh() {
    if (!invBuyRefreshCooldownUntilRef || !getPrices || !autoRefreshForceNormalFirstCycleRef || !setAutoRefreshDurationMs || !setAutoRefreshNextAt || !setAutoRefreshNonce) {
      console.warn('handleInvBuyRefresh: missing dependencies');
      return false;
    }
    const now = Date.now();
    if (now < Number(invBuyRefreshCooldownUntilRef.current || 0)) {
      return false;
    }
    invBuyRefreshCooldownUntilRef.current = now + 4000;
    try {
      const currentFarmState = dataSetFarm || {};
      // Save to localStorage first (same as original App.js behavior)
      if (setCookie) {
        setCookie(currentFarmState, dataSet);
      }
      if (typeof buildAndWriteSnapshot === 'function') {
        buildAndWriteSnapshot(
          currentFarmState,
          currentFarmState?.frmid || dataSet?.options?.farmId || ''
        );
      }
      // Finally refresh prices from backend
      await getPrices(false, true, ['inventory', 'boosts'], true, 'inv', true, 'BUY');
      autoRefreshForceNormalFirstCycleRef.current = true;
      setAutoRefreshDurationMs(60 * 1000);
      setAutoRefreshNextAt(Date.now() + (60 * 1000));
      setAutoRefreshNonce((v) => v + 1);
      return true;
    } catch (error) {
      console.log('Inv buy refresh error', error);
      return false;
    }
  }

  /**
   * Handle UI field changes from form inputs
   */
  function handleUIChange(e) {
    if (!e || !e.target) return;
    const t = e.target;
    const name = t.name;
    if (!name) return;

    let value;
    if (t.type === 'checkbox') {
      if (name.includes('.')) {
        const [root, key] = name.split('.', 2);
        setUI(prev => ({
          ...(prev ?? {}),
          [root]: {
            ...(prev?.[root] ?? {}),
            [key]: !!t.checked,
          },
        }));
        return;
      }
      value = !!t.checked;
    } else {
      value = t.value;
    }

    // Handle table item toggling (cookit, etc.)
    if (name.includes(':')) {
      const [root, item] = name.split(':', 2);
      const tableContainers = [
        { get: (p) => p?.itables, set: (p, tables) => ({ ...(p || {}), itables: tables }) },
        { get: (p) => p?.invData?.itables, set: (p, tables) => ({ ...(p || {}), invData: { ...(p?.invData || {}), itables: tables } }) },
        { get: (p) => p?.cookData?.itables, set: (p, tables) => ({ ...(p || {}), cookData: { ...(p?.cookData || {}), itables: tables } }) },
        { get: (p) => p?.fishData?.itables, set: (p, tables) => ({ ...(p || {}), fishData: { ...(p?.fishData || {}), itables: tables } }) },
        { get: (p) => p?.bountyData?.itables, set: (p, tables) => ({ ...(p || {}), bountyData: { ...(p?.bountyData || {}), itables: tables } }) },
        { get: (p) => p?.craftData?.itables, set: (p, tables) => ({ ...(p || {}), craftData: { ...(p?.craftData || {}), itables: tables } }) },
        { get: (p) => p?.flowerData?.itables, set: (p, tables) => ({ ...(p || {}), flowerData: { ...(p?.flowerData || {}), itables: tables } }) },
        { get: (p) => p?.expandPageData?.itables, set: (p, tables) => ({ ...(p || {}), expandPageData: { ...(p?.expandPageData || {}), itables: tables } }) },
      ];
      const baseState = dataSetFarm || {};
      const allTables = tableContainers.map((container) => container.get(baseState) || {});
      const nextState = { ...(baseState || {}) };
      const it = allTables.map((t) => t?.it).find((t) => t && Object.keys(t).length > 0) || {};
      const food = allTables.map((t) => t?.food).find((t) => t && Object.keys(t).length > 0) || {};
      const pfood = allTables.map((t) => t?.pfood).find((t) => t && Object.keys(t).length > 0) || {};

      let tableKey = null;
      if (it[item]) tableKey = 'it';
      else if (food[item]) tableKey = 'food';
      else if (pfood[item]) tableKey = 'pfood';
      else return;

      let current = {};
      for (let i = 0; i < tableContainers.length; i++) {
        const tables = tableContainers[i].get(baseState) || {};
        if (tables?.[tableKey]?.[item]) {
          current = tables[tableKey][item];
          break;
        }
      }

      const nextBinary = value ? 1 : 0;
      if (root === 'cookit' && nextBinary === 0 && Number(current?.cookit) === 1) {
        const foodCount = Object.values(food).reduce((acc, obj) => acc + (Number(obj?.cookit) === 1 ? 1 : 0), 0);
        const pfoodCount = Object.values(pfood).reduce((acc, obj) => acc + (Number(obj?.cookit) === 1 ? 1 : 0), 0);
        if ((foodCount + pfoodCount) <= 1) return;
      }

      const nextItem = { ...current, [root]: nextBinary };
      let updated = nextState;
      tableContainers.forEach((container) => {
        const tables = container.get(updated) || {};
        const table = tables?.[tableKey] || {};
        if (!table[item]) return;
        const nextTables = { ...tables, [tableKey]: { ...table, [item]: nextItem } };
        updated = container.set(updated, nextTables);
      });

      if (dataSetFarmRef && typeof dataSetFarmRef === 'object') {
        dataSetFarmRef.current = updated;
      }
      setdataSetFarm(updated);
      if (typeof markTryitPending === 'function') {
        markTryitPending();
      }
      pendingSaveRef.current = true;
      return;
    }

    // Handle nested UI fields (xHrvst.xxx, root.key)
    if (name.includes('.')) {
      const [root, key] = name.split('.', 2);
      const parsedValue = String(value ?? '').trim();
      const isHarvestCounter = root === 'xHrvst' || root === 'xHrvsttry';
      const parsed = isHarvestCounter
        ? Number(parsedValue.replace(/[^0-9.]/g, ''))
        : parseInt(parsedValue.replace(/\D/g, ''), 10);
      const normalized = Number.isFinite(parsed) ? parsed : 0;

      setUI(prev => ({
        ...(prev ?? {}),
        [root]: {
          ...(prev?.[root] ?? {}),
          [key]: normalized,
        },
      }));
      return;
    }

    // Handle simple UI fields
    setUI(prev => {
      const next = { ...(prev ?? {}), [name]: value };
      // Sync activity selection fields
      if (name === 'selectedFromActivity') {
        next.selectedFromActivityDay = value;
      } else if (name === 'selectedFromActivityDay') {
        next.selectedFromActivity = value;
      }
      return next;
    });
  }

  /**
   * Set a UI field value
   */
  function setUIField(name, valueOrUpdater) {
    setUI((prev) => {
      const prevValue = prev?.[name];
      const nextValue = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(prevValue)
        : valueOrUpdater;
      if (hasSameShallowValue(prevValue, nextValue)) {
        return prev;
      }
      return { ...(prev ?? {}), [name]: nextValue };
    });
  }

  return {
    handleUIChange,
    setUIField,
    handleHomeClic,
    handleSetHrvMax,
    handleInvBuyRefresh,
  };
}

export default createUIHandlers;
