"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";
import {
  getSettings,
  setSound,
  setVfx,
  subscribeSettings,
} from "@/lib/settings";

function subscribeNowhere() {
  return () => {};
}

/**
 * Перемикачі звуку й ефектів для профілю. Обидва зберігаються в
 * localStorage і читаються напряму з sfx.ts / GlobalClickFx — без
 * серверного стану, миттєво і без мигання при переході між сторінками.
 */
export function SoundSettingsCard() {
  const mounted = useSyncExternalStore(
    subscribeNowhere,
    () => true,
    () => false,
  );
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettings,
    getSettings,
  );

  if (!mounted) return null;

  return (
    <div className="mcard flex flex-col divide-y divide-[var(--color-divider)]">
      <button
        type="button"
        onClick={() => setSound(!settings.sound)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-accent)]">
          {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold text-[var(--color-text)]">
            Звукові ефекти
          </div>
          <div className="text-[13px] text-[var(--color-muted3)]">
            Кліки, фінішери, ритуали тем
          </div>
        </div>
        <span
          className={
            settings.sound
              ? "text-[13px] font-semibold text-[var(--color-green)]"
              : "text-[13px] text-[var(--color-muted3)]"
          }
        >
          {settings.sound ? "ON" : "OFF"}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setVfx(!settings.vfx)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
      >
        <div
          className={
            settings.vfx
              ? "flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-accent)]"
              : "flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-muted3)]"
          }
        >
          <Sparkles size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold text-[var(--color-text)]">
            Візуальні ефекти
          </div>
          <div className="text-[13px] text-[var(--color-muted3)]">
            Іскри й спалахи на кожному тапі
          </div>
        </div>
        <span
          className={
            settings.vfx
              ? "text-[13px] font-semibold text-[var(--color-green)]"
              : "text-[13px] text-[var(--color-muted3)]"
          }
        >
          {settings.vfx ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}
