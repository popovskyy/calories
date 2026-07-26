"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useMounted } from "@/hooks/useMounted";

/**
 * Перемикач звукових ефектів (тріск вогнища при перерахунку калорій).
 * Налаштування пристроєве, не акаунтне — тому localStorage, а не БД.
 */
export function SoundToggle() {
  const mounted = useMounted();
  const enabled = useAppStore((s) => s.soundEnabled);
  const setEnabled = useAppStore((s) => s.setSoundEnabled);

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      className="mcard flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-accent)]">
        {enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold text-[var(--color-text)]">Звуки</div>
        <div className="text-[13px] text-[var(--color-muted3)]">
          {enabled ? "Тріск вогнища при перерахунку" : "Звукові ефекти вимкнено"}
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
