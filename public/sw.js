/* App-shell service worker v4: offline shell + Web Push. */
const CACHE = "calories-shell-v4";
// Тільки завжди-публічна статика. "/" звідси прибрано свідомо: корінь за
// логіном, і в гостя (або з протухлою сесією) fetch прозоро йде за 307 на
// /login — тобто в кеш під ключем "/" лягала розмітка ЕКРАНА ВХОДУ. Потім,
// уже залогінений, користувач ловив мережевий збій, отримував з фолбека цю
// оболонку й бачив розсипану верстку. Оболонку кореня наповнює навігаційний
// хендлер нижче — з реальної успішної відповіді на "/".
const PRECACHE = ["/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Не addAll: він відхиляється цілком, якщо впав бодай один із запитів, і
      // тоді воркер не інсталюється взагалі. Прогрів кеша не вартий того, щоб
      // через один 404 лишитись без офлайну.
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API / auth — always network
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Оболонку кладемо в кеш ЛИШЕ з кореня і лише при успішній відповіді.
          // Раніше під ключем "/" опинялась розмітка будь-якого маршруту, який
          // відкривали останнім (/log, /profile, …) — і офлайн-фолбек віддавав
          // чужу сторінку під адресою "/". React отримував розмітку не того
          // екрана й гідрував її поверх дерева головної: звідси «на мобілі
          // верстка ломається, а в браузері все норм» — на телефоні мережа
          // рветься частіше, тож у фолбек влітали регулярно.
          if (res.ok && url.pathname === "/") {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE).then((c) => c.put("/", copy)));
          }
          return res;
        })
        .catch(async () => {
          // caches.match() повертає проміс, а проміс завжди truthy — тож старий
          // `caches.match("/") || caches.match(request)` ніколи не доходив до
          // другої гілки, а на порожньому кеші віддавав undefined у
          // respondWith(), і замість офлайн-оболонки був екран помилки мережі.
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            Response.error()
          );
        }),
    );
    return;
  }

  // Все, що не є очевидно статичним асетом (JS/CSS чанки, іконки), лишаємо
  // мережі як є — без event.respondWith(). Це критично для App Router: Next
  // тягне RSC-пейлоади й дані клієнтських переходів звичайним GET на ті самі
  // URL, БЕЗ mode:"navigate". Якщо піймати такий запит у cache-first нижче,
  // Cache API може віддати старий закешований HTML-документ замість свіжого
  // RSC-стріму (Cache.match звіряє в основному по URL, а не по заголовках
  // запиту) — саме так компонент міг "зникати": React отримував протухлі дані.
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.svg";
  if (!isStaticAsset) return;

  // Статичні асети: cache-first (безпечно — ці URL завжди контентно-хешовані
  // або міняються разом з версією SW).
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});

/* ---- Web Push ---- */
self.addEventListener("push", (event) => {
  let data = { title: "Калорії", body: "", url: "/", tag: "calories-push" };
  try {
    if (event.data) Object.assign(data, event.data.json());
  } catch { /* ignore */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/favicon-32.png",
      tag: data.tag || "calories-push",
      renotify: true,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
