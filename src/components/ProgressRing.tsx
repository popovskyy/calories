"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

const R = 86;
const C = 2 * Math.PI * R;

interface ProgressRingProps {
  consumed: number;
  target: number;
}

export function ProgressRing({ consumed, target }: ProgressRingProps) {
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(Math.max(consumed / safeTarget, 0), 1);
  const remaining = target - consumed;
  const over = remaining < 0;

  const offset = useMotionValue(C);
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

  /*
   * Головна цифра — найважливіше число на екрані, тож вона має домінувати.
   * Отвір кільця ≈ 156px (R 86 − половина обводки 8), тримаємось у 140px:
   * розмір падає лише тоді, коли цифр справді забагато.
   */
  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize =
    digits >= 5 ? "text-[34px]" : digits >= 4 ? "text-[44px]" : "text-[52px]";

  return (
    <div className="relative my-1.5 h-[200px] w-[200px] shrink-0 overflow-hidden">
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="block"
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

      {/* Текст лише всередині «дірки» кільця (~156px), без вилазу */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="flex w-[140px] flex-col items-center justify-center overflow-hidden text-center">
          <motion.div
            className={`${numSize} font-semibold leading-[0.95] tracking-[-0.02em] text-[var(--color-text)]`}
          >
            {rounded}
          </motion.div>
          <div className="mt-1 max-w-full truncate text-[12px] leading-tight text-[var(--color-muted3)]">
            із {target.toLocaleString("uk-UA")} ккал
          </div>
          <div
            className="mt-1 max-w-full truncate text-[11px] font-semibold leading-tight"
            style={{ color: over ? "var(--color-red)" : "var(--color-green)" }}
          >
            {over
              ? `Перебір ${Math.abs(remaining).toLocaleString("uk-UA")}`
              : `Ще ${remaining.toLocaleString("uk-UA")}`}
          </div>
        </div>
      </div>
    </div>
  );
}
