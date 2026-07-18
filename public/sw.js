// Minimal service worker for installability + offline app shell.
// API responses are never cached — logged data must always be fresh.
// Bump CACHE on shell changes: `activate` purges every older cache, which also
// clears any stale HTML that still points at old /_next chunks (the cause of the
// blank-screen-on-launch bug).
const CACHE = "thali-v4";
const SHELL = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never intercept data or the OAuth callback — always straight to the network.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // App shell / navigations: network-first. Only cache a genuine, non-redirected
  // page as the "/" fallback, so we never serve a stale shell or a cached
  // redirect that boots to a blank screen. Fall back to cache only when the
  // network is truly unavailable.
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok && !res.redirected && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/", copy));
          }
          return res;
        })
        .catch(() => caches.match("/").then((cached) => cached || Response.error())),
    );
    return;
  }

  // Static assets: cache-first (content-hashed /_next files are immutable).
  e.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
