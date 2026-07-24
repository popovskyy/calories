"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import type { MealDTO } from "@/lib/types";

function kicker(createdAt: string): string {
  const d = new Date(createdAt);
  const h = d.getHours();
  const label = h < 11 ? "Сніданок" : h < 15 ? "Обід" : h < 18 ? "Перекус" : "Вечеря";
  const time = `${String(h).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${label} · ${time}`;
}

interface MealCardProps {
  meal: MealDTO;
  index?: number;
  onEdit: (meal: MealDTO) => void;
  onDelete: (id: string) => void;
  deleting?: boolean;
}

export function MealCard({
  meal,
  index = 0,
  onEdit,
  onDelete,
  deleting,
}: MealCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0, transition: { duration: 0.22 } }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 }}
      className="mcard flex flex-col gap-3 p-[15px_16px]"
      style={{ marginBottom: 12, opacity: deleting ? 0.5 : undefined }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-accent-300)]">
            {kicker(meal.createdAt)}
          </div>
          <div className="mt-0.5 truncate text-[17px] font-semibold text-[var(--color-text)]">
            {meal.description}
          </div>
        </div>
        <div className="shrink-0 text-right leading-none">
          <span className="text-[20px] font-semibold text-[var(--color-text)]">{meal.calories}</span>
          <span className="ml-1 text-[13px] text-[var(--color-muted3)]">ккал</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[14px] text-[var(--color-muted2)]">
          <span>Б </span>
          <span className="text-[var(--color-text)]">{meal.protein}</span>
          <span> · Ж </span>
          <span className="text-[var(--color-text)]">{meal.fats}</span>
          <span> · В </span>
          <span className="text-[var(--color-text)]">{meal.carbs}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onEdit(meal)}
            disabled={deleting}
            aria-label="Редагувати"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] text-[var(--color-muted3)] transition-colors hover:bg-[var(--color-tile)] hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(meal.id)}
            disabled={deleting}
            aria-label="Видалити"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] text-[var(--color-muted3)] transition-colors hover:bg-[var(--color-tile)] hover:text-[var(--color-red)] disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
