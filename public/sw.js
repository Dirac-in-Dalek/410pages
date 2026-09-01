const CACHE_NAME = 'citation-graph-mobile-v2';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shellResponse = await fetch('/');
    if (!shellResponse.ok) throw new Error('Unable to cache the app shell');

    const html = await shellResponse.clone().text();
    const assetPaths = [...new Set(
      [...html.matchAll(/(?:src|href)="(\/[^"#?]+)[^\"]*"/g)].map((match) => match[1])
    )];
    const assets = await Promise.all(assetPaths.map(async (path) => {
      const response = await fetch(path);
      if (response.status !== 200) throw new Error(`Unable to cache ${path}`);
      return [path, response];
    }));

    await Promise.all(assets.map(([path, response]) => cache.put(path, response)));
    await cache.put('/', shellResponse);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.status === 200) {
          try {
            await cache.put(request, networkResponse.clone());
          } catch {
            // A full cache must not turn a successful online request into a failure.
          }
        }
        return networkResponse;
      } catch (err) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        if (request.mode === 'navigate') {
          const cachedShell = await cache.match('/');
          if (cachedShell) return cachedShell;
        }
        throw err;
      }
    })
  );
});
