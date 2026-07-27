"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import type { HeroProps } from "@/components/hero/CalorieHero";

const BEVEL = {
  borderTopColor: "#45454d",
  borderLeftColor: "#45454d",
  borderBottomColor: "#131316",
  borderRightColor: "#131316",
} as const;

/** Minecraft-герой: блоковий бокс із числом + XP-бар під ним. */
export function BlockHero({ consumed, target, frame }: HeroProps) {
  const neon = frame === "neon";
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(Math.max(consumed / safeTarget, 0), 1);
  const remaining = target - consumed;
  const over = remaining < 0;

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("uk-UA"));
  const fill = useMotionValue(0);
  const width = useTransform(fill, (v) => `${v * 100}%`);

  useEffect(() => {
    const a1 = animate(count, consumed, { duration: 1.0, ease: [0.22, 1, 0.36, 1] });
    const a2 = animate(fill, progress, { duration: 1.1, ease: [0.22, 1, 0.36, 1] });
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [consumed, progress, count, fill]);

  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize = digits >= 5 ? "text-[54px]" : digits >= 4 ? "text-[66px]" : "text-[80px]";

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className="my-2 flex h-[186px] w-[186px] shrink-0 flex-col items-center justify-center gap-0.5 border-4 border-solid bg-[#26262b]"
        style={{
          ...BEVEL,
          ...(neon
            ? {
                boxShadow:
                  "0 0 16px rgba(0,240,255,0.45), 0 0 28px rgba(255,43,214,0.3)",
                borderColor: "#00F0FF",
              }
            : null),
        }}
      >
        <motion.div
          className={`${numSize} font-extrabold leading-[0.9] text-white`}
          style={{
            fontFamily: "var(--font-display)",
            textShadow: "4px 4px 0 #131316",
          }}
        >
          {rounded}
        </motion.div>
        <div
          className="text-[18px] uppercase text-[var(--color-muted2)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          із {target.toLocaleString("uk-UA")} ккал
        </div>
        <div
          className="text-[19px] font-bold uppercase"
          style={{
            fontFamily: "var(--font-display)",
            color: over ? "var(--color-red)" : neon ? "#00F0FF" : "var(--color-green)",
            textShadow: "2px 2px 0 #131316",
          }}
        >
          {over
            ? `Перебір ${Math.abs(remaining).toLocaleString("uk-UA")}`
            : `Ще ${remaining.toLocaleString("uk-UA")}`}
        </div>
      </div>

      {/* XP-бар: темний жолоб зі світлою нижньою фаскою, як у грі */}
      <div
        className="mt-1.5 mb-2 h-[18px] w-full bg-[#16161a]"
        style={{
          borderTop: neon ? "3px solid #00F0FF88" : "3px solid #0c0c0f",
          borderBottom: neon ? "3px solid #FF2BD688" : "3px solid #3f3f45",
          boxShadow: neon
            ? "0 0 12px rgba(0,240,255,0.4), 0 0 20px rgba(255,43,214,0.25)"
            : undefined,
        }}
      >
        <motion.div
          className="h-full"
          style={{
            width,
            background: over
              ? "var(--color-red)"
              : neon
                ? "linear-gradient(90deg,#00F0FF,#7B61FF,#FF2BD6)"
                : "#80ff20",
            borderBottom: `3px solid ${
              over ? "#841f16" : neon ? "#7B61FF" : "#4fae0d"
            }`,
            boxShadow: neon && !over ? "0 0 8px rgba(0,240,255,0.7)" : undefined,
          }}
        />
      </div>
    </div>
  );
}
