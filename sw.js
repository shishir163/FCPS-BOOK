/* FCPS Book service worker. Change VERSION each time you upload new files. */
const VERSION = 'cloud-1';
const CACHE = 'fcps-book-' + VERSION;
const CORE = [
  './', 'index.html', 'app.js', 'styles.css', 'fonts.css', 'cloud.js', 'cloud.css', 'firebase-config.js', 'manifest.json',
  'vendor/firebase-app-compat.js', 'vendor/firebase-auth-compat.js', 'vendor/firebase-firestore-compat.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  'fonts/fira-sans-latin-700-normal.woff2',
  'fonts/fira-sans-latin-400-normal.woff2',
  'fonts/hind-siliguri-bengali-700-normal.woff2',
  'fonts/hind-siliguri-bengali-400-normal.woff2',
  'fonts/inter-latin-400-normal.woff2',
  'fonts/hind-siliguri-latin-700-normal.woff2',
  'fonts/hind-siliguri-latin-400-normal.woff2',
  'fonts/inter-latin-700-normal.woff2',
  'fonts/lora-latin-700-normal.woff2',
  'fonts/lato-latin-400-normal.woff2',
  'fonts/lato-latin-700-normal.woff2',
  'fonts/lora-latin-400-normal.woff2',
  'fonts/merriweather-latin-400-normal.woff2',
  'fonts/merriweather-latin-700-normal.woff2',
  'fonts/montserrat-latin-400-normal.woff2',
  'fonts/montserrat-latin-700-normal.woff2',
  'fonts/noto-sans-bengali-bengali-400-normal.woff2',
  'fonts/noto-sans-bengali-bengali-700-normal.woff2',
  'fonts/noto-serif-bengali-bengali-400-normal.woff2',
  'fonts/noto-serif-bengali-bengali-700-normal.woff2',
  'fonts/nunito-latin-700-normal.woff2',
  'fonts/nunito-latin-400-normal.woff2',
  'fonts/open-sans-latin-400-normal.woff2',
  'fonts/open-sans-latin-700-normal.woff2',
  'fonts/playfair-display-latin-400-normal.woff2',
  'fonts/playfair-display-latin-700-normal.woff2',
  'fonts/poppins-latin-400-normal.woff2',
  'fonts/poppins-latin-700-normal.woff2',
  'fonts/roboto-latin-400-normal.woff2',
  'fonts/source-serif-4-latin-400-normal.woff2',
  'fonts/roboto-latin-700-normal.woff2',
  'fonts/source-serif-4-latin-700-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fcps-book-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Same-site files only: app files come from the cache first, so the book opens offline.
   Firebase's own network traffic (login, database) is never touched here. */
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
