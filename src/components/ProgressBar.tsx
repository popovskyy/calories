"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number; // 0..1
  over?: boolean;
}

export function ProgressBar({ value, over = false }: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-tile)]">
      <motion.div
        className="h-full rounded-[var(--radius-pill)]"
        style={{
          background: over
            ? "linear-gradient(90deg,#c05f6c,#e0808c)"
            : "linear-gradient(90deg,#796cbf,#b5abfc)",
        }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
