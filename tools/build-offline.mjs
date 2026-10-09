import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = ['index.html', '404.html', ...(await readdir(join(root, 'web'))).filter(name => /\.(?:js|css|svg|png|webp|mp3|ogg|wav)$/.test(name)).map(name => 'web/' + name)].sort();
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(await readFile(join(root, file)));
const version = hash.digest('hex').slice(0, 16);
const source = `// Generated offline library. Run tools/build-offline.mjs after public assets change.
'use strict';
const BASE = new URL('./', self.location.href);
const PREFIX = 'kotoba-library-' + BASE.pathname + ':';
const CACHE = PREFIX + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(files)}.map(file => new URL(file, BASE).href);
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
`;
new Function(source);
await writeFile(join(root, 'sw.js'), source);
console.log(`Built offline library ${version}: ${files.length} relative public assets.`);
