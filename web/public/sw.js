/**
 * public/sw.js
 *
 * Minimal but real service worker. Two jobs:
 * 1. Make the app installable (a service worker with a fetch handler is
 *    one of Chrome/Edge's hard requirements for the install prompt to fire).
 * 2. Cache the app shell so the UI itself loads offline — this is separate
 *    from the offlineQueue.ts POS sync, which handles data, not the UI.
 *
 * Strategy: cache-first for the app shell (HTML/CSS/JS/icons), network-first
 * for everything under /api/ — you never want a cached API response served
 * as if it were live pharmacy data.
 */

const CACHE_NAME = 'pharmpro-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls — POS/prescriptions/inventory data must always be live.
  // The offline queue (offlineQueue.ts) is the correct place for offline data,
  // not the service worker cache.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', message: 'No connection — request queued if applicable.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    return;
  }

  // App shell: cache-first, falling back to network, then updating the cache.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html')); // SPA fallback when fully offline
    }),
  );
});
