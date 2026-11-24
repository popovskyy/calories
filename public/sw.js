/* Tactical Fit — service worker v1.
 * Задачі: (1) інстальовність PWA, (2) швидкі hashed-ассети, (3) офлайн-заглушка.
 * Дані (API) і сторінки — ЗАВЖДИ з мережі: у плані важливий актуальний прогрес.
 *
 * Нова назва кешу навмисно відрізняється від старого "calories-shell-v4": на цьому ж
 * origin раніше жив калькулятор калорій — activate прибирає всі чужі кеші. */
const CACHE = "trainer-shell-v1";
const PRECACHE = ["/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

const OFFLINE_HTML = `<!doctype html><html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Немає зв’язку</title>
<style>html,body{height:100%;margin:0;background:#0c111c;color:#f3f4f6;font-family:-apple-system,system-ui,sans-serif}
body{display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}
h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#9ca3af;margin:0 0 20px}
button{background:linear-gradient(149deg,#41c6ff,#1a64fc);color:#fff;border:0;border-radius:12px;padding:10px 18px;font-weight:700;font-size:13px}</style></head>
<body><div><h1>Немає зв’язку</h1><p>Тренування й прогрес потребують інтернету.</p>
<button onclick="location.reload()">Спробувати ще</button></div></body></html>`;

/** Хешовані чанки кожного деплою інакше лишались би в кеші назавжди й з'їдали квоту iOS. Найстаріші — першими. */
const MAX_STATIC_ENTRIES = 120;
async function trimCache(cache) {
  const keys = await cache.keys(); // порядок вставки
  const extra = keys.length - MAX_STATIC_ENTRIES;
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // API — лише мережа

  // Навігація: мережа, а при обриві — офлайн-заглушка (не стара розмітка чужої сторінки)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }),
      ),
    );
    return;
  }

  // Імутабельні хешовані ассети Next — cache-first. RSC-запити (без mode:"navigate")
  // сюди не потрапляють і лишаються мережі.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) {
          event.waitUntil(cache.put(request, res.clone()).then(() => trimCache(cache)));
        }
        return res;
      }),
    );
  }
});
