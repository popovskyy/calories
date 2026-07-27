"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { useBuyCosmetic, useBuyItem, useUseItem } from "@/hooks/useQueries";
import { BOX_ITEM_ID } from "@/lib/items";
import type { CosmeticKind } from "@/lib/api";
import type { ShopResponse, ShopStallSlot } from "@/lib/types";
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
 * Прилавок — один список витратних речей плюс пропозиції тижня.
 *
 * Раніше це були дві секції з тими самими предметами за різними цінами
 * (ротаційний прилавок + спорядження) — тижнева знижка тепер живе бейджем
 * прямо на рядку предмета, а окремими картками лишились тільки речі,
 * яких у списку немає: косметика тижня і набір ×2. Слот скриньки з ротації
 * не показуємо — вона і так у списку за тією ж ціною.
 *
 * Пасивні предмети (щит) не мають кнопки «застосувати»: вони спрацьовують
 * самі, і зайва кнопка лише створювала б враження, що про них треба пам'ятати.
 */
export function StallSection({ shop }: { shop: ShopResponse }) {
  const buy = useBuyItem();
  const use = useUseItem();
  const buyCosmetic = useBuyCosmetic();
  const left = useCountdown(shop.stallResetsAt);

  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "Помилка купівлі");

  // Тижнева знижка на предмет: kind item_sale → бейдж на рядку списку.
  const saleSlot = shop.stall.find((s) => s.kind === "item_sale" && !s.bought);
  // Картки пропозицій: усе, що не дублює список (косметика, набір).
  const dealSlots = shop.stall.filter(
    (s) => s.kind === "cosmetic" || s.kind === "bundle",
  );

  const onBuySlot = (slot: ShopStallSlot) => {
    if (slot.kind === "cosmetic") {
      buyCosmetic.mutate(
        { kind: slot.cosmeticKind as CosmeticKind, id: slot.refId },
        { onSuccess: () => toast.success(`Куплено: ${slot.nameUk}`), onError },
      );
    } else {
      buy.mutate(
        { itemId: slot.refId, fromStall: true },
        { onSuccess: () => toast.success(`Куплено: ${slot.nameUk}`), onError },
      );
    }
  };

  const onBuyItem = (id: string, name: string, fromStall: boolean) =>
    buy.mutate(
      { itemId: id, fromStall },
      {
        onSuccess: () => toast.success(`Куплено: ${name}`),
        onError,
      },
    );

  const onUse = (id: string, name: string) =>
    use.mutate(
      { itemId: id },
      {
        onSuccess: (res) => {
          // Скринька — єдиний предмет із сюрпризом, тож показуємо вміст.
          toast.success(
            res.boxLabel ? `Скринька: ${res.boxLabel}` : `Застосовано: ${name}`,
          );
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="lbl">Прилавок</span>
        <span className="text-[12px] text-[var(--color-muted3)]">
          пропозиції оновляться за {left}
        </span>
      </div>
      <p className="text-[12px] leading-relaxed text-[var(--color-muted3)]">
        Одноразові речі: рятують серію, міняють незручні завдання, подвоюють
        заробіток. Після використання зникають.
      </p>

      <ul className="flex flex-col gap-2">
        {shop.items.map((item) => {
          const sale = saleSlot?.refId === item.id ? saleSlot : null;
          const price = sale ? sale.price : item.price;
          const affordable = shop.coins >= price;
          return (
            <li key={item.id} className="mcard flex items-center gap-3 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-tile)] text-[22px]">
                {item.icon}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold text-[var(--color-text)]">
                  {item.nameUk}
                  {item.qty > 0 ? (
                    <span className="rounded-[var(--radius-pill)] bg-[var(--color-tile)] px-1.5 text-[11px] tabular-nums text-[var(--color-muted3)]">
                      ×{item.qty}
                    </span>
                  ) : null}
                  {sale ? (
                    <span className="rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--color-green)_18%,transparent)] px-1.5 text-[11px] font-bold text-[var(--color-green)]">
                      −25% цього тижня
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
                    "btn btn-primary btn-sm flex items-center justify-center gap-1",
                    (!affordable || item.full) && "opacity-60",
                  )}
                  disabled={buy.isPending || item.full}
                  onClick={() => onBuyItem(item.id, item.nameUk, !!sale)}
                >
                  <CoinIcon size={13} />
                  {price}
                  {sale ? (
                    <span className="text-[11px] line-through opacity-70">
                      {item.price}
                    </span>
                  ) : null}
                </button>

                {!item.passive && item.qty > 0 ? (
                  <button
                    className="btn btn-ghost btn-sm"
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

      {dealSlots.length > 0 ? (
        <>
          <span className="lbl mt-2">Пропозиції тижня</span>
          <div className="grid grid-cols-2 gap-3">
            {dealSlots.map((slot, i) => {
              const affordable = shop.coins >= slot.price;
              const soldOut = slot.bought;
              return (
                <div
                  key={`${slot.kind}-${slot.refId}-${i}`}
                  className="mcard flex flex-col items-center gap-2 p-3"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-[24px]"
                    style={{ background: slot.swatch ?? "var(--color-tile)" }}
                  >
                    {slot.swatch ? "" : slot.icon}
                  </div>

                  <div className="text-center">
                    <div className="text-[13px] font-semibold text-[var(--color-text)]">
                      {slot.nameUk}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-tight text-[var(--color-muted3)]">
                      {slot.description}
                    </p>
                  </div>

                  <button
                    className={cn(
                      "btn btn-primary mt-auto flex w-full items-center justify-center gap-1 py-2 text-[13px]",
                      (!affordable || soldOut) && "opacity-60",
                    )}
                    disabled={buy.isPending || buyCosmetic.isPending || soldOut}
                    onClick={() => onBuySlot(slot)}
                  >
                    {soldOut ? (
                      "Куплено"
                    ) : (
                      <>
                        <CoinIcon size={14} />
                        {slot.price}
                        {slot.oldPrice && slot.oldPrice > slot.price ? (
                          <span className="text-[11px] line-through opacity-70">
                            {slot.oldPrice}
                          </span>
                        ) : null}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
