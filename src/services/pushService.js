/**
 * Push Service - Web Push and FCM notification subscription management
 * Extracted from App.js subscribeToPush, unsubscribeFromPush
 */

/**
 * Convert base64 string to Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/**
 * Create a push service instance
 */
export function createPushService() {
  
  /**
   * Subscribe to web push notifications
   */
  async function subscribeWebPush(registration, applicationServerKey, subfarmData) {
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      const subscriptionJson = subscription?.toJSON();
      if (!subscriptionJson?.endpoint) {
        throw new Error('Invalid web push subscription payload');
      }

      const subfarm = {
        ...subfarmData,
        type: 'web',
        subscription: subscriptionJson
      };

      const response = await fetch('/save-subscription', {
        method: 'POST',
        body: JSON.stringify(subfarm),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`save-subscription failed (${response.status})`);
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to FCM push notifications (Capacitor native)
   */
  async function subscribeFCM(token, subfarmData) {
    const subfarm = {
      ...subfarmData,
      token: token.value,
      type: 'fcm'
    };

    try {
      await fetch('/save-subscription', {
        method: 'POST',
        body: JSON.stringify(subfarm),
        headers: { 'Content-Type': 'application/json' },
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async function unsubscribe(type, subfarmData) {
    const subfarm = {
      ...subfarmData,
      type: type
    };

    if (type === 'web') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          subfarm.subscription = subscription.toJSON();
        }
      } catch (error) {
        console.error('Web push unsubscribe error:', error);
      }
    }

    try {
      await fetch('/remove-subscription', {
        method: 'POST',
        body: JSON.stringify(subfarm),
        headers: { 'Content-Type': 'application/json' },
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check device subscription status
   */
  async function checkStatus(subfarmData) {
    try {
      const response = await fetch('/subscription-status', {
        method: 'POST',
        body: JSON.stringify(subfarmData),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Subscription status error (${response.status})`);
      }
      return { success: true, data: await response.json(), error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Update notification list subscription
   */
  async function updateNotifList(subfarmData) {
    try {
      await fetch('/notiflist-subscription', {
        method: 'POST',
        body: JSON.stringify(subfarmData),
        headers: { 'Content-Type': 'application/json' },
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update auction notification list subscription
   */
  async function updateAuctionList(subfarmData) {
    try {
      await fetch('/auctionlist-subscription', {
        method: 'POST',
        body: JSON.stringify(subfarmData),
        headers: { 'Content-Type': 'application/json' },
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return {
    subscribeWebPush,
    subscribeFCM,
    unsubscribe,
    checkStatus,
    updateNotifList,
    updateAuctionList,
    urlBase64ToUint8Array,
  };
}

export default createPushService;
