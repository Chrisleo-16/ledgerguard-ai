/* LedgerGuard AI service worker: caches the app shell only. API responses (any other origin, or /api/) are never cached. */
const CACHE = "lg-shell-v1";
const SHELL = ["/", "/app", "/disputes", "/ledger", "/how-it-works", "/login", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return; // network only
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) { // immutable assets: cache first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; })));
    return;
  }
  if (req.mode === "navigate") { // pages: network first, shell fallback offline
    e.respondWith(fetch(req).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; })
      .catch(() => caches.match(req).then(hit => hit || caches.match("/app"))));
  }
});
