/**
 * Option Handlers - Handle options/state changes from form inputs
 * Extracted from App.js handleOptionChange, setOptionField
 */

import { resetMultiFarmNotifPromptLocal } from '../utils/notificationPrefs.js';

/**
 * Create option handlers
 */
export function createOptionHandlers(dataSet, setOptions, handleNotificationToggle) {
  
  /**
   * Set an option field value
   */
  function setOptionField(name, valueOrUpdater) {
    setOptions((prev) => {
      const prevValue = prev?.[name];
      const nextValue = typeof valueOrUpdater === 'function'
        ? valueOrUpdater(prevValue)
        : valueOrUpdater;
      const nextOptions = { ...(prev ?? {}), [name]: nextValue };
      dataSet.options = nextOptions;
      return nextOptions;
    });
  }

  /**
   * Handle option changes from form inputs
   */
  function handleOptionChange(eventOrValue, fieldName = null) {
    if (Array.isArray(eventOrValue) && fieldName) {
      const nextOptions = { ...(dataSet.options || {}), [fieldName]: eventOrValue };
      dataSet.options = nextOptions;
      setOptions(nextOptions);
      return;
    }

    let xvalue = 0;
    let name = '';
    
    if (eventOrValue?.target) {
      const t = eventOrValue.target;
      name = t.name;
      if (t.type === 'checkbox') {
        xvalue = !!t.checked;
      } else {
        const raw = t.value;
        if (raw === null || raw === undefined || raw === '') {
          xvalue = 0;
        } else if (typeof raw === 'number') {
          xvalue = raw;
        } else {
          if (name === 'tradeTax') {
            xvalue = Number(String(raw).replace(/[^0-9.]/g, ''));
          } else {
            xvalue = Number(String(raw).replace(/\D/g, ''));
          }
        }
      }
    } else {
      xvalue = Number(eventOrValue);
      name = fieldName;
    }

    // Handle notifList array update
    if (!name) {
      if (Array.isArray(eventOrValue)) {
        if (JSON.stringify(dataSet.options.notifList) !== JSON.stringify(eventOrValue)) {
          resetMultiFarmNotifPromptLocal();
          dataSet.options.notifList = eventOrValue;
          setOptions({ ...dataSet.options, notifList: eventOrValue });
        }
        return;
      }
      return;
    }

    if (isNaN(xvalue)) xvalue = 0;
    if (xvalue < 0) xvalue = 1;

    // Handle animal level
    if (name.startsWith('animalLvl_')) {
      const animal = name.replace('animalLvl_', '');
      const newAnimalLvl = { ...(dataSet.options.animalLvl || {}), [animal]: xvalue };
      const newOptions = { ...dataSet.options, animalLvl: newAnimalLvl };
      dataSet.options = newOptions;
      setOptions(newOptions);
      return;
    }

    // Handle notification toggle
    if (name === 'useNotifications') {
      resetMultiFarmNotifPromptLocal();
      handleNotificationToggle(!!xvalue, { fromUserGesture: !!eventOrValue?.target });
      return;
    }

    // Handle special cases
    switch (name) {
      case 'FarmTime':
        if (xvalue > 24) xvalue = 24;
        dataSet.options.inputFarmTime = xvalue;
        setOptions({ ...dataSet.options });
        break;
      case 'CoinsRatio':
        dataSet.options.coinsRatio = xvalue;
        setOptions({ ...dataSet.options });
        break;
      case 'GemsRatio':
        dataSet.options.gemsRatio = xvalue;
        setOptions({ ...dataSet.options });
        break;
      default:
        try {
          if (name === 'auctionNotifSelection') {
            resetMultiFarmNotifPromptLocal();
          }
          dataSet.options[name] = xvalue;
          setOptions({ ...dataSet.options });
        } catch (error) {
          console.error('Error updating option:' + name + ': ', error);
        }
    }
  }

  return {
    setOptionField,
    handleOptionChange,
  };
}

export default createOptionHandlers;
