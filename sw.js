// Invasión sin conexión: el juego (una sola página) y su música se guardan en
// el dispositivo la primera vez, así se puede jugar sin internet. Lo online
// (salas, puntajes globales) va siempre por la red y, sin conexión, falla
// como siempre (el juego ya lo maneja y sigue con lo local).
const CACHE = 'invasion-v1';
const BASICO = ['/', '/index.html', '/manifest.webmanifest', '/iconos/icono-192.png', '/iconos/icono-512.png', '/iconos/icono-180.png'];
const MUSICA = ['/musica/ajustes.mp3', '/musica/centurion.mp3', '/musica/omnidroide.mp3', '/musica/registro.mp3'];

self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(BASICO);
    // la música, sin bloquear la instalación si alguna pista falla
    await Promise.all(MUSICA.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;   // lo online, siempre por la red
  // La página: primero la red (para tener siempre la última versión) y, sin
  // conexión, la guardada. El resto: lo guardado, y se actualiza por detrás.
  if (req.mode === 'navigate'){
    ev.respondWith((async () => {
      try {
        const r = await fetch(req);
        if (r && r.ok){ const c = await caches.open(CACHE); c.put('/index.html', r.clone()); }
        return r;
      } catch (e) {
        return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }
  ev.respondWith((async () => {
    const c = await caches.open(CACHE);
    const guardada = await c.match(req, { ignoreSearch: true });
    const red = fetch(req).then(r => { if (r && r.ok && r.type === 'basic') c.put(req, r.clone()); return r; }).catch(() => null);
    return guardada || (await red) || Response.error();
  })());
});
