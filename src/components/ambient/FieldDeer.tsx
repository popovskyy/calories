"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Deer, type DeerGait } from "@/components/ambient/Deer";

/** Вікна ходи в циклі deerWalk (34s) — синхрон із keyframes у globals.css */
const CYCLE_MS = 34_000;
const WALK_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [0.03, 0.12],
  [0.18, 0.28],
];

/** Межі вікон ходи в частках циклу, за зростанням: 0.03, 0.12, 0.18, 0.28. */
const GAIT_EDGES = WALK_WINDOWS.flat().sort((a, b) => a - b);

function isWalking(phase: number): boolean {
  return WALK_WINDOWS.some(([a, b]) => phase >= a && phase < b);
}

/** Скільки мс до наступної зміни ходи від поточної фази циклу. */
function msToNextEdge(phase: number): number {
  const next = GAIT_EDGES.find((e) => e > phase) ?? GAIT_EDGES[0]! + 1;
  return Math.max(16, (next - phase) * CYCLE_MS);
}

/**
 * Фоновий олень: ноги крутяться лише коли він реально йде,
 * на паузі посеред екрану — idle (нюхає / дивиться).
 *
 * Хода перемикається таймером на межах вікон, а не rAF-циклом: сам стан
 * змінюється 4 рази за 34 с, тож будити головний потік 60 разів на секунду
 * заради того самого булевого значення — марно палити батарею. Компонент
 * живе в AmbientLayer, тобто на кожному екрані застосунку.
 */
export function FieldDeer() {
  const reduce = useReducedMotion();
  const [gait, setGait] = useState<DeerGait>("idle");

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let timer = 0;
    const tick = () => {
      const phase = ((performance.now() - start) % CYCLE_MS) / CYCLE_MS;
      setGait(isWalking(phase) ? "walk" : "idle");
      timer = window.setTimeout(tick, msToNextEdge(phase));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [reduce]);

  if (reduce) return null;

  return (
    <div
      className="ambient-mob absolute bottom-24 left-0 flex items-end"
      style={{ animation: "deerWalk 34s linear infinite" }}
    >
      <Deer variant="field" width={96} height={136} gait={gait} />
    </div>
  );
}
