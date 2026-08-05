/**
 * useNotifications Hook - Push notification management
 * Extracted from App.js notification system
 */

import { useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import {
  readNotifPrefs,
  setNotifFarmEnabledLocal,
  clearNotifFarmsEnabledLocal,
  resetMultiFarmNotifPromptLocal,
  setSkipMultiFarmNotifPromptLocal,
  getOtherEnabledNotifFarmIdsLocal,
} from '../utils/notificationPrefs.js';
import { detectBraveBrowser } from '../utils/browser.js';

const isNativeApp = Capacitor.isNativePlatform();

/**
 * Hook for push notification management
 */
export function useNotifications(
  API_URL,
  farmId,
  deviceIdRef,
  dataSet,
  setOptions,
  promptInfo,
  promptChoice,
  promptConfirm,
  pushService
) {
  const notifBootCheckedRef = useRef('');
  const notifPromptOpenRef = useRef(false);
  const notifActivationInFlightRef = useRef(false);
  const nativePushListenersBoundRef = useRef(false);
  const auctionNotifSyncTimerRef = useRef(null);

  const getDataSet = useCallback(() => {
    return typeof dataSet === 'function' ? (dataSet() || {}) : (dataSet || {});
  }, [dataSet]);

  const getFarmId = useCallback(() => {
    const value = typeof farmId === 'function' ? farmId() : farmId;
    return String(value || '').trim();
  }, [farmId]);

  const setUseNotificationsOption = useCallback((nextValue) => {
    const currentDataSet = getDataSet();
    currentDataSet.options = {
      ...(currentDataSet.options || {}),
      useNotifications: !!nextValue,
    };
    if (typeof setOptions === 'function') {
      setOptions({ ...currentDataSet.options });
    }
  }, [getDataSet, setOptions]);

  /**
   * Build disabled notification items list
   */
  const buildDisabledNotifItems = useCallback((notifList) => {
    return (notifList || [])
      .filter(([, enabled]) => Number(enabled) !== 1)
      .map(([key]) => key);
  }, []);

  /**
   * Build auction watch entries
   */
  const buildAuctionWatchEntries = useCallback((source) => {
    const farmKey = getFarmId();
    const allSelections = (source && typeof source === 'object') ? source : {};
    const src = farmKey && allSelections?.[farmKey] && typeof allSelections[farmKey] === 'object'
      ? allSelections[farmKey]
      : {};

    return Object.entries(src)
      .map(([auctionId, rawEntry]) => {
        const entry = (rawEntry && typeof rawEntry === 'object') ? rawEntry : {};
        const endAt = Number(entry?.e ?? entry?.endAt ?? 0);
        const label = String((entry?.l ?? entry?.label) || '').trim();
        const id = String(auctionId || entry?.id || '').trim();
        if (!id || !Number.isFinite(endAt) || endAt <= Date.now()) return null;
        return { id, e: endAt, l: label || id };
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.e || 0) - Number(b.e || 0));
  }, [getFarmId]);

  /**
   * Subscribe to push notifications
   */
  const subscribeToPush = useCallback(async () => {
    const currentFarmId = getFarmId();
    const currentDataSet = getDataSet();
    if (!currentFarmId) {
      console.warn('subscribeToPush skipped: missing farmId');
      return false;
    }

    try {
      if (isNativeApp) {
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive === 'granted') {
          if (!nativePushListenersBoundRef.current) {
            nativePushListenersBoundRef.current = true;
            PushNotifications.addListener('registration', async (token) => {
              console.log('FCM token:', token.value);
              const liveDataSet = getDataSet();
              liveDataSet.options = { ...(liveDataSet.options || {}) };
              liveDataSet.options.pushToken = token.value;
              const subfarm = {
                farmId: currentFarmId,
                deviceId: deviceIdRef.current,
                token: token.value,
                type: 'fcm',
                notifDisplayMode: 'native-large-icon',
                notifOffItems: buildDisabledNotifItems(liveDataSet.options?.notifList),
                auctionWatch: buildAuctionWatchEntries(liveDataSet.options?.auctionNotifSelection),
              };
              await pushService.subscribeFCM(token, subfarm);
            });
            PushNotifications.addListener('registrationError', (err) => {
              console.error('FCM registration error:', err);
              promptInfo('Unable to activate notifications on this device right now.', 'Notifications', 'OK');
            });
          }
          await PushNotifications.register();
        } else {
          await promptInfo('Notification permission was not granted on this device.', 'Notifications', 'OK');
          return false;
        }
      } else {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          await promptInfo('This browser does not fully support push notifications.', 'Notifications', 'OK');
          return false;
        }

        const browserPermission = await Notification.requestPermission();
        if (browserPermission !== 'granted') {
          await promptInfo('Browser notification permission was not granted.', 'Notifications', 'OK');
          return false;
        }

        const registration = await navigator.serviceWorker.ready;
        const webPushK = process.env.REACT_APP_WEBPUSH_PUBLICKEY;
        if (!webPushK) {
          throw new Error('Missing REACT_APP_WEBPUSH_PUBLICKEY');
        }

        const applicationServerKey = pushService.urlBase64ToUint8Array(webPushK);
        const subfarmData = {
          farmId: currentFarmId,
          deviceId: deviceIdRef.current,
          type: 'web',
          notifOffItems: buildDisabledNotifItems(currentDataSet.options?.notifList),
          auctionWatch: buildAuctionWatchEntries(currentDataSet.options?.auctionNotifSelection),
        };

        const result = await pushService.subscribeWebPush(registration, applicationServerKey, subfarmData);
        if (!result.success) {
          throw new Error(result.error);
        }
      }
      return true;
    } catch (error) {
      const isBraveBrowser = !isNativeApp && await detectBraveBrowser();
      if (isBraveBrowser) {
        await promptInfo(
          "Brave accepted the site permission but is still blocking web push. In Brave, open brave://settings/privacy and enable 'Use Google services for push messaging', then restart Brave and try again.",
          'Notifications',
          'OK'
        );
      } else {
        await promptInfo('Unable to activate notifications right now on this device/browser.', 'Notifications', 'OK');
      }
      return false;
    }
  }, [getFarmId, getDataSet, deviceIdRef, promptInfo, pushService, buildDisabledNotifItems, buildAuctionWatchEntries]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribeFromPush = useCallback(async () => {
    const currentFarmId = getFarmId();
    const currentDataSet = getDataSet();
    if (!currentFarmId) return;

    const subfarmData = {
      farmId: currentFarmId,
      deviceId: deviceIdRef.current,
    };

    if (isNativeApp) {
      const token = currentDataSet.options?.pushToken;
      if (token) subfarmData.token = token;
      await pushService.unsubscribe('fcm', subfarmData);
      currentDataSet.options = { ...(currentDataSet.options || {}), pushToken: '' };
    } else {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          subfarmData.subscription = subscription.toJSON();
        }
      } catch (error) {
        console.error('Web push unsubscribe error:', error);
      }
      await pushService.unsubscribe('web', subfarmData);
    }
  }, [getFarmId, getDataSet, deviceIdRef, pushService]);

  /**
   * Toggle notifications
   */
  const handleNotificationToggle = useCallback(async (nextValue, options = {}) => {
    const fromUserGesture = options?.fromUserGesture === true;
    const currentFarmId = getFarmId();
    if (!currentFarmId) {
      setUseNotificationsOption(nextValue);
      return !!nextValue;
    }

    if (!nextValue) {
      setUseNotificationsOption(false);
      resetMultiFarmNotifPromptLocal();
      await unsubscribeFromPush();
      setNotifFarmEnabledLocal(currentFarmId, false);
      return false;
    }

    if (isNativeApp) {
      setUseNotificationsOption(true);
      const activated = await subscribeToPush();
      if (!activated) setUseNotificationsOption(false);
      setNotifFarmEnabledLocal(currentFarmId, activated);
      return activated;
    }

    if (!fromUserGesture) {
      setUseNotificationsOption(false);
      await promptInfo(
        'Browser notifications must be activated from a direct click in Options. Tick Notifications again to reactivate them.',
        'Notifications',
        'OK'
      );
      return false;
    }

    setUseNotificationsOption(true);
    let activated = false;
    notifActivationInFlightRef.current = true;
    try {
      activated = await subscribeToPush();
    } finally {
      notifActivationInFlightRef.current = false;
    }
    if (!activated) setUseNotificationsOption(false);
    setNotifFarmEnabledLocal(currentFarmId, activated);
    return activated;
  }, [getFarmId, subscribeToPush, unsubscribeFromPush, promptInfo, setUseNotificationsOption]);

  /**
   * Check device subscription status
   */
  const checkDeviceSubscriptionStatus = useCallback(async () => {
    const currentFarmId = getFarmId();
    const currentDataSet = getDataSet();
    if (!currentFarmId) return null;

    const subfarmData = {
      farmId: currentFarmId,
      deviceId: deviceIdRef.current,
      type: isNativeApp ? 'fcm' : 'web',
    };

    const result = await pushService.checkStatus(subfarmData);
    return result.success ? result.data : null;
  }, [getFarmId, getDataSet, deviceIdRef, pushService]);

  /**
   * Update notification list
   */
  const updateNotifList = useCallback(async () => {
    const currentFarmId = getFarmId();
    const currentDataSet = getDataSet();
    if (!currentFarmId) return;

    const subfarmData = {
      farmId: currentFarmId,
      deviceId: deviceIdRef.current,
      type: isNativeApp ? 'fcm' : 'web',
      notifOffItems: buildDisabledNotifItems(currentDataSet.options?.notifList),
      auctionWatch: buildAuctionWatchEntries(currentDataSet.options?.auctionNotifSelection),
    };

    await pushService.updateNotifList(subfarmData);
  }, [getFarmId, getDataSet, deviceIdRef, pushService, buildDisabledNotifItems, buildAuctionWatchEntries]);

  /**
   * Update auction notification list
   */
  const updateAuctionNotifList = useCallback(async (auctionWatchInput = null) => {
    const currentFarmId = getFarmId();
    const currentDataSet = getDataSet();
    if (!currentFarmId) return;

    const subfarmData = {
      farmId: currentFarmId,
      deviceId: deviceIdRef.current,
      type: isNativeApp ? 'fcm' : 'web',
      auctionWatch: Array.isArray(auctionWatchInput) ? auctionWatchInput : buildAuctionWatchEntries(currentDataSet.options?.auctionNotifSelection),
    };

    await pushService.updateAuctionList(subfarmData);
  }, [getFarmId, getDataSet, deviceIdRef, pushService, buildAuctionWatchEntries]);

  /**
   * Sync auction notifications
   */
  const syncAuctionNotifSelection = useCallback(async (selectionSource = null) => {
    if (!getFarmId()) return;
    try {
      const currentDataSet = getDataSet();
      await updateAuctionNotifList(buildAuctionWatchEntries(selectionSource || currentDataSet.options?.auctionNotifSelection));
    } catch (error) {
      console.error('Error syncing auction notifications:', error);
    }
  }, [getFarmId, getDataSet, buildAuctionWatchEntries, updateAuctionNotifList]);

  /**
   * Check notification status on boot
   */
  const checkBootStatus = useCallback(async () => {
    const currentFarmId = getFarmId();
    const currentDataSet = getDataSet();
    if (!currentFarmId || !currentDataSet.options?.useNotifications) return;

    const checkKey = `${currentFarmId}|${deviceIdRef.current}`;
    if (notifBootCheckedRef.current === checkKey) return;
    notifBootCheckedRef.current = checkKey;

    let cancelled = false;
    try {
      const status = await checkDeviceSubscriptionStatus();
      if (cancelled) return;

      if (status?.active) {
        setNotifFarmEnabledLocal(currentFarmId, true);
        return;
      }

      if (!status?.found) {
        clearNotifFarmsEnabledLocal();
      }
      setNotifFarmEnabledLocal(currentFarmId, false);

      if (notifActivationInFlightRef.current || notifPromptOpenRef.current) return;

      const notifPrefs = readNotifPrefs();
      const otherEnabledFarmIds = getOtherEnabledNotifFarmIdsLocal(currentFarmId);

      if (otherEnabledFarmIds.length > 0) {
        if (notifPrefs.skipMultiFarmPrompt) return;
        notifPromptOpenRef.current = true;
        const choice = await promptChoice(
          'Notifications are already active on another farm on this device. Do you want to activate them on this farm too?',
          'Notifications',
          [
            { value: 'activate', label: 'Activate here too', primary: true },
            { value: 'later', label: 'Not for now' },
            { value: 'skip-multi', label: "Don't ask again" },
          ]
        );
        notifPromptOpenRef.current = false;
        if (cancelled) return;
        if (choice === 'skip-multi') {
          setSkipMultiFarmNotifPromptLocal(true);
          return;
        }
        if (choice !== 'activate') return;
        await handleNotificationToggle(true, { fromUserGesture: isNativeApp });
        return;
      }

      notifPromptOpenRef.current = true;
      const confirmed = await promptConfirm(
        'Notifications are no longer active on this device. Do you want to reactivate them now?',
        'Notifications',
        'Reactivate',
        'Later'
      );
      notifPromptOpenRef.current = false;
      if (cancelled || !confirmed) return;
      await handleNotificationToggle(true, { fromUserGesture: isNativeApp });
    } catch (error) {
      notifPromptOpenRef.current = false;
      console.error('Notification startup status check failed:', error);
    }
  }, [getFarmId, getDataSet, deviceIdRef, checkDeviceSubscriptionStatus, handleNotificationToggle, promptChoice, promptConfirm]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (auctionNotifSyncTimerRef.current) {
        clearTimeout(auctionNotifSyncTimerRef.current);
        auctionNotifSyncTimerRef.current = null;
      }
    };
  }, []);

  return {
    subscribeToPush,
    unsubscribeFromPush,
    handleNotificationToggle,
    checkDeviceSubscriptionStatus,
    updateNotifList,
    updateAuctionNotifList,
    syncAuctionNotifSelection,
    checkBootStatus,
    buildDisabledNotifItems,
    buildAuctionWatchEntries,
    notifPromptOpenRef,
    notifActivationInFlightRef,
  };
}

export default useNotifications;
