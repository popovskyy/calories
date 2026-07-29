"use client";

import { useEffect } from "react";

/** Реєструє service worker один раз на клієнті (потрібно для PWA + Web Push). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      // Дев-сервер сам ніколи не реєструє SW (нижче), але якщо на цьому ж origin
      // колись запускали `next build && next start` (напр. щоб перевірити прод-
      // кешування), браузер міг лишити той SW активним і контролюючим сторінку
      // назавжди — і він продовжує тихо роздавати старий закешований HTML/RSC
      // під час звичайної розробки, доки хтось вручну не зайде в DevTools і не
      // натисне Unregister. Це і спричиняло «дані оновились, а на екрані стара
      // версія» — тож просто прибираємо будь-який SW і його кеш при кожному
      // заході в дев-режимі, без ручних дій.
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
      if ("caches" in window) {
        void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
      return;
    }

    // Якщо новий SW бере на себе контроль (після оновлення деплою), стара
    // вкладка все ще виконує JS, завантажений під попередню версію — тож
    // перезавантажуємось один раз, щоб гарантовано підхопити свіжі чанки.
    //
    // hadController — обов'язкова умова: sw.js робить skipWaiting + clients.claim,
    // тож controllerchange кидається і при ПЕРШІЙ у житті реєстрації, коли
    // жодного старого JS немає. Без цієї перевірки кожен новий відвідувач
    // отримував повне перезавантаження одразу після першого промальовування.
    const hadController = navigator.serviceWorker.controller !== null;
    let reloadedForUpdate = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloadedForUpdate) return;
      reloadedForUpdate = true;
      window.location.reload();
    });

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        void reg.update();
      } catch {
        // Silent — PWA install still works on iOS without SW
      }
    };

    void register();
  }, []);

  return null;
}
