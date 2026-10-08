const CACHE_NAME = "stitchflow-public-v2";
const SHELL = ["/offline.html", "/icons/stitchflow-192.png", "/icons/stitchflow-512.png", "/icons/stitchflow-maskable-512.png", "/icons/stitchflow-180.png", "/stitchflow-icon.svg"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))));
self.addEventListener("message", event => { if (event.data?.type === "ACTIVATE_UPDATE") self.skipWaiting(); });
self.addEventListener("activate", event => event.waitUntil((async () => {
 for (const key of await caches.keys()) if (key.startsWith("stitchflow-") && key !== CACHE_NAME) await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener("fetch", event => {
 const request = event.request;
 const url = new URL(request.url);
 if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
 // Never store authenticated HTML, order records, uploads or React server data.
 if (request.mode === "navigate") {
  event.respondWith(fetch(request).catch(async () => (await caches.match("/offline.html")) || new Response("You are offline. Reconnect to view your orders.", { status: 503, headers: { "Content-Type": "text/plain" } })));
  return;
 }
 if (!url.pathname.startsWith("/_next/static/") && !SHELL.includes(url.pathname)) return;
 event.respondWith((async () => {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
   const cache = await caches.open(CACHE_NAME);
   await cache.put(request, response.clone());
  }
  return response;
 })());
});
