/* ICYMI service worker — offline app shell + favicon cache */
const VERSION = 'icymi-v2';
const FAV = 'icymi-favicons';
const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'icons.js', 'manifest.webmanifest',
  'vendor/Sortable.min.js', 'vendor/fontawesome/css/all.min.css',
  'vendor/fontawesome/webfonts/fa-solid-900.woff2', 'vendor/fontawesome/webfonts/fa-regular-400.woff2',
  'vendor/fontawesome/webfonts/fa-brands-400.woff2', 'vendor/fontawesome/webfonts/fa-v4compatibility.woff2',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FAV).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Site favicons: cache-first so icons show offline
  if (url.hostname === 'www.google.com' && url.pathname.startsWith('/s2/favicons')) {
    e.respondWith(caches.open(FAV).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }
      catch { return Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // App shell: serve from cache instantly, refresh in background
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});
