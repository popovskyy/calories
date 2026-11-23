"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Аналізую твій арсенал…",
  "Враховую спину та суглоби…",
  "Балансую силові, кардіо й мобіліті…",
  "Розписую підходи, темп і паузи…",
  "Звіряю з історією твоїх тренувань…",
  "Майже готово…",
];

/** Повноекранний стан очікування: генерація тижня може тривати 20–60 с. */
export function GeneratingOverlay({ title }: { title: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => Math.min(v + 1, PHRASES.length - 1)), 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 bg-graphite/90 px-8 text-center backdrop-blur-sm"
    >
      <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/10 bg-surface">
        <div className="animate-scan absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-volt to-transparent shadow-[0_0_14px_#A3E635]" />
      </div>
      <div>
        <div className="font-mono text-[11px] tracking-widest text-volt uppercase">{title}</div>
        <div className="mt-2 text-sm text-gray-300">{PHRASES[i]}</div>
        <div className="mt-1 text-[11px] text-gray-500">Це може зайняти до хвилини</div>
      </div>
    </div>
  );
}
