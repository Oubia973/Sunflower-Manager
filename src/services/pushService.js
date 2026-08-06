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

async function postJson(endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

  let responseData = null;
  try {
    responseData = await response.json();
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const message = responseData?.error || responseData?.message || `${endpoint} failed (${response.status})`;
    const error = new Error(String(message));
    error.status = response.status;
    error.code = responseData?.code || '';
    error.retryAfterMs = Number(responseData?.retryAfterMs || 0);
    throw error;
  }

  return responseData;
}

/**
 * Create a push service instance
 */
export function createPushService(apiUrl = '') {
  const baseUrl = String(apiUrl || '').replace(/\/$/, '');
  const endpointUrl = (endpoint) => `${baseUrl}${endpoint}`;
  
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

      await postJson(endpointUrl('/save-subscription'), subfarm);

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
      await postJson(endpointUrl('/save-subscription'), subfarm);
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
      await postJson(endpointUrl('/remove-subscription'), subfarm);
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
      const data = await postJson(endpointUrl('/subscription-status'), subfarmData);
      return { success: true, data, error: null };
    } catch (error) {
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Update notification list subscription
   */
  async function updateNotifList(subfarmData) {
    try {
      await postJson(endpointUrl('/notiflist-subscription'), subfarmData);
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
      await postJson(endpointUrl('/auctionlist-subscription'), subfarmData);
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
