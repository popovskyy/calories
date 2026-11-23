"use client";

import { useEffect } from "react";

/** Реєструє service worker (лише прод) і прибирає будь-який SW/кеші у dev. */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      // Старий SW (в т.ч. від калькулятора калорій на тому ж origin) не має
      // роздавати закешовану верстку під час розробки.
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      if ("caches" in window) {
        void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        // iOS PWA «воскресає» без навігації — перевіряємо оновлення SW при поверненні на екран
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") void reg.update();
        });
      })
      .catch(() => {
        /* PWA ставиться на iOS і без SW */
      });
  }, []);

  return null;
}
