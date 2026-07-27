import { prisma } from "@/lib/prisma";
import { PRESET_PREFIX } from "@/lib/avatar-presets";
import { ensureSkinCatalog, listSkins } from "@/lib/skin-catalog";
import { THEMES } from "@/lib/theme-catalog";
import { ITEMS } from "@/lib/items";
import {
  ALL_COSMETICS,
  isDefaultCosmetic,
  isEarned,
  unlockHint,
  type CosmeticKind,
} from "@/lib/cosmetics";
import { getWeeklyStock, stallPurchaseKey } from "@/lib/shop-rotation";
import { completedEpicIds } from "@/lib/epic-progress";
import { countInTargetDays } from "@/lib/streak";
import { computeEvolutionStage } from "@/lib/economy";
import { fromYMD, shiftYMD, weekStartYMD } from "@/lib/date";
import type {
  ShopCosmetic,
  ShopItem,
  ShopResponse,
  ShopSkin,
  ShopStallSlot,
  ShopTheme,
} from "@/lib/types";

/** Наступний понеділок 00:00 за київським часом — таймер оновлення прилавка. */
function stallResetsAt(): string {
  const nextMonday = shiftYMD(weekStartYMD(), 7);
  // fromYMD дає UTC-північ; Київ улітку UTC+3, узимку UTC+2. Беремо +2,
  // щоб таймер ніколи не показував «оновилось» раніше за факт.
  const d = fromYMD(nextMonday);
  d.setUTCHours(d.getUTCHours() - 2);
  return d.toISOString();
}

/** Каталог скінів, тем, спорядження й косметики: баланс + owned/equipped. */
export async function buildShop(userId: string): Promise<ShopResponse | null> {
  await ensureSkinCatalog();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coins: true,
      avatarUrl: true,
      theme: true,
      finisher: true,
      title: true,
      frame: true,
      soundpack: true,
      maxStreak: true,
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
      items: { select: { itemId: true, qty: true } },
      cosmetics: { select: { kind: true, cosmeticId: true } },
    },
  });
  if (!user) return null;

  const [catalog, inTargetDays, doneEpics] = await Promise.all([
    listSkins({ enabledOnly: true }),
    countInTargetDays(userId),
    completedEpicIds(userId),
  ]);

  const ownedSkins = new Set(user.skins.map((s) => s.skinId));
  const ownedThemes = new Set(user.themes.map((t) => t.themeId));
  const ownedCosmetics = new Set(
    user.cosmetics.map((c) => `${c.kind}:${c.cosmeticId}`),
  );
  const qtyOf = new Map(user.items.map((i) => [i.itemId, i.qty]));

  const equippedSkinId = user.avatarUrl?.startsWith(PRESET_PREFIX)
    ? user.avatarUrl.slice(PRESET_PREFIX.length)
    : null;
  const equippedThemeId = user.theme ?? "nocturne";

  const skins: ShopSkin[] = catalog.map((p) => ({
    id: p.id,
    nameUk: p.nameUk,
    tier: p.tier,
    price: p.price,
    rarity: p.rarity,
    artKind: p.artKind,
    owned: p.tier === "free" || ownedSkins.has(p.id),
    equipped: equippedSkinId === p.id,
  }));

  const themes: ShopTheme[] = THEMES.map((t) => ({
    id: t.id,
    nameUk: t.nameUk,
    tier: t.tier,
    price: t.price,
    swatch: t.swatch,
    vibe: t.vibe,
    fontLabel: t.fontLabel,
    previewBg: t.previewBg,
    previewAccent: t.previewAccent,
    comingSoon: t.comingSoon,
    owned: t.comingSoon
      ? false
      : t.tier === "free" || ownedThemes.has(t.id),
    equipped: !t.comingSoon && equippedThemeId === t.id,
  }));

  const items: ShopItem[] = ITEMS.map((i) => {
    const qty = qtyOf.get(i.id) ?? 0;
    return {
      id: i.id,
      nameUk: i.nameUk,
      description: i.description,
      price: i.price,
      icon: i.icon,
      qty,
      maxStack: i.maxStack,
      passive: i.passive,
      full: i.maxStack !== null && qty >= i.maxStack,
    };
  });

  const ctx = {
    maxStreak: user.maxStreak,
    inTargetDays,
    completedEpicIds: doneEpics,
  };

  const equippedOf: Record<CosmeticKind, string | null> = {
    finisher: user.finisher,
    title: user.title,
    frame: user.frame,
    soundpack: user.soundpack,
  };

  const cosmetics: ShopCosmetic[] = ALL_COSMETICS.map((c) => {
    const earnedOnly = c.unlock.via !== "shop";
    const owned =
      isDefaultCosmetic(c) ||
      ownedCosmetics.has(`${c.kind}:${c.id}`) ||
      (earnedOnly && isEarned(c, ctx));
    return {
      id: c.id,
      kind: c.kind,
      nameUk: c.nameUk,
      description: c.description,
      price: c.unlock.via === "shop" ? c.unlock.price : 0,
      swatch: c.swatch,
      owned,
      equipped: equippedOf[c.kind] === c.id,
      earnedOnly,
      // Підказка потрібна лише поки річ заблокована — відкриту вона лише шумить.
      hint: earnedOnly && !owned ? unlockHint(c, ctx) : null,
    };
  });

  const weekStart = weekStartYMD();
  const stock = getWeeklyStock(weekStart);
  const stallKeys = stock.map((s) => stallPurchaseKey(weekStart, s.kind, s.refId));
  const stallClaims = await prisma.rewardClaim.findMany({
    where: { userId, key: { in: stallKeys } },
    select: { key: true },
  });
  const boughtKeys = new Set(stallClaims.map((c) => c.key));

  const stall: ShopStallSlot[] = stock.map((s) => {
    const claimBought = boughtKeys.has(
      stallPurchaseKey(weekStart, s.kind, s.refId),
    );
    const cosmeticOwned =
      s.kind === "cosmetic" &&
      !!s.cosmeticKind &&
      ownedCosmetics.has(`${s.cosmeticKind}:${s.refId}`);
    return { ...s, bought: claimBought || cosmeticOwned };
  });

  return {
    coins: user.coins,
    skins,
    ownedSkinIds: [...ownedSkins],
    themes,
    ownedThemeIds: [...ownedThemes],
    items,
    cosmetics,
    stall,
    stallResetsAt: stallResetsAt(),
    evolutionStage: computeEvolutionStage(inTargetDays, user.maxStreak),
    maxStreak: user.maxStreak,
    inTargetDays,
  };
}
