// Template: the build fills in VERSION and ASSETS (see vite.config.ts). Same approach as Habit-Quest.
const VERSION = '__VERSION__';
const ASSETS = __ASSETS__;
const PREFIX = 'pareto-lingo-';
const CACHE = `${PREFIX}${VERSION}`;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', ...ASSETS])).then(() => self.skipWaiting()));
});

// Delete only this app's old caches. Other apps on the same site (another repo on the same github.io
// address) share this cache storage, and wiping theirs would break them offline.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Pages: network first so updates land; everything else: cache first (file names are hashed, packs are versioned by build).
// cache: 'no-cache' makes the page fetch ask the server every time, because GitHub Pages lets browsers
// reuse the page for 10 minutes, which kept reloads on the old build after a deploy (found in Habit-Quest).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          // A server error page (a 404 mid-deploy, a 503) must never replace the saved app.
          if (!res.ok) return caches.match('./', { ignoreVary: true }).then((hit) => hit || res);
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./', { ignoreVary: true })),
    );
    return;
  }
  // ignoreVary: servers may send "Vary: Origin", and module scripts carry an Origin header the precache didn't.
  e.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req)));
});
