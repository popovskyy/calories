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
        type="button"
        onClick={onPrev}
        aria-label="Попередній день"
        className="icon-btn bg-[var(--color-surface)]"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-center">
        <div className="page-title">{humanDateFull(date)}</div>
        {subline ? (
          <div className="text-[14px] text-[var(--color-muted3)]">{subline}</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={isFuture}
        aria-label="Наступний день"
        className="icon-btn bg-[var(--color-surface)] disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
