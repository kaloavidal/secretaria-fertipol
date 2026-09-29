// Service worker do AduboCalc — deixa o app abrir mesmo sem internet.
// Estratégia: cacheia o "esqueleto" do app (HTML, ícones, manifest, lib do Supabase)
// e usa network-first pra tudo — se a rede falhar, cai pro cache.

const CACHE_NAME = 'adubocalc-cache-v1';
const APP_SHELL = [
  './adubocalc.html',
  './adubocalc-manifest.json',
  './adubocalc-icon-192.png',
  './adubocalc-icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll falha inteiro se um item falhar; adiciona um por um pra não travar o cache todo.
      return Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Falhou ao cachear', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só cuida de GET; chamadas de login/insert/update ao Supabase (POST) sempre vão direto pra rede.
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Guarda uma cópia fresca no cache pra próxima vez que estiver offline.
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./adubocalc.html')))
  );
});
