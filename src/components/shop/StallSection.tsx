"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { useBuyCosmetic, useBuyItem } from "@/hooks/useQueries";
import type { CosmeticKind } from "@/lib/api";
import type { ShopResponse } from "@/lib/types";
import { cn } from "@/lib/cn";

/** «за 3 дн 4 год» — дефіцит працює, лише коли його видно. */
function useCountdown(iso: string): string {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) return setLabel("ось-ось");
      const d = Math.floor(ms / 86_400_000);
      const h = Math.floor((ms % 86_400_000) / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(d > 0 ? `${d} дн ${h} год` : h > 0 ? `${h} год ${m} хв` : `${m} хв`);
    };
    tick();
    const t = window.setInterval(tick, 60_000);
    return () => window.clearInterval(t);
  }, [iso]);

  return label;
}

/**
 * Ротаційний прилавок — головна причина відкрити застосунок у понеділок
 * навіть тому, хто вже купив геть усе.
 */
export function StallSection({ shop }: { shop: ShopResponse }) {
  const buyItem = useBuyItem();
  const buyCosmetic = useBuyCosmetic();
  const left = useCountdown(shop.stallResetsAt);

  const onBuy = (slot: ShopResponse["stall"][number]) => {
    const onError = (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Помилка купівлі");

    if (slot.kind === "cosmetic") {
      buyCosmetic.mutate(
        { kind: slot.cosmeticKind as CosmeticKind, id: slot.refId },
        { onSuccess: () => toast.success(`Куплено: ${slot.nameUk}`), onError },
      );
    } else {
      buyItem.mutate(
        { itemId: slot.refId, fromStall: true },
        { onSuccess: () => toast.success(`Куплено: ${slot.nameUk}`), onError },
      );
    }
  };

  const pending = buyItem.isPending || buyCosmetic.isPending;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="lbl">Прилавок тижня</span>
        <span className="text-[12px] text-[var(--color-muted3)]">
          оновиться за {left}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {shop.stall.map((slot, i) => {
          const affordable = shop.coins >= slot.price;
          return (
            <div
              key={`${slot.kind}-${slot.refId}-${i}`}
              className="mcard flex flex-col items-center gap-2 p-3"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-[24px]"
                style={{
                  background: slot.swatch ?? "var(--color-tile)",
                }}
              >
                {slot.swatch ? "" : slot.icon}
              </div>

              <div className="text-center">
                <div className="text-[13px] font-semibold text-[var(--color-text)]">
                  {slot.nameUk}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-[var(--color-muted3)]">
                  {slot.description}
                </p>
              </div>

              <button
                className={cn(
                  "btn btn-primary mt-auto flex w-full items-center justify-center gap-1 py-2 text-[13px]",
                  !affordable && "opacity-60",
                )}
                disabled={pending}
                onClick={() => onBuy(slot)}
              >
                <CoinIcon size={14} />
                {slot.price}
                {slot.oldPrice && slot.oldPrice > slot.price ? (
                  <span className="text-[11px] line-through opacity-70">
                    {slot.oldPrice}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
