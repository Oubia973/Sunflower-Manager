self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const CACHE_VERSION = 'v1';
const IMAGE_CACHE = `sunflower-manager-images-${CACHE_VERSION}`;
const API_CACHE = `sunflower-manager-api-${CACHE_VERSION}`;
const RESERVED_NOTIFICATION_KEYS = new Set([
  'itemIconPath',
  'title',
  'body',
  'farmId',
  'type',
  'id',
]);
const COMPOSTER_ICON_BY_BUILD = {
  'Compost Bin': './icon/res/sprout_mix.png',
  'Turbo Composter': './icon/res/fruitful_blend.png',
  'Premium Composter': './icon/res/rapid_root.png',
};

function resolveHoneyIcon(itemsText) {
  const haystack = String(itemsText || '').toLowerCase();
  if (haystack.includes('honey')) return './icon/res/honey.png';
  return '';
}

function resolveNeedsLoveAnimalIcon(itemsText) {
  const haystack = String(itemsText || '').toLowerCase();
  const match = haystack.match(/\b(chicken|cow|sheep)\b(?=\s+needs love\b)/i);
  if (!match) return '';
  const animal = String(match[1] || '').toLowerCase();
  if (animal === 'chicken') return './icon/res/chkn.png';
  if (animal === 'cow') return './icon/res/cow.webp';
  if (animal === 'sheep') return './icon/res/sheep.webp';
  return '';
}

function isCacheableImageRequest(request) {
  if (!request || request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (request.destination === 'image') return true;
  return (
    url.pathname.startsWith('/icon/') ||
    url.pathname.startsWith('/image/') ||
    url.pathname === '/logo512.png' ||
    url.pathname === '/logo192.png' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.svg')
  );
}

function isCacheableApiRequest(request) {
  if (!request || request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return url.pathname === '/getsectionsmeta' || url.pathname.startsWith('/trynft-short/');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
      return response;
    }
    return response || Response.error();
  } catch {
    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
      return response;
    }
    const cached = await cache.match(request);
    return cached || response || Response.error();
  } catch {
    const cached = await cache.match(request);
    return cached || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (isCacheableImageRequest(event.request)) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }
  if (isCacheableApiRequest(event.request)) {
    event.respondWith(networkFirst(event.request, API_CACHE));
  }
});

self.addEventListener('push', async function (event) {
  const data = event.data.json();
  let items = [];
  let itemIconPath = '';
  if (Array.isArray(data)) {
    items = data.map(item => item.item || item);
  } else if (typeof data === "object" && data !== null) {
    items = Object.keys(data).filter((key) => !RESERVED_NOTIFICATION_KEYS.has(key));
    itemIconPath = String(data.itemIconPath || '').trim();
  }

  if (!itemIconPath) {
    const haystack = items.join(' ').toLowerCase();
    itemIconPath = resolveHoneyIcon(haystack);
  }

  if (!itemIconPath) {
    const haystack = items.join(' ').toLowerCase();
    itemIconPath = resolveNeedsLoveAnimalIcon(haystack);
  }

  if (!itemIconPath) {
    const haystack = items.join(' ').toLowerCase();
    for (const [buildName, iconPath] of Object.entries(COMPOSTER_ICON_BY_BUILD)) {
      if (haystack.includes(buildName.toLowerCase())) {
        itemIconPath = iconPath;
        break;
      }
    }
  }

  const existingNotifications = await self.registration.getNotifications({ tag: 'sunflowerman-notif' });
  let previousItems = [];
  if (existingNotifications.length > 0) {
    // Récupère le body de la notif précédente
    const prevBody = existingNotifications[0].body;
    if (prevBody) {
      previousItems = prevBody.split('\n');
    }
  }

  // Fusionne les anciennes et nouvelles notifications (évite les doublons)
  const allItems = Array.from(new Set([...previousItems, ...items]));

  const bodyText = allItems.join('\n');
  self.registration.showNotification('Sunflower Manager', {
    body: bodyText,
    icon: itemIconPath || './logo192.png',
    image: itemIconPath || './logo192.png',
    badge: './logo192.png',
    tag: 'sunflowerman-notif',
    renotify: true
  });
});
