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
              "group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-surface p-3.5 text-left transition active:scale-[0.98]",
              m.hover,
            )}
          >
            <div>
              <div className="text-sm font-bold text-white">{m.title}</div>
              <div className="mt-0.5 text-xs text-gray-400">{m.desc}</div>
            </div>
            <span className={cn("font-mono text-xs", m.badgeCls)}>{m.badge}</span>
          </button>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="text-[11px] tracking-wider text-gray-500 uppercase">Додатково (необов’язково)</span>
        <input
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Напр.: болить поперек, без віджимань"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-volt focus:outline-none"
        />
      </label>
    </Sheet>
  );
}
