"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { humanDateFull, todayYMD } from "@/lib/date";

interface DateSelectorProps {
  date: string;
  onPrev: () => void;
  onNext: () => void;
  subline?: string;
}

export function DateSelector({ date, onPrev, onNext, subline }: DateSelectorProps) {
  const isFuture = date >= todayYMD();
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrev}
        aria-label="Попередній день"
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-center">
        <div className="text-[19px] font-semibold text-[var(--color-text)]">
          {humanDateFull(date)}
        </div>
        {subline ? (
          <div className="text-[12px] text-[var(--color-muted3)]">{subline}</div>
        ) : null}
      </div>
      <button
        onClick={onNext}
        disabled={isFuture}
        aria-label="Наступний день"
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
