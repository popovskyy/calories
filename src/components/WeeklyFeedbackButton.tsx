"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export type WeeklyFeedbackPhase = "collecting" | "ready" | "pending";
export type WeeklyFeedbackTone = "emerald" | "blue" | "aqua" | "violet";
export type WeeklyFeedbackMotion = "liquid" | "breathe" | "scan" | "spark";

export const WEEKLY_TONES: { id: WeeklyFeedbackTone; label: string; swatch: string }[] = [
  { id: "emerald", label: "Смарагд", swatch: "#3db89a" },
  { id: "blue", label: "Неон-синій", swatch: "#3d8bff" },
  { id: "aqua", label: "Аква", swatch: "#2ec6d4" },
  { id: "violet", label: "Фіолет", swatch: "#8b7cf6" },
];

export const WEEKLY_MOTIONS: { id: WeeklyFeedbackMotion; label: string }[] = [
  { id: "liquid", label: "Liquid" },
  { id: "breathe", label: "Breathe" },
  { id: "scan", label: "Scan" },
  { id: "spark", label: "Spark" },
];

/**
 * Кнопка звіту тижня (дзеркало денного «Дізнатись вердикт»).
 * Прод: emerald; до 15:00 — scan, після — breathe.
 * tone / motion можна перевизначити на /testpage.
 */
export function WeeklyFeedbackButton({
  phase,
  onClick,
  className,
  tone = "emerald",
  motion,
}: {
  phase: WeeklyFeedbackPhase;
  onClick?: () => void;
  className?: string;
  tone?: WeeklyFeedbackTone;
  /** Якщо не задано: collecting → scan, ready/pending → breathe. */
  motion?: WeeklyFeedbackMotion;
}) {
  const collecting = phase === "collecting";
  const pending = phase === "pending";
  const active = phase === "ready";
  const resolvedMotion = motion ?? (collecting ? "scan" : "breathe");

  return (
    <button
      type="button"
      className={cn(
        "weekly-neon-btn",
        `weekly-neon-btn--tone-${tone}`,
        `weekly-neon-btn--motion-${resolvedMotion}`,
        collecting && "weekly-neon-btn--collecting",
        active && "weekly-neon-btn--ready",
        pending && "weekly-neon-btn--pending",
        className,
      )}
      data-sfx={active ? "confirm" : "none"}
      disabled={!active || pending}
      onClick={onClick}
      aria-busy={pending}
    >
      <span className="weekly-neon-btn__fill" aria-hidden />
      <span className="weekly-neon-btn__aurora" aria-hidden />
      <span className="weekly-neon-btn__shine" aria-hidden />
      <span className="weekly-neon-btn__scanline" aria-hidden />
      <span className="weekly-neon-btn__drops" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="weekly-neon-btn__label">
        {pending ? (
          <>
            <RefreshCw size={14} className="animate-spin" /> Готуємо звіт…
          </>
        ) : collecting ? (
          <>
            <Sparkles size={14} className="weekly-neon-btn__icon" />
            Звіт готується…
          </>
        ) : (
          <>
            <Sparkles size={14} className="weekly-neon-btn__icon" />
            Дізнатись вердикт
          </>
        )}
      </span>
    </button>
  );
}
