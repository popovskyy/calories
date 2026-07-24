"use client";

import { useEffect } from "react";

/** Registers the service worker once on the client (required for installable PWA). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Silent — PWA install still works on iOS without SW
      }
    };

    void register();
  }, []);

  return null;
}
