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

/**
 * Фоновий олень: ноги крутяться лише коли він реально йде,
 * на паузі посеред екрану — idle (нюхає / дивиться).
 */
export function FieldDeer() {
  const reduce = useReducedMotion();
  const [gait, setGait] = useState<DeerGait>("idle");

  useEffect(() => {
    if (reduce) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = ((now - start) % CYCLE_MS) / CYCLE_MS;
      const walking = WALK_WINDOWS.some(([a, b]) => p >= a && p < b);
      setGait((prev) => {
        const next: DeerGait = walking ? "walk" : "idle";
        return prev === next ? prev : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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
