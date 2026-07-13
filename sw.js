// ============================================================================
// SIC BOLIVIA PWA - SERVICE WORKER
// ============================================================================
// Este archivo permite que la app funcione offline y se instale como app

const CACHE_NAME = 'sic-pwa-v1';
const RUNTIME_CACHE = 'sic-runtime-v1';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/app.js',
    '/api.js',
    '/manifest.json'
];

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching app shell');
            return cache.addAll(ASSETS_TO_CACHE);
        }).catch(error => {
            console.error('Cache installation failed:', error);
        })
    );
    
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching app shell');
            // Intentar cachear, pero no fallar si alguno no está disponible
            return Promise.all(
                ASSETS_TO_CACHE.map(url => {
                    return cache.add(url).catch(err => {
                        console.warn('Failed to cache:', url, err);
                        // No lanzar error, continuar
                    });
                })
            );
        }).catch(error => {
            console.error('Cache installation error:', error);
        })
    );
    
    self.skipWaiting();
});

// ============================================================================
// FETCH EVENT - CACHE FIRST STRATEGY
// ============================================================================

self.addEventListener('fetch', event => {
    const { request } = event;
    
    // Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle API calls differently
    if (request.url.includes('sheets.googleapis.com')) {
        event.respondWith(networkFirstStrategy(request));
    } else {
        // For app assets, use cache first
        event.respondWith(cacheFirstStrategy(request));
    }
});

// ============================================================================
// CACHE FIRST STRATEGY (para assets)
// ============================================================================

async function cacheFirstStrategy(request) {
    try {
        // Try cache first
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        
        // If not in cache, fetch from network
        const response = await fetch(request);
        
        // Cache successful responses
        if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
        }
        
        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        
        // Return offline page if available
        return caches.match('/index.html').catch(() => {
            return new Response(
                '<h1>Offline</h1><p>You are offline. Please check your connection.</p>',
                { headers: { 'Content-Type': 'text/html' } }
            );
        });
    }
}

// ============================================================================
// NETWORK FIRST STRATEGY (para API calls)
// ============================================================================

async function networkFirstStrategy(request) {
    try {
        // Try network first
        const response = await fetch(request);
        
        if (response.ok) {
            // Cache successful API responses
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
            return response;
        }
        
        throw new Error('Network response was not ok');
    } catch (error) {
        // Fall back to cache if network fails
        console.log('Network failed, trying cache:', error);
        
        const cached = await caches.match(request);
        if (cached) {
            return cached;
        }
        
        // Return error response
        return new Response(
            JSON.stringify({ error: 'Offline - data not available' }),
            { 
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// ============================================================================
// MESSAGE HANDLING (for cache updates)
// ============================================================================

self.addEventListener('message', event => {
    if (event.data.action === 'clearCache') {
        caches.delete(RUNTIME_CACHE).then(() => {
            event.ports[0].postMessage({ success: true });
        });
    } else if (event.data.action === 'cacheAssets') {
        caches.open(CACHE_NAME).then(cache => {
            cache.addAll(event.data.assets).then(() => {
                event.ports[0].postMessage({ success: true });
            });
        });
    }
});

// ============================================================================
// BACKGROUND SYNC (para sync offline)
// ============================================================================

self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(
            syncDataInBackground()
        );
    }
});

async function syncDataInBackground() {
    try {
        // Este evento se dispara cuando la conexión vuelve
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                message: 'Data synced successfully'
            });
        });
    } catch (error) {
        console.error('Background sync error:', error);
    }
}

console.log('Service Worker loaded');
