"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { PresetMascot } from "@/components/avatars/PresetMascot";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Modal } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { StallSection } from "@/components/shop/StallSection";
import { GearSection } from "@/components/shop/GearSection";
import { CosmeticsSection } from "@/components/shop/CosmeticsSection";
import { EvolutionSection } from "@/components/shop/EvolutionSection";
import { WalletSection } from "@/components/shop/WalletSection";
import {
  useBuySkin,
  useBuyTheme,
  useCurrentUser,
  useEquipSkin,
  useEquipTheme,
  useShop,
} from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { requestThemeEquipFlash } from "@/components/ThemeEquipFlash";
import { RARITY } from "@/lib/avatar-presets";
import type { ShopSkin, ShopTheme } from "@/lib/types";
import { cn } from "@/lib/cn";

type ConfirmItem =
  | { kind: "skin"; item: ShopSkin }
  | { kind: "theme"; item: ShopTheme };

type Tab = "look" | "stall" | "rest";

/**
 * Три входи замість шести: менше рішень на вході (Hick).
 * Вигляд = скіни/теми/косметика; Прилавок = бокси+спорядження; Майстерня = еволюція+гаманець.
 */
const TABS: { id: Tab; label: string }[] = [
  { id: "look", label: "Вигляд" },
  { id: "stall", label: "Прилавок" },
  { id: "rest", label: "Майстерня" },
];

export default function ShopPage() {
  const mounted = useMounted();
  const { user } = useCurrentUser();
  const shop = useShop();
  const buySkin = useBuySkin();
  const equipSkin = useEquipSkin();
  const buyTheme = useBuyTheme();
  const equipTheme = useEquipTheme();
  const [confirm, setConfirm] = useState<ConfirmItem | null>(null);
  const [tab, setTab] = useState<Tab>("look");

  const coins = user?.coins ?? shop.data?.coins ?? 0;
  const skins = shop.data?.skins ?? [];
  const themes = shop.data?.themes ?? [];
  const premium = skins.filter((s) => s.tier === "premium");
  const free = skins.filter((s) => s.tier === "free");
  const freeThemes = themes.filter((t) => t.tier === "free");
  const premiumThemes = themes.filter((t) => t.tier === "premium");

  const onEquipSkin = (s: ShopSkin) =>
    equipSkin.mutate(s.id, {
      onSuccess: () => toast.success(`Вдягнено: ${s.nameUk}`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
    });

  const onBuySkin = (s: ShopSkin) =>
    buySkin.mutate(s.id, {
      onSuccess: () => {
        setConfirm(null);
        toast.success(`Куплено: ${s.nameUk}!`);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка купівлі"),
    });

  const onEquipTheme = (t: ShopTheme) =>
    equipTheme.mutate(t.id, {
      onSuccess: () => {
        requestThemeEquipFlash(t.id);
        toast.success(`Тему змінено: ${t.nameUk}`);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
    });

  const onBuyTheme = (t: ShopTheme) => {
    if (t.comingSoon) return;
    buyTheme.mutate(t.id, {
      onSuccess: () => {
        setConfirm(null);
        toast.success(`Куплено тему: ${t.nameUk}!`);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка купівлі"),
    });
  };
  const isPending = buySkin.isPending || buyTheme.isPending;

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="page-title">Крамниця</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-[var(--radius-pill)] border border-[color-mix(in_srgb,#FFC800_45%,transparent)] bg-[color-mix(in_srgb,#FFC800_12%,transparent)] px-2.5 py-1.5">
          <CoinIcon size={16} />
          <span className="text-[14px] font-semibold tabular-nums text-[var(--color-text)]">
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
      ) : shop.data ? (
        <>
          {/*
            Вкладки переносяться, а не прокручуються: за горизонтальним
            скролом половина розділів була невидима, і магазин здавався
            порожнім — саме так загубились скіни й теми.
          */}
          <nav className="grid grid-cols-3 gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "btn-sm min-h-10 rounded-[var(--radius-pill)] border px-3 font-semibold transition-colors",
                  tab === t.id
                    ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-text)]"
                    : "border-[var(--color-divider)] text-[var(--color-muted3)]",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "stall" ? (
            <>
              <StallSection shop={shop.data} />
              <GearSection shop={shop.data} />
            </>
          ) : null}
          {tab === "rest" ? (
            <>
              <EvolutionSection shop={shop.data} user={user} />
              <WalletSection />
            </>
          ) : null}

          {tab === "look" ? (
            <>
              {themes.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <span className="lbl">Теми оформлення</span>
                  <div className="grid grid-cols-2 gap-3">
                    {[...freeThemes, ...premiumThemes].map((t) => (
                      <ThemeCard
                        key={t.id}
                        theme={t}
                        coins={coins}
                        onEquip={onEquipTheme}
                        onBuy={(th) => setConfirm({ kind: "theme", item: th })}
                        equipping={equipTheme.isPending && equipTheme.variables === t.id}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <SkinSection
                title="Преміум"
                skins={premium}
                coins={coins}
                onEquip={onEquipSkin}
                onBuy={(s) => setConfirm({ kind: "skin", item: s })}
                equipping={equipSkin.isPending ? equipSkin.variables : null}
              />
              <SkinSection
                title="Безкоштовні"
                skins={free}
                coins={coins}
                onEquip={onEquipSkin}
                onBuy={() => {}}
                equipping={equipSkin.isPending ? equipSkin.variables : null}
              />
              <CosmeticsSection shop={shop.data} />
            </>
          ) : null}
        </>
      ) : null}

      {/* Confirm modal */}
      <Modal
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "theme" ? "Купити тему?" : "Купити скін?"}
      >
        {confirm?.kind === "theme" ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-16 w-16 rounded-[var(--radius-md)] border-2 border-[var(--color-divider)]"
              style={{ background: confirm.item.swatch }}
            />
            <div className="text-center">
              <div className="text-[17px] font-semibold text-[var(--color-text)]">
                {confirm.item.nameUk}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[15px]">
              <span className="text-[var(--color-muted3)]">Ціна:</span>
              <CoinIcon size={16} />
              <span className="font-semibold tabular-nums text-[var(--color-text)]">
                {confirm.item.price}
              </span>
              <span className="text-[var(--color-muted3)]">· у тебе {coins}</span>
            </div>
            {coins < confirm.item.price ? (
              <p className="text-[13px] text-[var(--color-red)]">
                Не вистачає {confirm.item.price - coins} монет
              </p>
            ) : null}
            <button
              className="btn btn-primary btn-block"
              disabled={coins < confirm.item.price || isPending}
              onClick={() => onBuyTheme(confirm.item)}
            >
              {isPending ? "Купуємо…" : `Купити за ${confirm.item.price}`}
            </button>
          </div>
        ) : confirm?.kind === "skin" ? (
          <div className="flex flex-col items-center gap-3">
            <SkinGlow rarity={confirm.item.rarity}>
              <PresetMascot
                id={confirm.item.id}
                size={72}
                animated
                artKind={confirm.item.artKind as "file" | "inline" | "builtin" | undefined}
                nameUk={confirm.item.nameUk}
              />
            </SkinGlow>
            <div className="text-center">
              <div className="text-[17px] font-semibold text-[var(--color-text)]">
                {confirm.item.nameUk}
              </div>
              <div
                className="text-[13px]"
                style={{ color: (RARITY[confirm.item.rarity] ?? RARITY.common).color }}
              >
                {(RARITY[confirm.item.rarity] ?? RARITY.common).label}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[15px]">
              <span className="text-[var(--color-muted3)]">Ціна:</span>
              <CoinIcon size={16} />
              <span className="font-semibold tabular-nums text-[var(--color-text)]">
                {confirm.item.price}
              </span>
              <span className="text-[var(--color-muted3)]">· у тебе {coins}</span>
            </div>
            {coins < confirm.item.price ? (
              <p className="text-[13px] text-[var(--color-red)]">
                Не вистачає {confirm.item.price - coins} монет
              </p>
            ) : null}
            <button
              className="btn btn-primary btn-block"
              disabled={coins < confirm.item.price || isPending}
              onClick={() => onBuySkin(confirm.item)}
            >
              {isPending ? "Купуємо…" : `Купити за ${confirm.item.price}`}
            </button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function ThemeCard({
  theme,
  coins,
  onEquip,
  onBuy,
  equipping,
}: {
  theme: ShopTheme;
  coins: number;
  onEquip: (t: ShopTheme) => void;
  onBuy: (t: ShopTheme) => void;
  equipping: boolean;
}) {
  const locked = theme.tier === "premium" && !theme.owned;
  const soon = !!theme.comingSoon;

  return (
    <div
      className="mcard relative flex flex-col items-center gap-2 overflow-hidden p-3"
      style={{ boxShadow: `inset 0 0 0 1.5px ${theme.swatch}55, 0 0 10px ${theme.swatch}22` }}
    >
      <div
        className="relative h-14 w-full overflow-hidden rounded-[var(--radius-md)]"
        style={{ background: theme.previewBg }}
      >
        <div
          className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 rounded-sm px-1.5 py-1"
          style={{ background: "rgba(0,0,0,.35)" }}
        >
          <span
            className="truncate text-[10px] font-semibold text-white"
            style={{ color: theme.previewAccent }}
          >
            Aa · {theme.fontLabel}
          </span>
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: theme.previewAccent, boxShadow: `0 0 8px ${theme.previewAccent}` }}
          />
        </div>
        {soon ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45">
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white">
              скоро
            </span>
          </div>
        ) : locked ? (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-black/45 p-1">
            <Lock size={12} className="text-white" />
          </div>
        ) : theme.equipped ? (
          <div className="absolute right-1.5 top-1.5 rounded-full bg-black/45 p-1">
            <Check size={12} className="text-white" />
          </div>
        ) : null}
      </div>

      <div className="text-center">
        <div className="text-[13px] font-semibold text-[var(--color-text)]">{theme.nameUk}</div>
        <div className="mt-0.5 text-[11px] leading-tight text-[var(--color-muted3)]">
          {theme.vibe}
        </div>
        <div className="mt-0.5 text-[11px]" style={{ color: theme.swatch }}>
          {soon ? "Скоро" : theme.tier === "free" ? "Безкоштовна" : "Преміум"}
        </div>
      </div>

      {soon ? (
        <div className="btn btn-ghost btn-sm pointer-events-none w-full cursor-default opacity-70">
          Скоро
        </div>
      ) : theme.equipped ? (
        <div className="btn btn-primary btn-sm pointer-events-none w-full cursor-default">
          <Check size={14} strokeWidth={2.5} /> Активна
        </div>
      ) : theme.owned ? (
        <button
          className="btn btn-sm w-full border-2 border-[var(--color-accent-400)] bg-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-tile))] font-bold text-[var(--color-accent-100)]"
          disabled={equipping}
          onClick={() => onEquip(theme)}
        >
          {equipping ? "…" : "Активувати"}
        </button>
      ) : (
        <button
          className={cn(
            "btn btn-primary btn-sm flex w-full items-center justify-center gap-1",
            coins < theme.price && "opacity-60",
          )}
          onClick={() => onBuy(theme)}
        >
          <CoinIcon size={14} /> {theme.price}
        </button>
      )}
    </div>
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
        <div className="btn btn-primary btn-sm pointer-events-none w-full cursor-default">
          <Check size={14} strokeWidth={2.5} /> Вдягнено
        </div>
      ) : skin.owned ? (
        <button
          className="btn btn-sm w-full border-2 border-[var(--color-accent-400)] bg-[color-mix(in_srgb,var(--color-accent)_22%,var(--color-tile))] font-bold text-[var(--color-accent-100)]"
          disabled={equipping}
          onClick={() => onEquip(skin)}
        >
          {equipping ? "…" : "Вдягнути"}
        </button>
      ) : (
        <button
          className={cn(
            "btn btn-primary btn-sm flex w-full items-center justify-center gap-1",
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
