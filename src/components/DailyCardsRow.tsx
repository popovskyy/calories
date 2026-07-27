"use client";

import { Check, Dices } from "lucide-react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDailyCards, useShop, useUseItem } from "@/hooks/useQueries";
import { CARD_REROLL_ITEM_ID } from "@/lib/items";
import type { DailyCardDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Дві картки дня — змінний шар, який повертає інтерес щоранку.
 *
 * Свідомо стоять НАД квестами тижня: денна дія має бути першим, що бачить
 * гравець, бо саме вона формує звичку заходити.
 */
export function DailyCardsRow() {
  const q = useDailyCards();
  const shop = useShop();
  const useItem = useUseItem();

  const rerollQty =
    shop.data?.items.find((i) => i.id === CARD_REROLL_ITEM_ID)?.qty ?? 0;

  const onReroll = () =>
    useItem.mutate(
      { itemId: CARD_REROLL_ITEM_ID },
      {
        onSuccess: () => toast.success("Картки перетягнуто"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-center justify-between gap-2">
        <span className="lbl">Картки дня</span>
        <button
          type="button"
          onClick={onReroll}
          disabled={rerollQty === 0 || useItem.isPending}
          className={cn(
            "btn btn-ghost btn-sm gap-1 px-2.5",
            rerollQty === 0 && "opacity-40",
          )}
        >
          <Dices size={13} />
          Перетягнути
          {rerollQty > 0 ? (
            <span className="font-semibold tabular-nums">{rerollQty}</span>
          ) : null}
        </button>
      </div>

      {q.isLoading || !q.data ? (
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-[104px] w-full" />
          <Skeleton className="h-[104px] w-full" />
        </div>
      ) : q.data.cards.length === 0 ? (
        <p className="text-[13px] text-[var(--color-muted3)]">
          Картки з&apos;являться, щойно налаштуєш профіль.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {q.data.cards.map((c) => (
            <Card key={c.code} card={c} />
          ))}
        </div>
      )}
    </section>
  );
}

function Card({ card }: { card: DailyCardDTO }) {
  const pct = card.target > 0 ? Math.min(1, card.progress / card.target) : 0;
  const done = card.claimed || card.done;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-md)] border p-3 transition-colors",
        done
          ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
          : "border-[var(--color-divider)]",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-[20px] leading-none">{card.icon}</span>
        <span className="flex items-center gap-0.5 text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
          <CoinIcon size={13} />
          {card.rewardCoins}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1 text-[14px] font-semibold text-[var(--color-text)]">
          {card.claimed ? (
            <Check size={14} className="shrink-0 text-[var(--color-accent)]" />
          ) : null}
          <span className="truncate">{card.titleUk}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-[var(--color-muted3)]">
          {card.description}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-1.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-tile)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
            style={{ width: `${pct * 100}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-[var(--color-muted3)]">
          {card.target > 1 ? `${card.progress}/${card.target}` : done ? "✓" : "—"}
        </span>
      </div>
    </div>
  );
}
