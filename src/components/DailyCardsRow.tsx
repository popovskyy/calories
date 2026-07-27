"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Dices } from "lucide-react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDailyCards, useShop, useUseItem } from "@/hooks/useQueries";
import { CARD_REROLL_ITEM_ID } from "@/lib/items";
import { todayYMD } from "@/lib/date";
import type { DailyCardDTO } from "@/lib/types";
import { cn } from "@/lib/cn";
import { playFinisher } from "@/lib/sfx";
import { useCurrentUser } from "@/hooks/useQueries";

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
  const { user } = useCurrentUser();
  const reduce = useReducedMotion();
  const seenClaimed = useRef<Set<string> | null>(null);
  const [burst, setBurst] = useState(false);

  const rerollQty =
    shop.data?.items.find((i) => i.id === CARD_REROLL_ITEM_ID)?.qty ?? 0;

  // Claim theater: коли картка вперше стає claimed — один toast + micro-burst
  useEffect(() => {
    const cards = q.data?.cards;
    if (!cards) return;
    if (seenClaimed.current === null) {
      seenClaimed.current = new Set(cards.filter((c) => c.claimed).map((c) => c.code));
      return;
    }
    const newly = cards.filter(
      (c) => c.claimed && !seenClaimed.current!.has(c.code),
    );
    if (newly.length === 0) return;
    for (const c of newly) seenClaimed.current.add(c.code);
    const coins = newly.reduce((s, c) => s + c.rewardCoins, 0);
    const label =
      newly.length === 1
        ? newly[0]!.titleUk
        : `${newly.length} картки`;
    toast.success(`+${coins} монет · ${label}`);
    setBurst(true);
    if (!reduce) playFinisher(user?.soundpack ?? "default");
    const t = window.setTimeout(() => setBurst(false), reduce ? 350 : 900);
    return () => window.clearTimeout(t);
  }, [q.data?.cards, reduce, user?.soundpack]);

  const onReroll = () =>
    useItem.mutate(
      { itemId: CARD_REROLL_ITEM_ID },
      {
        onSuccess: () => {
          seenClaimed.current = null;
          toast.success("Картки перетягнуто");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  return (
    <section className="relative mcard flex flex-col gap-3 p-[18px]">
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
          title={rerollQty === 0 ? "0 перетягувань — у крамниці" : undefined}
        >
          <Dices size={13} />
          {rerollQty > 0 ? (
            <>
              Перетягнути
              <span className="font-semibold tabular-nums">{rerollQty}</span>
            </>
          ) : (
            <span className="text-[12px]">у крамниці</span>
          )}
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
          {q.data.cards.map((c, i) => (
            <Card key={c.code} card={c} slot={i} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {burst ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {!reduce
              ? Array.from({ length: 8 }).map((_, i) => {
                  const a = (i / 8) * Math.PI * 2;
                  return (
                    <motion.span
                      key={i}
                      className="absolute h-2 w-2 rounded-full bg-[var(--color-accent)]"
                      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                      animate={{
                        x: Math.cos(a) * 42,
                        y: Math.sin(a) * 42,
                        opacity: 0,
                        scale: 0.4,
                      }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  );
                })
              : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function Card({ card, slot }: { card: DailyCardDTO; slot: number }) {
  const pct = card.target > 0 ? Math.min(1, card.progress / card.target) : 0;
  const done = card.claimed || card.done;
  const [morningPull, setMorningPull] = useState(false);

  // Soft highlight unfinished card on first open of the day (no modal)
  useEffect(() => {
    if (done) return;
    const key = `dc-morning:${todayYMD()}`;
    try {
      if (sessionStorage.getItem(key)) return;
      // Підсвічуємо першу незавершену (slot 0 пріоритет)
      if (slot === 0) {
        sessionStorage.setItem(key, "1");
        setMorningPull(true);
        const t = window.setTimeout(() => setMorningPull(false), 4200);
        return () => window.clearTimeout(t);
      }
    } catch {
      /* private mode */
    }
  }, [done, slot]);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-[var(--radius-md)] border p-3 transition-[border-color,box-shadow,background-color]",
        done
          ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
          : "border-[var(--color-divider)]",
        morningPull &&
          !done &&
          "border-[var(--color-accent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]",
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
