"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
import { ThinkingLine } from "@/components/ui/ThinkingLine";

const PHRASES = [
  "Розбираємо тренування",
  "Прикидаємо інтенсивність",
  "Звіряємось із вашою вагою",
  "Рахуємо спалені ккал",
  "Майже готово",
];

/**
 * Лінія пульсу: по ній біжить світлий сегмент, як сигнал із трекера.
 *
 * viewBox навмисне широкий (400×92) — svg тягнеться на всю ширину картки з
 * preserveAspectRatio="none", тож пропорції viewBox мають бути близькі до
 * реальних, інакше піки розплющує по горизонталі.
 */
const PULSE_PATH =
  "M0 46 H70 l14 -30 l12 60 l10 -44 l9 14 H190 l14 -34 l12 66 l11 -46 l8 14 H400";

/** Стан очікування оцінки спалених калорій. */
export function ActivityAnalyzeLoader() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-4"
      style={{ border: "1px solid var(--color-accent-800)" }}
    >
      <div className="flex items-center gap-2">
        <Flame size={16} className="spark-pulse text-[var(--color-accent)]" />
        <span className="text-[15px] font-semibold text-[var(--color-accent-200)]">
          Оцінюємо навантаження
        </span>
      </div>

      <svg
        viewBox="0 0 400 92"
        preserveAspectRatio="none"
        aria-hidden
        className="mt-3 h-[104px] w-full"
      >
        <path
          d={PULSE_PATH}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="color-mix(in srgb, var(--color-text) 12%, transparent)"
        />
        {reduce ? null : (
          <path
            className="pulse-travel"
            d={PULSE_PATH}
            fill="none"
            strokeWidth={3.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            stroke="var(--color-accent-300)"
          />
        )}
      </svg>

      <ThinkingLine phrases={PHRASES} className="mt-1" />
      <div className="ribbon mx-auto mt-2.5 w-2/3" />
    </motion.div>
  );
}
