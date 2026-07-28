"use client";

import { isInTargetFor } from "@/lib/economy";
import type { Goal } from "@/lib/calories";
import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

const R = 108;
const C = 2 * Math.PI * R;
const SIZE = 248;
const CX = SIZE / 2;

interface ProgressRingProps {
  consumed: number;
  target: number;
  /** Куплена рамка — «neon» додає неонову обводку й світіння. */
  frame?: string | null;
  /** Ціль користувача: від неї залежить асиметрична зона «в нормі». */
  goal?: Goal;
}

export function ProgressRing({
  consumed,
  target,
  frame,
  goal = "maintain",
}: ProgressRingProps) {
  const reduce = useReducedMotion();
  const neon = frame === "neon";
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(Math.max(consumed / safeTarget, 0), 1);
  const remaining = target - consumed;
  const over = remaining < 0;
  const nearTarget =
    consumed > 0 && isInTargetFor(consumed, safeTarget, goal);

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

  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize =
    digits >= 5 ? "text-[42px]" : digits >= 4 ? "text-[56px]" : "text-[64px]";

  const gradId = neon ? "ring-grad-neon" : "ring-grad";

  return (
    <div className="relative my-1.5 h-[248px] w-[248px] shrink-0">
      {nearTarget && !neon && !reduce ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: -4,
            boxShadow: "0 0 18px rgba(145,132,217,0.35), inset 0 0 12px rgba(145,132,217,0.12)",
            border: "1px solid rgba(145,132,217,0.35)",
          }}
          animate={{ opacity: [0.45, 0.9, 0.45], scale: [1, 1.015, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      {neon ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: -6,
            boxShadow:
              "0 0 18px rgba(0,240,255,0.55), 0 0 36px rgba(255,43,214,0.35), inset 0 0 18px rgba(0,240,255,0.15)",
            border: "1.5px solid rgba(0,240,255,0.65)",
          }}
          animate={reduce ? undefined : { opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative z-[1] block overflow-hidden"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={CX}
          cy={CX}
          r={R}
          fill="none"
          stroke={neon ? "rgba(0,240,255,0.18)" : "var(--color-track)"}
          strokeWidth="20"
        />
        <motion.circle
          cx={CX}
          cy={CX}
          r={R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={C}
          style={{
            strokeDashoffset: offset,
            filter: neon
              ? "drop-shadow(0 0 6px rgba(0,240,255,0.85)) drop-shadow(0 0 12px rgba(255,43,214,0.45))"
              : undefined,
          }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-ring-from)" />
            <stop offset="1" stopColor="var(--color-ring-to)" />
          </linearGradient>
          <linearGradient id="ring-grad-neon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#00F0FF" />
            <stop offset="0.55" stopColor="#7B61FF" />
            <stop offset="1" stopColor="#FF2BD6" />
          </linearGradient>
        </defs>
      </svg>

      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
        <div className="flex w-[176px] flex-col items-center justify-center overflow-hidden text-center">
          <motion.div
            className={`${numSize} font-semibold leading-[0.95] tracking-[-0.02em] text-[var(--color-text)]`}
            style={
              neon
                ? {
                    textShadow:
                      "0 0 12px rgba(0,240,255,0.35), 0 0 24px rgba(255,43,214,0.2)",
                  }
                : undefined
            }
          >
            {rounded}
          </motion.div>
          <div className="mt-1 max-w-full truncate text-[14px] leading-tight text-[var(--color-muted3)]">
            із {target.toLocaleString("uk-UA")} ккал
          </div>
          <div
            className="mt-1 max-w-full truncate text-[15px] font-semibold leading-tight"
            style={{
              color: over
                ? "var(--color-red)"
                : neon
                  ? "#00F0FF"
                  : "var(--color-green)",
              textShadow: neon && !over ? "0 0 10px rgba(0,240,255,0.55)" : undefined,
            }}
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
