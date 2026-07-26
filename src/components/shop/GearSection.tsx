"use client";

import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { useBuyItem, useUseItem } from "@/hooks/useQueries";
import { BOX_ITEM_ID } from "@/lib/items";
import type { ShopResponse } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Спорядження — витратні речі, які й тримають економіку живою.
 *
 * Пасивні предмети (щит) не мають кнопки «застосувати»: вони спрацьовують
 * самі, і зайва кнопка лише створювала б враження, що про них треба пам'ятати.
 */
export function GearSection({ shop }: { shop: ShopResponse }) {
  const buy = useBuyItem();
  const use = useUseItem();

  const onBuy = (id: string, name: string) =>
    buy.mutate(
      { itemId: id },
      {
        onSuccess: () => toast.success(`Куплено: ${name}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  const onUse = (id: string, name: string) =>
    use.mutate(
      { itemId: id },
      {
        onSuccess: (res) => {
          // Скринька — єдиний предмет із сюрпризом, тож показуємо вміст.
          toast.success(res.boxLabel ? `Скринька: ${res.boxLabel}` : `Застосовано: ${name}`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  return (
    <section className="flex flex-col gap-2">
      <span className="lbl">Спорядження</span>
      <p className="text-[12px] text-[var(--color-muted3)]">
        Витратне. Саме сюди йдуть монети, коли вітрина вже викуплена.
      </p>

      <ul className="flex flex-col gap-2">
        {shop.items.map((item) => {
          const affordable = shop.coins >= item.price;
          return (
            <li
              key={item.id}
              className="mcard flex items-center gap-3 p-3"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-tile)] text-[22px]">
                {item.icon}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-text)]">
                  {item.nameUk}
                  {item.qty > 0 ? (
                    <span className="rounded-[var(--radius-pill)] bg-[var(--color-tile)] px-1.5 text-[11px] tabular-nums text-[var(--color-muted3)]">
                      ×{item.qty}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[11px] leading-tight text-[var(--color-muted3)]">
                  {item.description}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  className={cn(
                    "btn btn-primary flex items-center justify-center gap-1 px-3 py-1.5 text-[13px]",
                    (!affordable || item.full) && "opacity-60",
                  )}
                  disabled={buy.isPending || item.full}
                  onClick={() => onBuy(item.id, item.nameUk)}
                >
                  <CoinIcon size={13} />
                  {item.price}
                </button>

                {!item.passive && item.qty > 0 ? (
                  <button
                    className="btn btn-ghost px-3 py-1.5 text-[12px]"
                    disabled={use.isPending}
                    onClick={() => onUse(item.id, item.nameUk)}
                  >
                    {item.id === BOX_ITEM_ID ? "Відкрити" : "Застосувати"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
