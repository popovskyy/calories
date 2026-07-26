"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useThinkingPhrase } from "@/hooks/useThinkingPhrase";
import { cn } from "@/lib/cn";

/** Три крапки, що «біжать» — мікросигнал, що процес живий. */
export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-end gap-[3px] pb-[3px]", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="dot-hop h-[3px] w-[3px] rounded-full bg-current"
          style={{ animationDelay: `${i * 0.14}s` }}
        />
      ))}
    </span>
  );
}

/**
 * Рядок статусу, що змінює формулювання поки ми чекаємо ШІ.
 * Конкретика («шукаємо інгредієнти») робить очікування коротшим на відчуття,
 * ніж одне вічне «Завантаження…».
 */
export function ThinkingLine({
  phrases,
  intervalMs,
  className,
}: {
  /** Стабільне посилання: константа рівня модуля, не інлайн-літерал. */
  phrases: string[];
  intervalMs?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { phrase, index } = useThinkingPhrase(phrases, intervalMs);

  return (
    <div
      aria-live="polite"
      className={cn(
        "relative flex h-6 items-center justify-center overflow-hidden text-[15px] text-[var(--color-muted2)]",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          className="flex items-center gap-1"
          initial={
            reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(3px)" }
          }
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(3px)" }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          {phrase}
          <ThinkingDots />
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
