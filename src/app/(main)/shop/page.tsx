"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { PresetMascot } from "@/components/avatars/PresetMascot";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Modal } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBuySkin, useCurrentUser, useEquipSkin, useShop } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { RARITY } from "@/lib/avatar-presets";
import type { ShopSkin } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function ShopPage() {
  const mounted = useMounted();
  const { user } = useCurrentUser();
  const shop = useShop();
  const buy = useBuySkin();
  const equip = useEquipSkin();
  const [confirm, setConfirm] = useState<ShopSkin | null>(null);

  // Баланс з /me — source of truth (адмінські нарахування теж)
  const coins = user?.coins ?? shop.data?.coins ?? 0;
  const skins = shop.data?.skins ?? [];
  const premium = skins.filter((s) => s.tier === "premium");
  const free = skins.filter((s) => s.tier === "free");

  const onEquip = (s: ShopSkin) =>
    equip.mutate(s.id, {
      onSuccess: () => toast.success(`Вдягнено: ${s.nameUk}`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
    });

  const onBuy = (s: ShopSkin) =>
    buy.mutate(s.id, {
      onSuccess: () => {
        setConfirm(null);
        toast.success(`Куплено: ${s.nameUk}!`);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка купівлі"),
    });

  return (
    <>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--color-text)]">Магазин</h1>
          <p className="mt-0.5 text-[14px] text-[var(--color-muted3)]">
            Заробляй монети за звички — відкривай скіни
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,#FFC800_45%,transparent)] bg-[color-mix(in_srgb,#FFC800_12%,transparent)] px-3 py-2">
          <CoinIcon size={18} />
          <span className="text-[16px] font-semibold tabular-nums text-[var(--color-text)]">
            {coins.toLocaleString("uk-UA")}
          </span>
        </div>
      </header>

      {!mounted || shop.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px] w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : shop.isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-[15px] text-[var(--color-muted3)]">
            {shop.error instanceof Error
              ? shop.error.message
              : "Не вдалося завантажити магазин"}
          </p>
          <button className="btn btn-primary" onClick={() => shop.refetch()}>
            Спробувати знову
          </button>
        </div>
      ) : skins.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-[var(--color-muted3)]">
          Каталог порожній — загляни пізніше
        </p>
      ) : (
        <>
          <SkinSection
            title="Преміум"
            skins={premium}
            coins={coins}
            onEquip={onEquip}
            onBuy={(s) => setConfirm(s)}
            equipping={equip.isPending ? equip.variables : null}
          />
          <SkinSection
            title="Безкоштовні"
            skins={free}
            coins={coins}
            onEquip={onEquip}
            onBuy={() => {}}
            equipping={equip.isPending ? equip.variables : null}
          />
        </>
      )}

      <Modal
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Купити скін?"
      >
        {confirm ? (
          <div className="flex flex-col items-center gap-3">
            <SkinGlow rarity={confirm.rarity}>
              <PresetMascot
                id={confirm.id}
                size={72}
                animated
                artKind={confirm.artKind as "file" | "inline" | "builtin" | undefined}
                nameUk={confirm.nameUk}
              />
            </SkinGlow>
            <div className="text-center">
              <div className="text-[17px] font-semibold text-[var(--color-text)]">
                {confirm.nameUk}
              </div>
              <div
                className="text-[13px]"
                style={{ color: (RARITY[confirm.rarity] ?? RARITY.common).color }}
              >
                {(RARITY[confirm.rarity] ?? RARITY.common).label}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[15px]">
              <span className="text-[var(--color-muted3)]">Ціна:</span>
              <CoinIcon size={16} />
              <span className="font-semibold tabular-nums text-[var(--color-text)]">
                {confirm.price}
              </span>
              <span className="text-[var(--color-muted3)]">· у тебе {coins}</span>
            </div>
            {coins < confirm.price ? (
              <p className="text-[13px] text-[var(--color-red)]">
                Не вистачає {confirm.price - coins} монет
              </p>
            ) : null}
            <button
              className="btn btn-primary btn-block"
              disabled={coins < confirm.price || buy.isPending}
              onClick={() => onBuy(confirm)}
            >
              {buy.isPending ? "Купуємо…" : `Купити за ${confirm.price}`}
            </button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function SkinSection({
  title,
  skins,
  coins,
  onEquip,
  onBuy,
  equipping,
}: {
  title: string;
  skins: ShopSkin[];
  coins: number;
  onEquip: (s: ShopSkin) => void;
  onBuy: (s: ShopSkin) => void;
  equipping: string | null | undefined;
}) {
  if (skins.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <span className="lbl">{title}</span>
      <div className="grid grid-cols-2 gap-3">
        {skins.map((s) => (
          <SkinCard
            key={s.id}
            skin={s}
            coins={coins}
            onEquip={onEquip}
            onBuy={onBuy}
            equipping={equipping === s.id}
          />
        ))}
      </div>
    </section>
  );
}

function SkinGlow({
  rarity,
  children,
}: {
  rarity: ShopSkin["rarity"];
  children: React.ReactNode;
}) {
  const r = RARITY[rarity] ?? RARITY.common;
  return (
    <div
      className="rounded-[var(--radius-pill)] p-0.5"
      style={{ boxShadow: `0 0 18px ${r.glow}`, outline: `2px solid ${r.color}` }}
    >
      {children}
    </div>
  );
}

function SkinCard({
  skin,
  coins,
  onEquip,
  onBuy,
  equipping,
}: {
  skin: ShopSkin;
  coins: number;
  onEquip: (s: ShopSkin) => void;
  onBuy: (s: ShopSkin) => void;
  equipping: boolean;
}) {
  const r = RARITY[skin.rarity] ?? RARITY.common;
  const locked = skin.tier === "premium" && !skin.owned;

  return (
    <div
      className="mcard relative flex flex-col items-center gap-2 p-3"
      style={{ boxShadow: `inset 0 0 0 1.5px ${r.color}, 0 0 14px ${r.glow}` }}
    >
      <div className="relative">
        <PresetMascot
          id={skin.id}
          size={60}
          animated={skin.equipped}
          artKind={skin.artKind as "file" | "inline" | "builtin" | undefined}
          nameUk={skin.nameUk}
        />
        {locked ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
            <Lock size={20} className="text-white" />
          </div>
        ) : null}
      </div>

      <div className="text-center">
        <div className="text-[14px] font-semibold text-[var(--color-text)]">{skin.nameUk}</div>
        <div className="text-[11px]" style={{ color: r.color }}>
          {r.label}
        </div>
      </div>

      {skin.equipped ? (
        <div className="flex items-center gap-1 text-[13px] font-semibold text-[var(--color-accent)]">
          <Check size={14} /> Вдягнено
        </div>
      ) : skin.owned ? (
        <button
          className="btn btn-ghost w-full py-2 text-[13px]"
          disabled={equipping}
          onClick={() => onEquip(skin)}
        >
          {equipping ? "…" : "Вдягнути"}
        </button>
      ) : (
        <button
          className={cn(
            "btn btn-primary flex w-full items-center justify-center gap-1 py-2 text-[13px]",
            coins < skin.price && "opacity-60",
          )}
          onClick={() => onBuy(skin)}
        >
          <CoinIcon size={14} /> {skin.price}
        </button>
      )}
    </div>
  );
}
