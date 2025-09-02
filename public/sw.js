// VGReviewApp Service Worker
// Version: 1.0.0
// Last Updated: September 2025

const CACHE_NAME = 'vgreview-v1';
const DYNAMIC_CACHE = 'vgreview-dynamic-v1';
const MAX_DYNAMIC_CACHE_ITEMS = 50;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico'
  // Icons will be cached dynamically when available
];

// Patterns to cache dynamically
const CACHE_PATTERNS = {
  images: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
  fonts: /\.(woff|woff2|ttf|otf)$/i,
  styles: /\.(css)$/i,
  scripts: /\.(js)$/i,
  api: /\/api\//i,
  igdb: /images\.igdb\.com/i
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Cache static assets, but don't fail install if some are missing
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[Service Worker] Failed to cache ${url}:`, err)
            )
          )
        );
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http protocols
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip Supabase auth and realtime requests (always fresh)
  if (url.hostname.includes('supabase.co') && 
      (url.pathname.includes('/auth/') || url.pathname.includes('/realtime/'))) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          // For API calls, also fetch fresh data in background
          if (CACHE_PATTERNS.api.test(url.pathname)) {
            fetchAndUpdateCache(request);
          }
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Check if this should be cached
            const shouldCache = 
              CACHE_PATTERNS.images.test(url.pathname) ||
              CACHE_PATTERNS.fonts.test(url.pathname) ||
              CACHE_PATTERNS.styles.test(url.pathname) ||
              CACHE_PATTERNS.scripts.test(url.pathname) ||
              CACHE_PATTERNS.igdb.test(url.hostname);

            if (shouldCache) {
              // Clone the response before caching
              const responseToCache = response.clone();
              
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseToCache);
                  // Limit cache size
                  limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
                })
                .catch(err => console.error('[Service Worker] Cache put error:', err));
            }

            return response;
          })
          .catch((error) => {
            // Network failed, try to serve offline page for navigation
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            // For images, return a placeholder if available
            if (CACHE_PATTERNS.images.test(url.pathname)) {
              return caches.match('/images/placeholder.png');
            }

            throw error;
          });
      })
  );
});

// Helper function to fetch and update cache in background
function fetchAndUpdateCache(request) {
  fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        caches.open(DYNAMIC_CACHE)
          .then((cache) => {
            cache.put(request, response.clone());
          });
      }
    })
    .catch(err => console.warn('[Service Worker] Background fetch failed:', err));
}

// Helper function to limit cache size
function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName)
    .then((cache) => {
      cache.keys()
        .then((keys) => {
          if (keys.length > maxItems) {
            // Delete oldest items
            const deleteCount = keys.length - maxItems;
            Promise.all(
              keys.slice(0, deleteCount).map(key => cache.delete(key))
            ).then(() => {
              console.log(`[Service Worker] Cleaned ${deleteCount} items from ${cacheName}`);
            });
          }
        });
    });
}

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting received');
    self.skipWaiting();
  }
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reviews') {
    console.log('[Service Worker] Syncing offline reviews...');
    // Implement offline review sync when online
  }
});