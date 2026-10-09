// Generated offline library. Run tools/build-offline.mjs after public assets change.
'use strict';
const BASE = new URL('./', self.location.href);
const PREFIX = 'kotoba-library-' + BASE.pathname + ':';
const CACHE = PREFIX + "c1ffd1de55ce13e7";
const ASSETS = ["404.html","index.html","web/app.js","web/audio.css","web/audio.js","web/celebrations.css","web/celebrations.js","web/content.js","web/customize.js","web/dashboard.css","web/dashboard.js","web/design.css","web/dropdowns.css","web/dropdowns.js","web/effects.css","web/engine.js","web/flashcards.css","web/flashcards.js","web/glossary-ui.js","web/glossary.css","web/glossary.js","web/learnlab-model.js","web/learnlab.css","web/learnlab.js","web/local-data.css","web/local-data.js","web/mascot.svg","web/motivation-engine.js","web/motivation.css","web/motivation.js","web/offline.js","web/path-recall.css","web/path-recall.js","web/path.js","web/preference-model.js","web/preferences.css","web/preferences.js","web/quiz.js","web/references.css","web/references.js","web/repository.js","web/sessions.js","web/sm2.js","web/sounds.js","web/speech-input.css","web/speech-input.js","web/srs.css","web/srs.js","web/storage.js","web/study.js","web/styles.css","web/ui.js","web/widgets.css","web/widgets.js"].map(file => new URL(file, BASE).href);
const ALLOWED = new Set(ASSETS);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  url.hash = ''; url.search = '';
  const home = url.pathname === BASE.pathname || url.pathname === BASE.pathname + 'index.html';
  const canonical = home ? new URL('index.html', BASE).href : url.href;
  if (!ALLOWED.has(canonical)) return; // Never cache APIs, private requests or arbitrary remote files.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(canonical);
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch { return new Response('This study asset is not available offline yet.', {status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}}); }
  })());
});
