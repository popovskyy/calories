"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

const R = 86;
const C = 2 * Math.PI * R; // ≈ 540.35

interface ProgressRingProps {
  consumed: number;
  target: number;
}

export function ProgressRing({ consumed, target }: ProgressRingProps) {
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(Math.max(consumed / safeTarget, 0), 1);
  const remaining = target - consumed;
  const over = remaining < 0;

  // Анімоване заповнення кільця
  const offset = useMotionValue(C);
  // Count-up числа
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("uk-UA"));

  useEffect(() => {
    const a1 = animate(offset, C - C * progress, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
    });
    const a2 = animate(count, consumed, {
      duration: 1.0,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [progress, consumed, offset, count]);

  return (
    <div className="relative my-1.5 h-[200px] w-[200px]">
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle cx="100" cy="100" r={R} fill="none" stroke="#2b2d3a" strokeWidth="16" />
        <motion.circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={C}
          style={{ strokeDashoffset: offset }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#b5abfc" />
            <stop offset="1" stopColor="#796cbf" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <motion.div className="text-[48px] font-semibold leading-none tracking-tight text-[var(--color-text)]">
          {rounded}
        </motion.div>
        <div className="text-[15px] text-[var(--color-muted3)]">із {target.toLocaleString("uk-UA")} ккал</div>
        <div
          className="mt-1.5 text-[14px] font-semibold"
          style={{ color: over ? "var(--color-red)" : "var(--color-green)" }}
        >
          {over
            ? `Перебір ${Math.abs(remaining).toLocaleString("uk-UA")}`
            : `Залишилось ${remaining.toLocaleString("uk-UA")}`}
        </div>
      </div>
    </div>
  );
}
