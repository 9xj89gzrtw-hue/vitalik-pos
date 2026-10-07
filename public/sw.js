/* ВИТАЛИК — service worker (PWA).
   Стратегия: оболочка — network-first (актуальность в dev),
   статические ассеты манифеста/иконок — cache-first. */
const CACHE = 'vitalik-v1'
const PRECACHE = ['/manifest.json', '/icon-512.png', '/icon-maskable-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {}),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  // не перехватываем dev/hmr и realtime-запросы к gateway
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/__next')) return
  if (url.search.includes('XTransformPort') || url.search.includes('EIO')) return
  if (!PRECACHE.includes(url.pathname)) return

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((resp) => {
          const copy = resp.clone()
          caches.open(CACHE).then((cache) => cache.put(req, copy))
          return resp
        }),
    ),
  )
})
