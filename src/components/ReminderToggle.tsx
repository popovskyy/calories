"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

function isIos(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function subscribeNowhere() {
  return () => {};
}

/** Перемикач Web Push нагадувань (о 20:00 Kyiv). */
export function ReminderToggle() {
  const mounted = useSyncExternalStore(subscribeNowhere, () => true, () => false);
  const [enabled, setEnabled] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [busy, setBusy] = useState(false);

  const supported =
    mounted &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
  const iosBlocked = mounted && isIos() && !isStandalone();

  useEffect(() => {
    if (!mounted) return;

    void (async () => {
      try {
        const res = await fetch("/api/push/subscribe", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          publicKey: string | null;
          subscribed: boolean;
          remindersEnabled: boolean;
        };
        if (data.publicKey) setPublicKey(data.publicKey);
        setEnabled(data.subscribed && data.remindersEnabled);

        if (
          supported &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          !data.subscribed &&
          data.publicKey
        ) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              data.publicKey,
            ) as BufferSource,
          });
          const json = sub.toJSON();
          const post = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              endpoint: json.endpoint,
              keys: {
                p256dh: json.keys?.p256dh ?? "",
                auth: json.keys?.auth ?? "",
              },
              userAgent: navigator.userAgent,
            }),
          });
          if (post.ok) setEnabled(true);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [mounted, supported]);

  const toggle = useCallback(async () => {
    if (iosBlocked) {
      toast.message('Додайте застосунок на екран «Додому»');
      return;
    }
    if (!supported) {
      toast.error("Push-сповіщення не підтримуються в цьому браузері");
      return;
    }
    setBusy(true);
    try {
      if (enabled) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        setEnabled(false);
        toast.message("Нагадування вимкнено");
        return;
      }

      // Дозвіл ПЕРШИМ рядком обробника — до будь-якого await (Safari/iOS)
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Дозвольте сповіщення в налаштуваннях браузера");
        return;
      }

      const key = publicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!key) {
        toast.error("VAPID-ключ не налаштовано");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
      const json = sub.toJSON();

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys?.p256dh ?? "",
            auth: json.keys?.auth ?? "",
          },
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        toast.error("Не вдалося зберегти підписку");
        return;
      }

      setEnabled(true);
      toast.success("Push-нагадування увімкнено");
    } finally {
      setBusy(false);
    }
  }, [enabled, supported, iosBlocked, publicKey]);

  if (!mounted) return null;
  if (!supported && !iosBlocked) return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy || iosBlocked}
      className="mcard flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)] disabled:opacity-60"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-accent)]">
        {enabled ? <Bell size={18} /> : <BellOff size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold text-[var(--color-text)]">
          Нагадування о 20:00
        </div>
        <div className="text-[13px] text-[var(--color-muted3)]">
          {iosBlocked
            ? "Додайте застосунок на екран «Додому»"
            : enabled
              ? "Push-сповіщення увімкнено"
              : "Отримувати нагадування записати їжу"}
        </div>
      </div>
      <span
        className={
          enabled
            ? "text-[13px] font-semibold text-[var(--color-green)]"
            : "text-[13px] text-[var(--color-muted3)]"
        }
      >
        {busy ? "…" : enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}
