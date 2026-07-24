"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "calories-reminder-enabled";
const HOUR = 20;
const LAST_SHOWN_KEY = "calories-reminder-last";

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function msUntilNextHour(hour: number) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function fireReminder() {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  const today = ymdLocal();
  if (localStorage.getItem(LAST_SHOWN_KEY) === today) return;
  localStorage.setItem(LAST_SHOWN_KEY, today);
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) {
      await reg.showNotification("Калорії", {
        body: "Не забудь записати їжу за сьогодні",
        icon: "/icons/icon-192.png",
        tag: "calories-evening",
      });
    } else {
      new Notification("Калорії", {
        body: "Не забудь записати їжу за сьогодні",
        icon: "/icons/icon-192.png",
        tag: "calories-evening",
      });
    }
  } catch {
    /* ignore */
  }
}

/** Планує локальне нагадування о 20:00 (поки апка/PWA відкрита). */
export function ReminderScheduler() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) !== "1") return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const now = new Date();
    if (now.getHours() >= HOUR) {
      void fireReminder();
    }

    const delay = msUntilNextHour(HOUR);
    const id = window.setTimeout(() => {
      void fireReminder();
    }, delay);

    return () => window.clearTimeout(id);
  }, []);

  return null;
}

export function ReminderToggle() {
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof Notification !== "undefined");
    setEnabled(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const toggle = useCallback(async () => {
    if (!supported) {
      toast.error("Сповіщення не підтримуються в цьому браузері");
      return;
    }

    if (enabled) {
      localStorage.setItem(STORAGE_KEY, "0");
      setEnabled(false);
      toast.message("Нагадування вимкнено");
      return;
    }

    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    if (perm !== "granted") {
      toast.error("Дозвольте сповіщення в налаштуваннях браузера");
      return;
    }

    localStorage.setItem(STORAGE_KEY, "1");
    setEnabled(true);
    toast.success(`Нагадування о ${HOUR}:00 увімкнено`);
  }, [enabled, supported]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      className="mcard flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-accent)]">
        {enabled ? <Bell size={18} /> : <BellOff size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold text-[var(--color-text)]">
          Нагадування о {HOUR}:00
        </div>
        <div className="text-[13px] text-[var(--color-muted3)]">
          {enabled
            ? "Увімкнено · працює, коли апка відкрита"
            : "Локальне сповіщення записати їжу"}
        </div>
      </div>
      <span
        className={
          enabled
            ? "text-[13px] font-semibold text-[var(--color-green)]"
            : "text-[13px] text-[var(--color-muted3)]"
        }
      >
        {enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}
