"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";

interface SaveCelebrateProps {
  open: boolean;
  onDone: () => void;
  inTarget?: boolean;
}

/** Коротке святкування після збереження прийому їжі. */
export function SaveCelebrate({ open, onDone, inTarget }: SaveCelebrateProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onDone, reduce ? 400 : 900);
    return () => window.clearTimeout(t);
  }, [open, onDone, reduce]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-8 py-6 shadow-[var(--shadow-card-lg)]"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: 10, scale: 0.94, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.12 }}
          >
            <Flame
              size={36}
              className={inTarget ? "text-[var(--color-green)]" : "text-[var(--color-accent)]"}
            />
            <p className="text-[17px] font-semibold text-[var(--color-text)]">
              {inTarget ? "День у нормі!" : "Записано!"}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
