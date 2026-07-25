"use client";

import { useEffect } from "react";

/** Реєструє service worker один раз на клієнті (потрібно для PWA + Web Push). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        reg.update();
      } catch {
        // Silent — PWA install still works on iOS without SW
      }
    };

    void register();
  }, []);

  return null;
}
