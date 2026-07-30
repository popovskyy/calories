"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { DURATION_UI, EASE_OUT } from "@/lib/motion";

interface ProgressBarProps {
  value: number; // 0..1
  over?: boolean;
  /** Куплена рамка — «neon» додає неонову обводку й світіння. */
  frame?: string | null;
}

export function ProgressBar({ value, over = false, frame }: ProgressBarProps) {
  const reduce = useReducedMotion();
  const neon = frame === "neon";
  const pct = Math.min(Math.max(value, 0), 1);

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-pill)]",
        neon ? "p-[2px]" : undefined,
      )}
      style={
        neon
          ? {
              background:
                "linear-gradient(90deg, #00F0FF, #7B61FF, #FF2BD6, #00F0FF)",
              boxShadow:
                "0 0 12px rgba(0,240,255,0.45), 0 0 22px rgba(255,43,214,0.3)",
            }
          : undefined
      }
      animate={
        neon && !reduce
          ? { boxShadow: [
              "0 0 10px rgba(0,240,255,0.4), 0 0 18px rgba(255,43,214,0.25)",
              "0 0 16px rgba(0,240,255,0.7), 0 0 28px rgba(255,43,214,0.45)",
              "0 0 10px rgba(0,240,255,0.4), 0 0 18px rgba(255,43,214,0.25)",
            ] }
          : undefined
      }
      transition={
        neon && !reduce
          ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      <div
        className={cn(
          "h-2 w-full overflow-hidden rounded-[var(--radius-pill)]",
          neon ? "bg-[#0a0c14]" : "bg-[var(--color-tile)]",
        )}
      >
        <motion.div
          className="h-full w-full origin-left rounded-[var(--radius-pill)]"
          style={{
            background: over
              ? "linear-gradient(90deg,#c05f6c,#e0808c)"
              : neon
                ? "linear-gradient(90deg,#00F0FF,#7B61FF,#FF2BD6)"
                : "linear-gradient(90deg,#796cbf,#b5abfc)",
            boxShadow: neon && !over ? "0 0 8px rgba(0,240,255,0.8)" : undefined,
          }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: pct }}
          transition={{ duration: reduce ? 0 : DURATION_UI, ease: EASE_OUT }}
        />
      </div>
    </motion.div>
  );
}
