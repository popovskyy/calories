"use client";

import { ChevronRight } from "lucide-react";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuests } from "@/hooks/useQueries";
import { cn } from "@/lib/cn";
import type { QuestStatusDTO } from "@/lib/types";

/**
 * Один рядок тижневого квесту над «Ще» — видимість без dump усього списку на home.
 */
export function QuestChip({ onOpen }: { onOpen: () => void }) {
  const q = useQuests();

  if (q.isLoading || !q.data) {
    return <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />;
  }

  const pick = pickFeaturedQuest(q.data.quests);
  if (!pick) return null;

  const pct = pick.target > 0 ? Math.min(1, pick.progress / pick.target) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "mcard flex w-full items-center gap-3 px-[16px] py-3 text-left",
        "transition-[transform,background-color] active:scale-[0.99]",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="lbl !mb-0">Квест тижня</span>
          <span className="flex items-center gap-0.5 text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
            <CoinIcon size={13} />
            {pick.rewardCoins}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-[var(--color-text)]">
            {pick.titleUk}
          </span>
          <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-muted3)]">
            {pick.progress}/{pick.target}
            {pick.claimed ? " ✓" : pick.done ? " · чекає" : ""}
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--color-tile)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-[var(--color-muted3)]" />
    </button>
  );
}

/** Незавершений з найбільшим прогресом; інакше — перший, що чекає claim; інакше null. */
function pickFeaturedQuest(quests: QuestStatusDTO[]): QuestStatusDTO | null {
  const active = quests.filter((q) => !q.claimed);
  if (active.length === 0) return null;
  const waiting = active.find((q) => q.done);
  if (waiting) return waiting;
  return active.reduce((best, q) => {
    const bp = best.target > 0 ? best.progress / best.target : 0;
    const qp = q.target > 0 ? q.progress / q.target : 0;
    return qp > bp ? q : best;
  });
}
