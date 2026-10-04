const CACHE_NAME = 'pixmorph-v1';
const RUNTIME_CACHE = 'pixmorph-runtime-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .catch((error) => console.error('Cache install failed:', error))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (!url.origin.includes(self.location.origin)) {
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((response) => {
                        return (
                            response ||
                            new Response(
                                JSON.stringify({ error: 'Offline' }),
                                {
                                    status: 503,
                                    headers: { 'Content-Type': 'application/json' },
                                }
                            )
                        );
                    });
                })
        );
        return;
    }

    event.respondWith(
        caches
            .match(request)
            .then((response) => {
                if (response) {
                    return response;
                }

                return fetch(request).then((response) => {
                    if (
                        !response ||
                        response.status !== 200 ||
                        response.type === 'error'
                    ) {
                        return response;
                    }

                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });

                    return response;
                });
            })
            .catch(() => {
                return caches.match('/index.html');
            })
    );
});
