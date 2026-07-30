"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useThemeId } from "@/hooks/useThemeId";
import { DURATION_UI, EASE_OUT } from "@/lib/motion";

interface MacroTilesProps {
  protein: number;
  fats: number;
  carbs: number;
  targets: { protein: number; fats: number; carbs: number };
}

const MACROS = [
  { key: "protein" as const, label: "Білки", color: "var(--color-macro-protein)" },
  { key: "fats" as const, label: "Жири", color: "var(--color-macro-fats)" },
  { key: "carbs" as const, label: "Вуглев.", color: "var(--color-macro-carbs)" },
];

export function MacroTiles({ protein, fats, carbs, targets }: MacroTilesProps) {
  const reduce = useReducedMotion();
  const values = { protein, fats, carbs };
  const crumbs = useThemeId() === "minecraft";
  return (
    <div className="flex w-full gap-2.5">
      {MACROS.map((m, i) => {
        const value = values[m.key];
        const target = targets[m.key];
        const over = target > 0 && value > target;
        const ratio = target > 0 ? Math.min(value / target, 1) : 0;
        return (
          <div
            key={m.key}
            className="flex flex-1 flex-col gap-1 rounded-[var(--radius-md)] bg-[var(--color-tile)] px-2 py-2"
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-[var(--color-muted3)]">
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: m.color }}
              />
              {m.label}
            </div>
            <div className="whitespace-nowrap text-[18px] font-semibold tabular-nums text-[var(--color-text)]">
              {value}
              <span> г</span>
            </div>
            {crumbs ? (
              /* Minecraft: смужка розпадається на 5 «крихт» — інвентарний лічильник */
              <div className="flex gap-0.5 py-0.5">
                {[0, 1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    className="h-2 flex-1"
                    style={{
                      background:
                        j < Math.round(ratio * 5)
                          ? over
                            ? "var(--color-red)"
                            : m.color
                          : "#3d3d43",
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-1 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-track)]">
                <motion.div
                  className="h-full w-full origin-left rounded-[var(--radius-pill)]"
                  style={{
                    background: over ? "var(--color-red)" : m.color,
                  }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: ratio }}
                  transition={{
                    duration: reduce ? 0 : DURATION_UI,
                    ease: EASE_OUT,
                    delay: reduce ? 0 : i * 0.04,
                  }}
                />
              </div>
            )}
            <div className="text-[11px] tabular-nums text-[var(--color-muted3)]">
              {target} г
            </div>
          </div>
        );
      })}
    </div>
  );
}
