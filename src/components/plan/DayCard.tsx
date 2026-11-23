"use client";

import { Clock, Flame } from "lucide-react";
import { accentFor, DAY_TYPE_LABEL } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { dayProgress } from "@/lib/plan/format";
import type { AdaptMode, DayDTO } from "@/lib/types";

const MODE_LABEL: Record<AdaptMode, string> = {
  fatigued: "Адаптовано · відновлення",
  short_time: "Адаптовано · експрес",
  full_power: "Адаптовано · повна сила",
};

/** Hero-картка дня: фокус, час, ккал, RPE, прогрес. */
export function DayCard({ day }: { day: DayDTO }) {
  const accent = accentFor(day.type);
  const { done, total, pct } = dayProgress(day);
  const finished = day.workoutCompletedAt !== null || pct === 100;

  return (
    <div className="animate-day-enter rounded-2xl border border-white/[0.08] bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider uppercase",
              accent.bg,
              accent.text,
              accent.border,
            )}
          >
            {DAY_TYPE_LABEL[day.type]}
          </span>
          <h2 className="mt-2 text-base leading-snug font-bold text-white">{day.focus}</h2>
          {day.title && <p className="mt-0.5 text-xs text-gray-400">{day.title}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-xl font-bold text-white tabular-nums">{pct}%</div>
          <div className="font-mono text-[11px] text-gray-400 tabular-nums">
            {done}/{total} вправ
          </div>
        </div>
      </div>

      {day.adaptedMode && (
        <div className="mt-2.5 inline-flex rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] tracking-wide text-gray-300 uppercase">
          {MODE_LABEL[day.adaptedMode]}
        </div>
      )}

      <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-xs">
        <div className="flex items-center gap-1.5 text-gray-300">
          <Clock className="h-3.5 w-3.5 text-gray-500" />
          <span className="font-mono tabular-nums">{day.durationMin} хв</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-300">
          <Flame className="h-3.5 w-3.5 text-ember" />
          <span className="font-mono tabular-nums">~{day.caloriesEst} ккал</span>
        </div>
        <div className="flex items-center justify-end text-gray-400">
          <span className="font-mono text-[11px]">RPE {day.rpe ?? "—"}/10</span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/50"
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", finished ? "bg-mint" : accent.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
