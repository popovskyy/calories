"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";
import type { MealDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { DURATION_SHEET, EASE_OUT } from "@/lib/motion";

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
  onEdit?: (meal: MealDTO) => void;
  onDelete?: (id: string) => void;
  deleting?: boolean;
}

export function MealCard({
  meal,
  index = 0,
  onEdit,
  onDelete,
  deleting,
}: MealCardProps) {
  const reduce = useReducedMotion();
  const cancelled = meal.status === "cancelled";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        x: reduce ? 0 : -24,
        transition: { duration: reduce ? 0 : 0.22, ease: EASE_OUT },
      }}
      transition={{
        duration: reduce ? 0 : DURATION_SHEET,
        ease: EASE_OUT,
        delay: reduce ? 0 : index * 0.04,
      }}
      className={cn(
        "mcard mb-3 flex flex-col gap-3 p-[15px_16px]",
        cancelled && "opacity-55",
      )}
      style={{ opacity: deleting ? 0.5 : undefined }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold uppercase tracking-wide text-[var(--color-accent-300)]">
            {cancelled ? "Скасовано адміном" : kicker(meal.createdAt)}
          </div>
          <div
            className={cn(
              "mt-0.5 truncate text-[17px] font-semibold text-[var(--color-text)]",
              cancelled && "line-through",
            )}
          >
            {meal.description}
          </div>
        </div>
        <div className="shrink-0 text-right leading-none">
          <span className="text-[20px] font-semibold text-[var(--color-text)]">{meal.calories}</span>
          <span className="ml-1 text-[13px] text-[var(--color-muted3)]">ккал</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[13px] text-[var(--color-muted2)]">
          <span>Білки </span>
          <span className="text-[var(--color-text)]">{meal.protein}</span>
          <span> · Жири </span>
          <span className="text-[var(--color-text)]">{meal.fats}</span>
          <span> · Вуглеводи </span>
          <span className="text-[var(--color-text)]">{meal.carbs}</span>
        </div>
        {!cancelled && (onEdit || onDelete) ? (
          <div className="flex items-center gap-0.5">
            {onEdit ? (
              <button
                type="button"
                onClick={() => onEdit(meal)}
                disabled={deleting}
                aria-label="Редагувати"
                className="icon-btn"
              >
                <Pencil size={16} />
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(meal.id)}
                disabled={deleting}
                aria-label="Видалити"
                data-sfx="destructive"
                className="icon-btn hover:text-[var(--color-red)]"
              >
                <Trash2 size={16} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
