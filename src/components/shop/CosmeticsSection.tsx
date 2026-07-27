"use client";

import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { useBuyCosmetic, useEquipCosmetic } from "@/hooks/useQueries";
import type { CosmeticKind } from "@/lib/api";
import type { ShopCosmetic, ShopResponse } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Фінішер і звук завжди «вдягнені» — зняти не можна, лише замінити іншим. */
const CAN_UNEQUIP: ReadonlySet<CosmeticKind> = new Set(["frame", "title"]);

const GROUPS: { kind: CosmeticKind; title: string; hint: string }[] = [
  {
    kind: "finisher",
    title: "Фінішери",
    hint:
      "Святкування, яке зʼявляється на весь екран, коли ти закриваєш день у межах ±5% від норми. Активний лише один.",
  },
  {
    kind: "title",
    title: "Титули",
    hint:
      "Підпис під ніком в Арені. Активний лише один — натисни «Зняти», щоб прибрати.",
  },
  {
    kind: "frame",
    title: "Рамки",
    hint:
      "Кільце навколо аватара; «Неон» також підсвічує шкалу ккал. Натисни «Зняти» на активній, щоб повернутись без рамки.",
  },
  {
    kind: "soundpack",
    title: "Звук",
    hint: "Як звучить закриття вдалого дня. Активний лише один.",
  },
];

export function CosmeticsSection({ shop }: { shop: ShopResponse }) {
  return (
    <>
      {GROUPS.map((g) => {
        const items = shop.cosmetics.filter((c) => c.kind === g.kind);
        if (items.length === 0) return null;
        return (
          <section key={g.kind} className="flex flex-col gap-2">
            <span className="lbl">{g.title}</span>
            <p className="text-[12px] text-[var(--color-muted3)]">{g.hint}</p>
            <div className="grid grid-cols-2 gap-3">
              {items.map((c) => (
                <CosmeticCard key={`${c.kind}-${c.id}`} c={c} coins={shop.coins} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function CosmeticCard({ c, coins }: { c: ShopCosmetic; coins: number }) {
  const buy = useBuyCosmetic();
  const equip = useEquipCosmetic();
  const canUnequip = CAN_UNEQUIP.has(c.kind);

  const onBuy = () =>
    buy.mutate(
      { kind: c.kind, id: c.id },
      {
        onSuccess: () => toast.success(`Куплено: ${c.nameUk}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  const onEquip = () =>
    equip.mutate(
      { kind: c.kind, id: c.id },
      {
        onSuccess: () => toast.success(`Вдягнено: ${c.nameUk}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  const onUnequip = () =>
    equip.mutate(
      { kind: c.kind, id: null },
      {
        onSuccess: () => toast.success(`Знято: ${c.nameUk}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  const locked = !c.owned;

  return (
    <div
      className="mcard flex flex-col items-center gap-2 p-3"
      style={{ boxShadow: `inset 0 0 0 1.5px ${c.equipped ? "var(--color-accent)" : "transparent"}` }}
    >
      <div
        className="relative flex h-12 w-full items-center justify-center rounded-[var(--radius-md)]"
        style={{ background: c.swatch }}
      >
        {locked ? (
          <Lock size={18} className="text-white drop-shadow" />
        ) : c.equipped ? (
          <Check size={18} className="text-white drop-shadow" />
        ) : null}
      </div>

      <div className="text-center">
        <div className="text-[13px] font-semibold text-[var(--color-text)]">
          {c.nameUk}
        </div>
        <p className="mt-0.5 text-[11px] leading-tight text-[var(--color-muted3)]">
          {c.description}
        </p>
      </div>

      {/*
        Заблокована заслужена річ показує умову й ЛИШАЄТЬСЯ на вітрині.
        Порожній слот із написом «стрік 100 — у тебе 34» мотивує щодня
        і не коштує економіці жодної монети.
      */}
      {c.equipped ? (
        canUnequip ? (
          <button
            type="button"
            className="btn btn-primary btn-sm mt-auto w-full"
            disabled={equip.isPending}
            onClick={onUnequip}
            aria-label={`Зняти ${c.nameUk}`}
          >
            {equip.isPending ? "…" : "Зняти"}
          </button>
        ) : (
          <div className="btn btn-primary btn-sm pointer-events-none mt-auto w-full cursor-default">
            <Check size={14} strokeWidth={2.5} /> Активно
          </div>
        )
      ) : c.owned ? (
        <button
          type="button"
          className="btn btn-sm mt-auto w-full border-2 border-[var(--color-accent-400)] bg-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-tile))] font-bold text-[var(--color-accent-100)]"
          disabled={equip.isPending}
          onClick={onEquip}
        >
          {equip.isPending ? "…" : "Вдягнути"}
        </button>
      ) : c.earnedOnly ? (
        <div className="mt-auto text-center text-[11px] leading-tight text-[var(--color-muted3)]">
          {c.hint ?? "Здобувається"}
        </div>
      ) : (
        <button
          type="button"
          className={cn(
            "btn btn-primary btn-sm mt-auto flex w-full items-center justify-center gap-1",
            coins < c.price && "opacity-60",
          )}
          disabled={buy.isPending}
          onClick={onBuy}
        >
          <CoinIcon size={14} /> {c.price}
        </button>
      )}
    </div>
  );
}
