"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ThinkingLine } from "@/components/ui/ThinkingLine";

const PHRASES = [
  "Придивляємось до селфі",
  "Обираємо палітру",
  "Малюємо портрет",
  "Наводимо блиск",
];

const SPARKS = [
  { size: 13, dur: 2.6, delay: 0, offset: 0 },
  { size: 10, dur: 3.4, delay: -1.1, offset: 6 },
  { size: 8, dur: 4.2, delay: -2.3, offset: -5 },
];

/**
 * Обгортка навколо аватара на час генерації через ШІ.
 *
 * Аватар не ховається під спінер, а лишається на місці — розмитий, під аурою
 * і з іскрами по орбіті. Так видно, що саме зараз перемальовується.
 */
export function AvatarConjuring({
  active,
  size,
  children,
}: {
  active: boolean;
  size: number;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const orbit = size / 2 + 9;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <motion.div
          animate={
            active && !reduce
              ? { filter: "blur(3px)", opacity: 0.55, scale: 0.94 }
              : { filter: "blur(0px)", opacity: 1, scale: 1 }
          }
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>

        <AnimatePresence>
          {active ? (
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.15 }}
              transition={{ duration: 0.25 }}
            >
              <div className="conjure-ring" />
              {/*
                .shimmer тримає position: relative, тож позиціонування —
                на обгортці, інакше блиск ліг би в потік і зсунув аватар.
              */}
              <div className="absolute inset-0 rounded-[var(--radius-pill)]">
                <div className="shimmer h-full w-full rounded-[var(--radius-pill)]" />
              </div>
              {SPARKS.map((s, i) => (
                <div
                  key={i}
                  className="orbit"
                  style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
                >
                  <Sparkles
                    size={s.size}
                    className="absolute left-1/2 top-1/2 text-[var(--color-accent-100)]"
                    style={{
                      transform: `translate(-50%, -50%) translateY(-${orbit + s.offset}px)`,
                    }}
                  />
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {active ? (
          <motion.div
            className="w-full overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <ThinkingLine phrases={PHRASES} intervalMs={2000} />
            <div className="ribbon mx-auto mt-1.5 w-32" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
