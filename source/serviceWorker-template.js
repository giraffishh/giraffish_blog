const cacheVersion = '__CACHE_VERSION__'; // This will be replaced by the build script
const cacheName = `blog-cache-${cacheVersion}`;

// Cache strategy types
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// *** Define your allowed image hosting domains here ***
const ALLOWED_IMAGE_HOSTS = [
  'img.picgo.net',
  's1.imagehub.cc',
  'hexo-blog-netlify.oss-cn-shenzhen.aliyuncs.com',
];

// Initial cache files
const initialCacheFiles = [
  // Core pages
  "/",
  "/index.html",
  "/archives/index.html",
  "/categories/index.html",
  "/tags/index.html",
  "/404.html",

  // Key style files
  "/css/main.css",
  "/css/highlight.css",

  // Core scripts
  "/js/boot.js",
  "/js/utils.js",
  "/js/events.js",
  "/js/plugins.js",
  "/js/color-schema.js",

  // Important images (typically same-origin)
  "/img/icons/icon192.png", // PWA Icon
  "/img/icons/icon512.png", // PWA Large Icon

  // PWA essential files
  "/manifest.json",

  // Search function related
  "/xml/local-search.xml",
  "/js/local-search.js"
];

// Maximum cache items
const MAX_CACHE_ITEMS = 250;
// Threshold to trigger cleanup
const CACHE_CLEANUP_THRESHOLD = 200;
// Percentage to clean up at a time
const CACHE_CLEANUP_PERCENT = 0.1;

/**
 * Install Service Worker
 */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(initialCacheFiles);
    })
  );
  self.skipWaiting();
});

/**
 * Activate Service Worker
 */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== cacheName) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

/**
 * Check if a request is cacheable
 * Prevents unsupported URL schemes (e.g., chrome-extension:)
 */
function isCacheableRequest(request) {
  try {
    const url = new URL(request.url);
    // Only GET requests with http/https protocol are cacheable
    return ['http:', 'https:'].includes(url.protocol) && request.method === 'GET';
  } catch (e) {
    // Invalid URL
    return false;
  }
}

/**
 * Decide which caching strategy to use
 */
function decideCachingStrategy(url, request) {
  // First, check URL protocol and request method
  if (!['http:', 'https:'].includes(url.protocol) || request.method !== 'GET') {
    return null; // Do not cache non-http/https protocols or non-GET requests
  }

  const path = url.pathname;
  const hostname = url.hostname;

  // Ignore specific paths
  if (path.startsWith('/admin/') || path.startsWith('/.netlify/')) {
    return null;
  }

  // Image files: Cache-first, but only from allowed hosts
  if (path.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|webm)$/i)) {
    if (ALLOWED_IMAGE_HOSTS.includes(hostname)) {
      return CACHE_STRATEGIES.CACHE_FIRST;
    } else {
      // Image from a non-allowed host: do not cache with Service Worker
      // console.log(`Image from unallowed host ${hostname} (${url.href}) will not be cached by SW strategy.`);
      return null;
    }
  }

  // HTML files: Network-first
  if (path.endsWith('/') || path.endsWith('.html')) {
    return CACHE_STRATEGIES.NETWORK_FIRST;
  }

  // JS/CSS and other static assets (typically same-origin): Cache-first
  if (path.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
    // Assuming these are same-origin or from trusted CDNs you might add to ALLOWED_IMAGE_HOSTS
    // or handle with a more generic rule if they are not images.
    // For simplicity, keeping cache-first for same-origin like assets.
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // API requests or other dynamic content: Stale-while-revalidate
  if (path.includes('/api/') || request.headers.get('Accept')?.includes('application/json')) {
    return CACHE_STRATEGIES.STALE_WHILE_REVALIDATE;
  }

  // Default for same-origin resources not explicitly matched: Cache-first
  // This primarily applies to same-origin resources.
  // Cross-origin resources not matching any rule above (and not being images from allowed hosts)
  // will effectively not be handled if this default is too broad.
  // Consider if you want a default for *all* other GET requests or only same-origin.
  if (hostname === self.location.hostname) {
    return CACHE_STRATEGIES.CACHE_FIRST;
  }

  // For any other cross-origin requests not explicitly handled (e.g., fonts from CDNs not listed),
  // you might want a specific strategy or return null to let the browser handle them.
  // For now, returning null for unhandled cross-origin.
  return null;
}


/**
 * Safely cache a response, handling opaque responses from allowed image hosts.
 */
async function safeCachePut(cache, request, response) {
  // Only cache GET requests
  if (request.method !== 'GET' || !response) {
    return;
  }

  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname;
  const isImageRequest = requestUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)$/i);

  // Condition 1: The response is OK (successful, non-opaque)
  const isResponseOkAndCacheable = response.ok && response.status < 400;

  // Condition 2: It's an image request from an allowed host, and the response is opaque
  // This allows caching images from CDNs/image hosts that don't send CORS headers
  const isAllowedOpaqueImage = isImageRequest &&
                               ALLOWED_IMAGE_HOSTS.includes(hostname) &&
                               response.type === 'opaque';

  if (isResponseOkAndCacheable || isAllowedOpaqueImage) {
    try {
      await cache.put(request, response.clone()); // Always clone the response before caching
      // console.log(`Successfully cached: ${request.url} (Type: ${response.type})`);
    } catch (error) {
      console.error('Cache put failed:', error.message, request.url);
    }
  } else {
    // Log why it wasn't cached for debugging, if needed
    // if (!isResponseOkAndCacheable && !isAllowedOpaqueImage) {
    //   console.log(`Did not cache: ${request.url} (Response not OK or not an allowed opaque image. Type: ${response.type}, Status: ${response.status}, Host: ${hostname})`);
    // }
  }
}

/**
 * Cache First strategy
 */
async function cacheFirst(request) {
  if (!isCacheableRequest(request)) {
    try {
      return await fetch(request);
    } catch (error) {
      // console.error('Uncacheable request fetch failed:', error, request.url);
      return new Response('Resource unavailable (uncacheable request)', {
        status: 408,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }
  }

  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    // networkResponse might be undefined if fetch fails (e.g. network error)
    if (networkResponse) {
      // safeCachePut will handle whether to actually store it based on its own logic
      // (including opaque responses for allowed image hosts)
      const cache = await caches.open(cacheName);
      await safeCachePut(cache, request, networkResponse.clone()); // Clone for caching
    }
    return networkResponse || new Response('Network request failed and no cache hit.', { // Provide a fallback if networkResponse is null
        status: 408, // Request Timeout
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });
  } catch (error) {
    // console.error('CacheFirst: Network request failed:', error, request.url);
    return new Response('Network request failed. Please check your connection.', {
      status: 408, // Request Timeout
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });
  }
}

/**
 * Network First strategy
 */
async function networkFirst(request) {
  if (!isCacheableRequest(request)) {
    try {
      return await fetch(request);
    } catch (error) {
      return new Response('Resource unavailable (uncacheable request)', {
        status: 408,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse) { // Check if networkResponse is not undefined
        // safeCachePut will handle whether to actually store it
        const cache = await caches.open(cacheName);
        await safeCachePut(cache, request, networkResponse.clone());
    }
    return networkResponse || new Response('Network error, resource not found.', { status: 504 }); // Fallback if networkResponse is null
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Optional: return a custom offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/404.html'); // Or a specific offline.html
      if (offlinePage) return offlinePage;
    }

    return new Response('Network request failed and no cache for this resource.', {
      status: 504, // Gateway Timeout
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });
  }
}

/**
 * Stale While Revalidate strategy
 */
async function staleWhileRevalidate(request) {
  if (!isCacheableRequest(request)) {
    try {
      return await fetch(request);
    } catch (error) {
      return new Response('Resource unavailable (uncacheable request)', {
        status: 408,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }
  }

  const cache = await caches.open(cacheName);
  const cachedResponsePromise = cache.match(request);
  
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse) { // Check if networkResponse is not undefined
        safeCachePut(cache, request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      // console.warn('StaleWhileRevalidate: Fetch failed, relying on cache if available.', error, request.url);
      // If fetch fails, and we have a cached response, that will be used.
      // If no cached response, this error doesn't directly result in a response to client unless cachedResponsePromise also resolves to undefined.
      return null; // Ensure promise chain resolves
    });

  const cachedResponse = await cachedResponsePromise;
  return cachedResponse || fetchPromise;
}


/**
 * Trim old cache items
 */
async function trimCache() {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    if (requests.length > CACHE_CLEANUP_THRESHOLD) {
      // console.log(`Cache items (${requests.length}) exceed threshold (${CACHE_CLEANUP_THRESHOLD}), starting cleanup.`);
      const deleteCount = Math.floor(requests.length * CACHE_CLEANUP_PERCENT);
      // Simple strategy: delete the oldest (first in list, assuming order is preserved, though not guaranteed)
      // A more robust strategy might involve tracking access times if possible, or random eviction.
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(requests[i]);
      }
      // console.log(`Cleaned ${deleteCount} cache items. Current cache size: ${requests.length - deleteCount}`);
    }
  } catch (error) {
    console.error('Error during cache trim:', error);
  }
}

/**
 * Handle fetch requests and apply appropriate caching strategy
 */
self.addEventListener("fetch", event => {
  // Periodically trim cache (on a small percentage of fetches)
  if (Math.random() < 0.05) { // Roughly 5% of requests
    event.waitUntil(trimCache());
  }

  const url = new URL(event.request.url);

  // Do not handle non-http/https protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return;
  }

  const strategy = decideCachingStrategy(url, event.request);

  // If no strategy is determined (e.g., image from unallowed host, or non-cacheable request),
  // let the browser handle it normally.
  if (!strategy) {
    // console.log(`No SW strategy for ${url.href}, browser will handle.`);
    return;
  }

  switch (strategy) {
    case CACHE_STRATEGIES.NETWORK_FIRST:
      event.respondWith(networkFirst(event.request));
      break;
    case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
      event.respondWith(staleWhileRevalidate(event.request));
      break;
    case CACHE_STRATEGIES.CACHE_FIRST:
    default: // Fallback to cache-first if strategy is somehow undefined but not null
      event.respondWith(cacheFirst(event.request));
      break;
  }
});

/**
 * Optional: Listen to message events for manual cache control
 */
self.addEventListener('message', event => {
  if (event.data && event.data.action) {
    switch (event.data.action) {
      case 'skipWaiting':
        self.skipWaiting();
        break;
      case 'clearCache':
        event.waitUntil(
          caches.delete(cacheName).then(() => {
            // console.log(`Cache ${cacheName} cleared.`);
            // Optionally re-populate with initial files, or let it build up naturally
            return caches.open(cacheName).then(cache => {
              return cache.addAll(initialCacheFiles);
            });
          })
        );
        break;
    }
  }
});