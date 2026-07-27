"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { HeroProps } from "@/components/hero/CalorieHero";

/**
 * Маяк: дуга променя = прогрес до цілі.
 * Перебір — «перегрів» ліхтаря (тепліший акцент).
 */
export function LighthouseHero({ consumed, target, frame }: HeroProps) {
  const reduce = useReducedMotion();
  const neon = frame === "neon";
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(Math.max(consumed / safeTarget, 0), 1);
  const remaining = target - consumed;
  const over = remaining < 0;
  const inTarget = !over && Math.abs(remaining) <= safeTarget * 0.05 && consumed > 0;

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("uk-UA"));
  const sweep = useMotionValue(0);
  const beamDeg = useTransform(sweep, (v) => `${8 + v * 64}deg`);
  const beamDegMirror = useTransform(sweep, (v) => `${-(8 + v * 64)}deg`);

  useEffect(() => {
    const a1 = animate(count, consumed, { duration: 1.0, ease: [0.22, 1, 0.36, 1] });
    const a2 = animate(sweep, progress, { duration: 1.15, ease: [0.22, 1, 0.36, 1] });
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [consumed, progress, count, sweep]);

  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize = digits >= 5 ? "text-[42px]" : digits >= 4 ? "text-[52px]" : "text-[62px]";

  return (
    <div className="relative my-1 h-[250px] w-full shrink-0 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
        style={{
          background:
            "radial-gradient(50% 80% at 50% 0%, rgba(255,179,92,.22), transparent 70%)",
        }}
      />

      <div className="absolute bottom-[28px] left-1/2 z-[1] h-[118px] w-[54px] -translate-x-1/2">
        <div
          className="absolute inset-x-1 bottom-0 top-8 rounded-t-[4px]"
          style={{
            background: "linear-gradient(90deg, #1a2430, #2a3848 45%, #15202c)",
            boxShadow: neon ? "0 0 16px rgba(0,240,255,.35)" : "0 8px 20px rgba(0,0,0,.35)",
          }}
        />
        <div
          className="absolute left-1/2 top-0 h-10 w-16 -translate-x-1/2 rounded-[3px]"
          style={{
            background: over
              ? "linear-gradient(#ff8a5c, #ffb35c)"
              : "linear-gradient(#ffe0a8, #ffb35c)",
            boxShadow: inTarget
              ? "0 0 22px rgba(255,179,92,.65)"
              : "0 0 14px rgba(255,179,92,.4)",
            animation: reduce
              ? undefined
              : inTarget
                ? "lighthousePulse 2.4s ease-in-out infinite"
                : undefined,
          }}
        />
        <motion.div
          className="absolute left-1/2 top-2 origin-top"
          style={{
            width: 2,
            height: 160,
            marginLeft: -1,
            background:
              "linear-gradient(180deg, rgba(255,179,92,.55), rgba(255,179,92,0))",
            rotate: beamDeg,
          }}
        />
        <motion.div
          className="absolute left-1/2 top-2 origin-top"
          style={{
            width: 2,
            height: 160,
            marginLeft: -1,
            background:
              "linear-gradient(180deg, rgba(255,179,92,.35), rgba(255,179,92,0))",
            rotate: beamDegMirror,
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-3 z-[2] flex flex-col items-center gap-0.5">
        <motion.div
          className={`${numSize} leading-none text-white`}
          style={{
            fontFamily: "var(--font-display)",
            textShadow: "0 0 22px rgba(255,179,92,.45)",
          }}
        >
          {rounded}
        </motion.div>
        <div className="text-[12px] text-[var(--color-muted)]">
          із {target.toLocaleString("uk-UA")} ккал
        </div>
        <div
          className="text-[13px] font-black"
          style={{ color: over ? "var(--color-red)" : "var(--color-green)" }}
        >
          {over
            ? `Перебір ${Math.abs(remaining).toLocaleString("uk-UA")}`
            : `Ще ${remaining.toLocaleString("uk-UA")}`}
        </div>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-7"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(14,20,28,.9)), repeating-linear-gradient(90deg, #1a2838 0 8px, #15202c 8px 16px)",
          opacity: 0.9,
        }}
      />
    </div>
  );
}
