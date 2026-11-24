"use client";

import { Check } from "lucide-react";
import { WEEKDAY_SHORT } from "@/lib/dates";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { dayStatus } from "@/lib/plan/format";
import type { DayDTO } from "@/lib/types";
import { TypeIcon } from "@/components/TypeIcon";

interface Props {
  days: DayDTO[];
  selected: number;
  today: string;
  onSelect: (weekday: number) => void;
}

/** Горизонтальний Пн–Пт: ковзна «пігулка» + індикатор статусу (заплановано / в процесі / виконано). */
export function DaySelector({ days, selected, today, onSelect }: Props) {
  return (
    <div role="tablist" aria-label="Дні тижня" className="relative grid grid-cols-5 rounded-2xl border border-white/[0.07] bg-surface p-1">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(20%-3.2px)] rounded-xl border border-white/10 bg-surface-2 shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${selected * 100}%)` }}
      />
      {WEEKDAY_SHORT.map((label, i) => {
        const day = days.find((d) => d.weekday === i);
        const status = day ? dayStatus(day) : "planned";
        const accent = accentFor(day?.type ?? "strength");
        const isToday = day?.date === today;
        const active = i === selected;
        return (
          <button
            key={label}
            role="tab"
            aria-selected={active}
            aria-label={`${label}${isToday ? " (сьогодні)" : ""}: ${status === "done" ? "виконано" : status === "in_progress" ? "в процесі" : "заплановано"}`}
            onClick={() => onSelect(i)}
            className={cn(
              "relative z-10 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
              active ? "text-white" : "text-gray-400",
            )}
          >
            <span className="text-base font-bold">{label}</span>
            <span className={cn("text-xs tabular-nums", isToday ? "text-volt" : "text-gray-500")}>
              {day ? Number(day.date.slice(8)) : "·"}
            </span>
            {status === "done" ? (
              <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-mint shadow-[0_0_8px_#4CE892]">
                <Check className="h-2 w-2 text-black" strokeWidth={4} />
              </span>
            ) : (
              // Тип дня — іконкою (гиря / пульс / людина / шари); «в процесі» — золотий колір замість акценту типу
              <TypeIcon
                type={day?.type ?? "strength"}
                className={cn("h-4 w-4", status === "in_progress" ? "text-gold" : accent.text, active ? "opacity-100" : "opacity-50")}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
