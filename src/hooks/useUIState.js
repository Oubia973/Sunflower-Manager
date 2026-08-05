/**
 * useUIState Hook - UI state management with column pickers
 * Extracted from App.js UI state, column pickers useMemo
 */

import { useState, useEffect, useMemo } from 'react';
import { uiDefaults, normalizeUI } from '../state/uiDefaults.js';
import {
  INV_COLUMNS_TEMPLATE, INV_COLUMNS_PICKER, INV_SORT_OPTIONS_TEMPLATE,
  COOK_COLUMNS_TEMPLATE, COOK_COLUMNS_PICKER, COOK_SORT_OPTIONS_TEMPLATE,
  FISH_COLUMNS_TEMPLATE, FISH_COLUMNS_PICKER,
  CRUSTA_COLUMNS_TEMPLATE, CRUSTA_COLUMNS_PICKER,
  PET_PETS_COLUMNS_TEMPLATE, PET_PETS_COLUMNS_PICKER,
  PET_SHRINES_COLUMNS_TEMPLATE, PET_SHRINES_COLUMNS_PICKER,
  PET_COMPONENTS_COLUMNS_TEMPLATE, PET_COMPONENTS_COLUMNS_PICKER,
  CROPMACHINE_COLUMNS_TEMPLATE, CROPMACHINE_COLUMNS_PICKER,
  EXPAND_COLUMNS_TEMPLATE, EXPAND_COLUMNS_PICKER,
  BUYNODES_COLUMNS_TEMPLATE, BUYNODES_COLUMNS_PICKER,
  AUCTIONS_COLUMNS_TEMPLATE, AUCTIONS_COLUMNS_PICKER,
} from '../constants/tableColumns.js';

/**
 * Hook for UI state management
 */
export function useUIState() {
  const [ui, setUI] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ui'));
      return {
        ...uiDefaults,
        ...normalizeUI(stored),
      };
    } catch {
      return uiDefaults;
    }
  });

  // Persist UI to localStorage
  useEffect(() => {
    localStorage.setItem('ui', JSON.stringify(ui));
  }, [ui]);

  const {
    inputValue,
    TryChecked,
    selectedInv,
    fromexpand,
    toexpand,
    selectedExpandType,
    selectedExpandAscension,
  } = ui;

  // Column picker helpers
  const invPickerOptions = useMemo(
    () => INV_COLUMNS_PICKER.map((c) => ({ value: String(c.idx), label: c.label })),
    []
  );
  const invPickerValue = useMemo(
    () => INV_COLUMNS_PICKER
      .filter((c) => ui?.xListeCol?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [ui?.xListeCol]
  );
  const invSortOptions = useMemo(() => {
    const visibleIdx = new Set(
      INV_COLUMNS_PICKER
        .filter((c) => ui?.xListeCol?.[c.idx]?.[1] === 1)
        .map((c) => c.idx)
    );
    return INV_SORT_OPTIONS_TEMPLATE
      .filter((o) => o.idx === null || visibleIdx.has(o.idx))
      .map(({ value, label }) => ({ value, label }));
  }, [ui?.xListeCol]);

  const cookPickerOptions = useMemo(
    () => COOK_COLUMNS_PICKER.map((c) => ({ value: String(c.idx), label: c.label })),
    []
  );
  const cookPickerValue = useMemo(
    () => COOK_COLUMNS_PICKER
      .filter((c) => ui?.xListeColCook?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [ui?.xListeColCook]
  );
  const cookSortOptions = useMemo(() => {
    const visibleIdx = new Set(
      COOK_COLUMNS_PICKER
        .filter((c) => ui?.xListeColCook?.[c.idx]?.[1] === 1)
        .map((c) => c.idx)
    );
    return COOK_SORT_OPTIONS_TEMPLATE
      .filter((o) => o.idx === null || visibleIdx.has(o.idx))
      .map(({ value, label }) => ({ value, label }));
  }, [ui?.xListeColCook]);

  const fishPickerOptions = useMemo(
    () => FISH_COLUMNS_PICKER.map((c) => ({ value: String(c.idx), label: c.label })),
    []
  );
  const fishPickerValue = useMemo(
    () => FISH_COLUMNS_PICKER
      .filter((c) => ui?.xListeColFish?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [ui?.xListeColFish]
  );

  const crustaPickerOptions = useMemo(
    () => CRUSTA_COLUMNS_PICKER.map((c) => ({ value: String(c.idx), label: c.label })),
    []
  );
  const crustaPickerValue = useMemo(
    () => CRUSTA_COLUMNS_PICKER
      .filter((c) => ui?.xListeColCrusta?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [ui?.xListeColCrusta]
  );

  const cropMachinePickerOptions = useMemo(
    () => CROPMACHINE_COLUMNS_PICKER.map((c) => ({ value: String(c.idx), label: c.label })),
    []
  );
  const cropMachinePickerValue = useMemo(
    () => CROPMACHINE_COLUMNS_PICKER
      .filter((c) => ui?.xListeColCropMachine?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [ui?.xListeColCropMachine]
  );

  const expandPickerOptions = useMemo(
    () => EXPAND_COLUMNS_PICKER.map((c) => ({ value: String(c.idx), label: c.label })),
    []
  );
  const expandPickerValue = useMemo(
    () => EXPAND_COLUMNS_PICKER
      .filter((c) => ui?.xListeColExpand?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [ui?.xListeColExpand]
  );

  const buyNodesPickerOptions = useMemo(
    () => BUYNODES_COLUMNS_PICKER.map((c) => ({ value: String(c.idx), label: c.label })),
    []
  );
  const buyNodesPickerValue = useMemo(
    () => BUYNODES_COLUMNS_PICKER
      .filter((c) => ui?.xListeColBuyNodes?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [ui?.xListeColBuyNodes]
  );

  const auctionsPickerOptions = useMemo(
    () => AUCTIONS_COLUMNS_PICKER.map((c) => ({ value: String(c.idx), label: c.label })),
    []
  );
  const auctionsPickerValue = useMemo(
    () => AUCTIONS_COLUMNS_PICKER
      .filter((c) => ui?.xListeColAuctions?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [ui?.xListeColAuctions]
  );

  const activePetColumnsPicker = useMemo(() => {
    if (ui?.petView === 'shrines') {
      return {
        template: PET_SHRINES_COLUMNS_TEMPLATE,
        picker: PET_SHRINES_COLUMNS_PICKER,
        stateKey: 'xListeColPetShrines',
      };
    }
    if (ui?.petView === 'components') {
      return {
        template: PET_COMPONENTS_COLUMNS_TEMPLATE,
        picker: PET_COMPONENTS_COLUMNS_PICKER,
        stateKey: 'xListeColPetComponents',
      };
    }
    return {
      template: PET_PETS_COLUMNS_TEMPLATE,
      picker: PET_PETS_COLUMNS_PICKER,
      stateKey: 'xListeColPetPets',
    };
  }, [ui?.petView]);

  const petPickerOptions = useMemo(
    () => (activePetColumnsPicker?.picker || []).map((c) => ({ value: String(c.idx), label: c.label })),
    [activePetColumnsPicker]
  );
  const petPickerValue = useMemo(
    () => (activePetColumnsPicker?.picker || [])
      .filter((c) => ui?.[activePetColumnsPicker?.stateKey]?.[c.idx]?.[1] === 1)
      .map((c) => String(c.idx)),
    [activePetColumnsPicker, ui]
  );

  // Validate sort options
  useEffect(() => {
    const current = ui?.invSortBy || 'none';
    if (!invSortOptions.some((o) => o.value === current)) {
      setUI(prev => ({ ...prev, invSortBy: 'none' }));
    }
  }, [ui?.invSortBy, invSortOptions]);

  useEffect(() => {
    const current = ui?.cookSortBy || 'none';
    if (!cookSortOptions.some((o) => o.value === current)) {
      setUI(prev => ({ ...prev, cookSortBy: 'none' }));
    }
  }, [ui?.cookSortBy, cookSortOptions]);

  return {
    // State
    ui,
    setUI,
    inputValue,
    TryChecked,
    selectedInv,
    fromexpand,
    toexpand,
    selectedExpandType,
    selectedExpandAscension,

    // Column pickers
    invPickerOptions,
    invPickerValue,
    invSortOptions,
    cookPickerOptions,
    cookPickerValue,
    cookSortOptions,
    fishPickerOptions,
    fishPickerValue,
    crustaPickerOptions,
    crustaPickerValue,
    cropMachinePickerOptions,
    cropMachinePickerValue,
    expandPickerOptions,
    expandPickerValue,
    buyNodesPickerOptions,
    buyNodesPickerValue,
    auctionsPickerOptions,
    auctionsPickerValue,
    activePetColumnsPicker,
    petPickerOptions,
    petPickerValue,

    // Constants for templates
    INV_COLUMNS_TEMPLATE,
    COOK_COLUMNS_TEMPLATE,
    FISH_COLUMNS_TEMPLATE,
    CRUSTA_COLUMNS_TEMPLATE,
    CROPMACHINE_COLUMNS_TEMPLATE,
    EXPAND_COLUMNS_TEMPLATE,
    BUYNODES_COLUMNS_TEMPLATE,
    AUCTIONS_COLUMNS_TEMPLATE,
    PET_PETS_COLUMNS_TEMPLATE,
    PET_SHRINES_COLUMNS_TEMPLATE,
    PET_COMPONENTS_COLUMNS_TEMPLATE,
  };
}

export default useUIState;
