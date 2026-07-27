"use client";

import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { useBuyCosmetic, useEquipCosmetic } from "@/hooks/useQueries";
import type { CosmeticKind } from "@/lib/api";
import type { ShopCosmetic, ShopResponse } from "@/lib/types";
import { cn } from "@/lib/cn";

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
      "Невеликий підпис під твоїм ніком в Арені — його бачать усі гравці. Активний лише один.",
  },
  {
    kind: "frame",
    title: "Рамки",
    hint:
      "Кольорове кільце навколо твого аватара. Видно скрізь, де він показується: Огляд, Арена, Профіль.",
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
        <div className="mt-auto flex items-center gap-1 text-[13px] font-semibold text-[var(--color-accent)]">
          <Check size={14} /> Активно
        </div>
      ) : c.owned ? (
        <button
          className="btn btn-ghost mt-auto w-full py-2 text-[13px]"
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
          className={cn(
            "btn btn-primary mt-auto flex w-full items-center justify-center gap-1 py-2 text-[13px]",
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
