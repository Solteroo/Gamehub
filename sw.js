/* GameHub Pro — Service Worker
 * Strategy:
 *   - HTML: network-first with offline fallback
 *   - JS/CSS/manifest: stale-while-revalidate
 *   - Images & fonts: cache-first
 */
const VERSION = 'gamehub-v1.1.0';
const CORE_CACHE   = `core-${VERSION}`;
const ASSET_CACHE  = `assets-${VERSION}`;
const IMAGE_CACHE  = `images-${VERSION}`;
const FONT_CACHE   = `fonts-${VERSION}`;

const CORE_ASSETS = [
  './',
  'index.html',
  'offline.html',
  '404.html',
  'manifest.json',
  'favicon.svg',
  'assets/css/style.css',
  'assets/js/app.js',
  'assets/js/games.js',
  'assets/js/i18n.js',
  'assets/icons/favicon.svg'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CORE_CACHE).then(c => Promise.all(
      CORE_ASSETS.map(a => c.add(a).catch(() => null))
    ))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![CORE_CACHE, ASSET_CACHE, IMAGE_CACHE, FONT_CACHE].includes(k))
          .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;

  const url = new URL(req.url);
  const isExternal = url.origin !== location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com/.test(url.host);
  const isCDNCss = /cdnjs\.cloudflare\.com/.test(url.host);

  // ===== HTML / navigation: network-first → cache → offline.html =====
  if(req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')){
    e.respondWith(
      fetch(req).then(res => {
        if(res.ok){
          const copy = res.clone();
          caches.open(CORE_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() =>
        caches.match(req).then(m => m || caches.match('offline.html') || caches.match('index.html'))
      )
    );
    return;
  }

  // ===== Fonts (Google Fonts + cdnjs) — cache first =====
  if(isFont || isCDNCss){
    e.respondWith(
      caches.match(req).then(cached => cached ||
        fetch(req).then(res => {
          if(res.ok){
            const copy = res.clone();
            caches.open(FONT_CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => cached)
      )
    );
    return;
  }

  // ===== Images — cache first =====
  if(req.destination === 'image' ||
     /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)){
    e.respondWith(
      caches.match(req).then(cached => cached ||
        fetch(req).then(res => {
          if(res.ok){
            const copy = res.clone();
            caches.open(IMAGE_CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => cached || caches.match('assets/icons/favicon.svg'))
      )
    );
    return;
  }

  // ===== CSS/JS/JSON — stale-while-revalidate =====
  if(/\.(css|js|json)$/i.test(url.pathname)){
    e.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          if(res.ok){
            const copy = res.clone();
            caches.open(ASSET_CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
