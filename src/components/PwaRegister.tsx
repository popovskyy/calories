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
    // перезавантажуємось, щоб підхопити свіжі чанки.
    //
    // Рядок нижче колись влаштовував нескінченну петлю перезавантажень (у
    // тесті — 22 за 16 секунд, тобто екран блимає без упину). Механіка: sw.js
    // робить skipWaiting + clients.claim, тому КОЖНА інсталяція одразу кидає
    // controllerchange → reload → сторінка реєструє воркера знову → install →
    // claim → controllerchange → … Тому дві незалежні запобіжки:
    //
    //   • hadController — при першій у житті реєстрації старого JS ще немає,
    //     перезавантажувати нічого (інакше кожен новий відвідувач отримував
    //     reload одразу після першого промальовування);
    //   • позначка часу в sessionStorage — якщо воркер перевстановлюється на
    //     кожному завантаженні (а на iOS це реально трапляється), hadController
    //     уже не рятує: з другої ітерації він завжди true. Дозволяємо не
    //     частіше ніж раз на хвилину на вкладку — справжній деплой так само
    //     підхопиться, а петля розривається на другому кроці.
    const RELOAD_KEY = "calories:sw-reloaded-at";
    const hadController = navigator.serviceWorker.controller !== null;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) return;
      let last = 0;
      try {
        last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
      } catch {
        /* приватний режим — краще не перезавантажувати взагалі, ніж зациклитись */
        return;
      }
      if (Date.now() - last < 60_000) return;
      try {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      } catch {
        return;
      }
      window.location.reload();
    });

    const register = async () => {
      try {
        // Без reg.update(): браузер сам перевіряє скрипт воркера на кожній
        // навігації, а примусова перевірка на кожному завантаженні сторінки
        // раз за разом породжувала нового воркера й живила петлю вище.
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Silent — PWA install still works on iOS without SW
      }
    };

    void register();
  }, []);

  return null;
}
