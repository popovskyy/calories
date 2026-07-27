"use client";

import { Check, Circle, Dices } from "lucide-react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuests, useRerollQuest, useShop } from "@/hooks/useQueries";
import { QUEST_REROLL_ITEM_ID } from "@/lib/items";
import { humanDate } from "@/lib/date";
import { cn } from "@/lib/cn";

export function WeeklyQuestsCard() {
  const q = useQuests();
  const shop = useShop();
  const reroll = useRerollQuest();

  const rerollQty =
    shop.data?.items.find((i) => i.id === QUEST_REROLL_ITEM_ID)?.qty ?? 0;

  const onReroll = (code: string) =>
    reroll.mutate(code, {
      onSuccess: () => toast.success("Квест замінено"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
    });

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="lbl">Квести тижня</span>
        {q.data ? (
          <span className="text-[13px] text-[var(--color-muted3)]">
            {humanDate(q.data.weekStart)} – {humanDate(q.data.weekEnd)}
          </span>
        ) : null}
      </div>

      {q.isLoading || !q.data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {q.data.quests.map((quest) => {
            const pct = quest.target > 0 ? Math.min(1, quest.progress / quest.target) : 0;
            return (
              <li
                key={quest.id}
                className={cn(
                  "rounded-[var(--radius-md)] border border-[var(--color-divider)] p-3",
                  quest.claimed && "opacity-80",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-[15px] font-semibold text-[var(--color-text)]">
                      {quest.claimed || quest.done ? (
                        <Check size={16} className="text-[var(--color-accent)]" />
                      ) : (
                        <Circle size={14} className="text-[var(--color-muted3)]" />
                      )}
                      {quest.titleUk}
                    </div>
                    <p className="mt-0.5 text-[12px] text-[var(--color-muted3)]">
                      {quest.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-[14px] font-semibold tabular-nums">
                      <CoinIcon size={14} />
                      {quest.rewardCoins}
                    </div>
                    {/* Ре-рол лише для незавершених: міняти виконане немає сенсу */}
                    {!quest.claimed && rerollQty > 0 ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm h-8 min-h-8 gap-0.5 px-2 text-[12px]"
                        disabled={reroll.isPending}
                        onClick={() => onReroll(quest.code)}
                      >
                        <Dices size={12} />
                        міняти
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-tile)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
                      style={{ width: `${pct * 100}%` }}
                    />
                  </div>
                  <span className="text-[12px] tabular-nums text-[var(--color-muted3)]">
                    {quest.progress}/{quest.target}
                    {quest.claimed ? " · ✓" : quest.done ? " · чекає на закриття дня" : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
