/* FCPS Book service worker: caches everything so the app works offline.
   When you upload a new version to GitHub, change VERSION so phones and laptops pick it up. */
const VERSION = 'fcps-book-phase2b-v1';
const CORE = [
  "./",
  "index.html",
  "styles.css",
  "fonts.css",
  "app.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "fonts/fira-sans-latin-400-normal.woff2",
  "fonts/fira-sans-latin-700-normal.woff2",
  "fonts/hind-siliguri-bengali-400-normal.woff2",
  "fonts/hind-siliguri-bengali-700-normal.woff2",
  "fonts/hind-siliguri-latin-400-normal.woff2",
  "fonts/hind-siliguri-latin-700-normal.woff2",
  "fonts/inter-latin-400-normal.woff2",
  "fonts/inter-latin-700-normal.woff2",
  "fonts/lato-latin-400-normal.woff2",
  "fonts/lato-latin-700-normal.woff2",
  "fonts/lora-latin-400-normal.woff2",
  "fonts/lora-latin-700-normal.woff2",
  "fonts/merriweather-latin-400-normal.woff2",
  "fonts/merriweather-latin-700-normal.woff2",
  "fonts/montserrat-latin-400-normal.woff2",
  "fonts/montserrat-latin-700-normal.woff2",
  "fonts/noto-sans-bengali-bengali-400-normal.woff2",
  "fonts/noto-sans-bengali-bengali-700-normal.woff2",
  "fonts/noto-serif-bengali-bengali-400-normal.woff2",
  "fonts/noto-serif-bengali-bengali-700-normal.woff2",
  "fonts/nunito-latin-400-normal.woff2",
  "fonts/nunito-latin-700-normal.woff2",
  "fonts/open-sans-latin-400-normal.woff2",
  "fonts/open-sans-latin-700-normal.woff2",
  "fonts/playfair-display-latin-400-normal.woff2",
  "fonts/playfair-display-latin-700-normal.woff2",
  "fonts/poppins-latin-400-normal.woff2",
  "fonts/poppins-latin-700-normal.woff2",
  "fonts/roboto-latin-400-normal.woff2",
  "fonts/roboto-latin-700-normal.woff2",
  "fonts/source-serif-4-latin-400-normal.woff2",
  "fonts/source-serif-4-latin-700-normal.woff2"
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
/* Serve from cache first (fast, offline), refresh the cache in the background. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
