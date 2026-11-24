// Broman OS service worker. build.mjs fills in CACHE (a name that changes whenever any file changes) and FILES (every file of this build).
// Install stores them all; the page then opens with no network. Only this build's own files are answered here: another host and /api/ go straight to the network.
const CACHE = 'broman-os-trial-0.1.0-89c178ce44';
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./plugins/dashboard/data.js",
  "./plugins/dashboard/screen.js",
  "./plugins/dashboard/styles.css",
  "./plugins/decisions/data.js",
  "./plugins/decisions/screen.js",
  "./plugins/decisions/styles.css",
  "./plugins/guided/ask.js",
  "./plugins/guided/crew.js",
  "./plugins/guided/data.js",
  "./plugins/guided/deeper.js",
  "./plugins/guided/run.js",
  "./plugins/guided/start.js",
  "./plugins/guided/styles.css",
  "./plugins/inbox/data.js",
  "./plugins/inbox/screen.js",
  "./plugins/inbox/styles.css",
  "./plugins/second-brain/data.js",
  "./plugins/second-brain/screen.js",
  "./plugins/second-brain/styles.css",
  "./plugins/usage/data.js",
  "./plugins/usage/screen.js",
  "./plugins/usage/styles.css",
  "./plugins/workflow/data.js",
  "./plugins/workflow/screen.js",
  "./plugins/workflow/styles.css",
  "./shell/pwa/icon-192.png",
  "./shell/pwa/icon-512.png",
  "./shell/pwa/icon-maskable-512.png",
  "./shell/shell.css",
  "./shell/shell.js",
  "./shell/tokens.css"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// an older version's cache is deleted as soon as this one takes over
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((names) => Promise.all(names.filter((n) => n.startsWith('broman-os-') && n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
