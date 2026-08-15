"use client";

import { motion, useReducedMotion } from "framer-motion";
import { DURATION_UI, EASE_OUT } from "@/lib/motion";

interface ProgressBarProps {
  value: number; // 0..1
  over?: boolean;
}

export function ProgressBar({ value, over = false }: ProgressBarProps) {
  const reduce = useReducedMotion();
  const pct = Math.min(Math.max(value, 0), 1);

  return (
    <div className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-tile)]">
      <motion.div
        className="h-full w-full origin-left rounded-[var(--radius-pill)]"
        style={{
          background: over
            ? "linear-gradient(90deg,#c05f6c,#e0808c)"
            : "linear-gradient(90deg,#796cbf,#b5abfc)",
        }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: pct }}
        transition={{ duration: reduce ? 0 : DURATION_UI, ease: EASE_OUT }}
      />
    </div>
  );
}
