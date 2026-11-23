"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Zap } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/cn";

const SHOW_MS = 4600;
const EXIT_MS = 340;
/** Картка виростає прямо під пальцем, що ще тримає кнопку: «хвіст»-клік після відпускання не має її закрити. */
const TAP_GUARD_MS = 900;
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт"];

interface Props {
  focus: string;
  doneCount: number;
  totalCount: number;
  kcal: number;
  /** Які дні тижня закриті (Пн–Пт), разом із щойно закритим. */
  weekFlags: boolean[];
  /** Індекс щойно закритого дня (0–4) — його смужка найяскравіша. */
  closedIndex: number;
  /** Центр кнопки завершення й відстань до найдальшого кута — звідси розходиться хвиля. */
  origin: { x: number; y: number; reach: number } | null;
}

/**
 * Момент «день закрито». Без конфеті й гігантських написів: хвиля розходиться від самої кнопки
 * (рух має джерело), а підсумок «матеріалізується» скляною карткою з реальними цифрами й прогресом
 * тижня. Монтується з новим `key` при кожному завершенні; сам зникає, тап — закрити раніше.
 * Вихід іде тим самим шляхом, що й вхід. Рендериться порталом у #app-frame.
 */
export function DayClosed({ focus, doneCount, totalCount, kcal, weekFlags, closedIndex, origin }: Props) {
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const mountedAt = useRef(0);

  useEffect(() => {
    mountedAt.current = performance.now();
    setFrame(document.getElementById("app-frame"));
    const t = setTimeout(() => setPhase("out"), SHOW_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), EXIT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const doneShown = useCountUp(doneCount, 800);
  const kcalShown = useCountUp(kcal, 1000);
  const weekDone = weekFlags.filter(Boolean).length;

  if (!frame || phase === "gone") return null;

  return createPortal(
    <div className="day-closed absolute inset-0 z-[60] overflow-hidden" data-phase={phase} onClick={() => {
        if (performance.now() - mountedAt.current < TAP_GUARD_MS) return;
        setPhase((p) => (p === "in" ? "out" : p));
      }}>
      <div className="dc-scrim absolute inset-0 bg-graphite/55 backdrop-blur-[3px]" />

      {origin &&
        [0, 1].map((i) => (
          <span
            key={i}
            aria-hidden
            className="dc-ring"
            style={{ left: origin.x, top: origin.y, width: origin.reach * 2, height: origin.reach * 2, animationDelay: `${i * 150}ms` }}
          />
        ))}

      <section
        role="status"
        aria-live="polite"
        className="dc-card absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] overflow-hidden rounded-[28px] border border-white/10 border-t-white/25 bg-surface-2/75 p-5 shadow-[0_40px_90px_-24px_rgba(43,144,254,0.55)] backdrop-blur-2xl"
      >
        <div className="flex items-center gap-3.5">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(149deg,#41c6ff,#1a64fc)] shadow-[0_8px_24px_-6px_rgba(43,144,254,0.8)]">
            <Zap className="h-6 w-6 text-white" strokeWidth={2.4} fill="currentColor" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[30px] leading-none font-semibold text-white">День закрито</h2>
            <p className="mt-1.5 truncate text-xs text-gray-400">{focus}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-y border-white/[0.08] py-4">
          <div>
            <div className="font-display text-[40px] leading-none font-semibold text-white tabular-nums">
              {doneShown}
              <span className="text-2xl text-gray-500">/{totalCount}</span>
            </div>
            <div className="mt-1.5 text-[11px] tracking-[0.02em] text-gray-400">вправ виконано</div>
          </div>
          <div>
            <div className="font-display text-[40px] leading-none font-semibold text-white tabular-nums">
              {kcalShown}
            </div>
            <div className="mt-1.5 text-[11px] tracking-[0.02em] text-gray-400">ккал (оцінка)</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-[11px] tracking-[0.02em] text-gray-400">
            <span>Тиждень</span>
            <span className="tabular-nums text-gray-300">{weekDone} з 5 днів</span>
          </div>
          <div className="mt-2.5 grid grid-cols-5 gap-1.5">
            {weekFlags.map((on, i) => (
              <div key={i} className="text-center">
                <span
                  className={cn("dc-pip block h-1.5 rounded-full", !on && "bg-white/10")}
                  data-on={on}
                  data-new={i === closedIndex}
                  style={{ animationDelay: `${500 + i * 90}ms` }}
                />
                <span className={cn("mt-1.5 block text-[10px]", i === closedIndex ? "text-gold" : "text-gray-500")}>{WEEKDAYS[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>,
    frame,
  );
}
