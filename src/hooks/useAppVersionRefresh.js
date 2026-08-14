import { useEffect } from 'react';

const BUILD_VERSION = process.env.REACT_APP_BUILD_VERSION || '';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_VERSION_KEY = 'sunflower-manager-reload-version';
const APP_CACHE_PREFIX = 'sunflower-manager-';

async function clearAppRuntimeCaches() {
  if (!('caches' in window)) return;

  try {
    const cacheNames = await window.caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(APP_CACHE_PREFIX))
        .map((cacheName) => window.caches.delete(cacheName))
    );
  } catch (error) {
    console.debug('Unable to clear the application caches:', error);
  }
}

export function useAppVersionRefresh() {
  useEffect(() => {
    if (!BUILD_VERSION) return undefined;

    let requestInProgress = false;
    let lastReloadVersion = '';

    const getReloadVersion = () => {
      try {
        return sessionStorage.getItem(RELOAD_VERSION_KEY) || lastReloadVersion;
      } catch {
        return lastReloadVersion;
      }
    };

    const setReloadVersion = (version) => {
      lastReloadVersion = version;
      try {
        if (version) {
          sessionStorage.setItem(RELOAD_VERSION_KEY, version);
        } else {
          sessionStorage.removeItem(RELOAD_VERSION_KEY);
        }
      } catch {
        // The in-memory fallback still prevents repeated reloads in this page.
      }
    };

    const checkVersion = async () => {
      if (requestInProgress || !navigator.onLine) return;
      requestInProgress = true;

      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const remoteVersion = String(data?.version || '').trim();

        if (!remoteVersion || remoteVersion === BUILD_VERSION) {
          setReloadVersion('');
          return;
        }

        if (getReloadVersion() === remoteVersion) return;

        setReloadVersion(remoteVersion);
        await clearAppRuntimeCaches();
        window.location.reload();
      } catch (error) {
        console.debug('Unable to check the application version:', error);
      } finally {
        requestInProgress = false;
      }
    };

    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };

    checkVersion();
    document.addEventListener('visibilitychange', checkWhenVisible);
    window.addEventListener('focus', checkVersion);
    window.addEventListener('pageshow', checkVersion);
    window.addEventListener('online', checkVersion);
    const intervalId = window.setInterval(checkVersion, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.removeEventListener('focus', checkVersion);
      window.removeEventListener('pageshow', checkVersion);
      window.removeEventListener('online', checkVersion);
      window.clearInterval(intervalId);
    };
  }, []);
}
