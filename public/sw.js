// Subuzz Service Worker
const CACHE_NAME = 'subuzz-v1';
const STATIC_ASSETS = [
    '/',
    '/chat',
    '/login',
    '/icons/icon-192.svg',
    '/icons/icon-512.svg',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Fetch: network-first strategy for pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip socket.io and API requests
    if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/api')) {
        return;
    }

    // For navigation requests: try network first, fall back to cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache the latest version
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // For other requests: cache-first
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                // Cache successful GET responses
                if (event.request.method === 'GET' && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});

// Handle push notifications (for future web-push integration)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Subuzz';
    const options = {
        body: data.body || 'You have a new message',
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        tag: data.tag || 'default',
        data: { url: data.url || '/chat' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/chat';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            // Focus existing tab if open
            for (const client of clients) {
                if (client.url.includes('/chat') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open new tab
            return self.clients.openWindow(url);
        })
    );
});
