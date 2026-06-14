// Minimal service worker: caches the app shell so Bridge opens instantly and
// works offline-as-shell. Network-first for everything else (live data).
const CACHE = "bridge-relay-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // let Supabase calls go straight to network
  e.respondWith(
    fetch(e.request).then((r) => { const cc = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cc)); return r; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match("./index.html")))
  );
});
