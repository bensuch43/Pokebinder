/* PokéBinder Studio service worker
   - App shell: network-first and revalidated with GitHub every time (cache:'no-cache'), so a new
     upload shows up on the next launch instead of after GitHub's 10-minute HTTP cache; offline falls back to cache
   - Card images (images.pokemontcg.io): cache-first, capped
   - API calls: always network (the app keeps its own card cache in IndexedDB) */
const VERSION = 'pb-v3.1.0';
const SHELL = ['./', './index.html', './app.js', './vendor.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
const IMG_CACHE = 'pb-img-v1';
const IMG_MAX = 3000;   // ~30–60 MB of small card images

self.addEventListener('install', e => {
  // cache:'reload' so the new version's offline copy is never filled from a stale HTTP cache
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache:'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== IMG_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > IMG_MAX) await Promise.all(keys.slice(0, keys.length - IMG_MAX).map(k => cache.delete(k)));
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'images.pokemontcg.io') {
    e.respondWith(caches.open(IMG_CACHE).then(async cache => {
      const hit = await cache.match(req); if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') { cache.put(req, res.clone()); trim(cache); }
        return res;
      } catch { return new Response('', { status: 504 }); }
    }));
    return;
  }
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req, { cache:'no-cache' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('./index.html')));
  }
});

// lets the page show which offline copy is running (Settings → About this version)
self.addEventListener('message', e => { if (e.data === 'version') e.source?.postMessage({ swVersion:VERSION }); });
