"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { AnalyzeResult } from "@/lib/types";

const MACROS = [
  { key: "protein", label: "Білки", color: "var(--color-macro-protein)" },
  { key: "fats", label: "Жири", color: "var(--color-macro-fats)" },
  { key: "carbs", label: "Вуглев.", color: "var(--color-macro-carbs)" },
] as const;

export function AiResultCard({ result, source = "опису" }: { result: AnalyzeResult; source?: string }) {
  const values = { protein: result.protein, fats: result.fats, carbs: result.carbs };
  const maxMacro = Math.max(result.protein, result.fats, result.carbs, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[18px]"
      style={{ border: "1px solid var(--color-accent-800)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--color-accent)]" />
          <span className="text-[13px] font-semibold text-[var(--color-accent-200)]">
            Розпізнано з {source}
          </span>
        </div>
        <span className="tag tag-accent">Gemini</span>
      </div>

      {result.parsedItems.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.parsedItems.map((item, i) => (
            <span key={i} className="tag tag-outline">
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col items-center">
        <div className="text-[40px] font-semibold leading-none text-[var(--color-text)]">
          {result.calories}
        </div>
        <div className="mt-1 text-[12px] text-[var(--color-muted3)]">ккал усього</div>
      </div>

      <div className="mt-4 flex gap-2.5">
        {MACROS.map((m) => (
          <div key={m.key} className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-tile)] p-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-[var(--color-muted3)]">{m.label}</span>
              <span className="text-[13px] font-semibold text-[var(--color-text)]">
                {values[m.key]} г
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)]">
              <motion.div
                className="h-full rounded-[var(--radius-pill)]"
                style={{ background: m.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(values[m.key] / maxMacro) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
