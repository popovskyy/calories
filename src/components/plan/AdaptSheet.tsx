"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { AdaptMode } from "@/lib/types";
import { Sheet } from "@/components/ui/Sheet";

const MODES: { mode: AdaptMode; title: string; desc: string; badge: string; hover: string; badgeCls: string }[] = [
  {
    mode: "full_power",
    title: "Бадьорий / Повна сила",
    desc: "Максимальний робочий обсяг · 45–50 хв",
    badge: "100%",
    hover: "hover:border-volt/50",
    badgeCls: "text-volt",
  },
  {
    mode: "short_time",
    title: "Мало часу (Експрес-режим)",
    desc: "Щільні суперсети без довгих пауз · 25 хв",
    badge: "25 ХВ",
    hover: "hover:border-ember/50",
    badgeCls: "text-ember",
  },
  {
    mode: "fatigued",
    title: "Втомлений / Легке відновлення",
    desc: "Мобіліті, палка, мати, легке кардіо · пульс ~125",
    badge: "LIGHT",
    hover: "hover:border-blush/50",
    badgeCls: "text-blush",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dayLabel: string;
  onPick: (mode: AdaptMode, note: string) => void;
}

export function AdaptSheet({ open, onOpenChange, dayLabel, onPick }: Props) {
  const [note, setNote] = useState("");
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="AI-тренер"
      title={`Адаптувати: ${dayLabel}`}
      description="Обери поточний стан — тренер перебудує підходи, темп і вибір вправ під твій домашній арсенал. Прогрес цього дня скинеться."
    >
      <div className="space-y-2.5">
        {MODES.map((m) => (
          <button
            key={m.mode}
            onClick={() => {
              onPick(m.mode, note);
              setNote("");
            }}
            className={cn(
              "group block w-full rounded-2xl border border-white/10 bg-surface p-4 text-left transition active:scale-[0.98]",
              m.hover,
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-bold text-white">{m.title}</span>
              <span className={cn("shrink-0 text-sm font-semibold whitespace-nowrap", m.badgeCls)}>{m.badge}</span>
            </div>
            <div className="mt-1 text-sm text-gray-300">{m.desc}</div>
          </button>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="text-sm font-medium text-gray-300">Додатково (необов’язково)</span>
        <input
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Напр.: болить поперек, без віджимань"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-base text-white placeholder-gray-500 focus:border-volt focus:outline-none"
        />
      </label>
    </Sheet>
  );
}
