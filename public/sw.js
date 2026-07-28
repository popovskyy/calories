/* App-shell service worker v3: offline shell + Web Push. */
const CACHE = "calories-shell-v3";
const PRECACHE = ["/", "/manifest.webmanifest", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
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
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/") || caches.match(request)),
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
