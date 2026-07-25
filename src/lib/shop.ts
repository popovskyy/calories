import { prisma } from "@/lib/prisma";
import { PRESET_PREFIX } from "@/lib/avatar-presets";
import { ensureSkinCatalog, listSkins } from "@/lib/skin-catalog";
import { THEMES } from "@/lib/theme-catalog";
import type { ShopResponse, ShopSkin, ShopTheme } from "@/lib/types";

/** Каталог скінів та тем для користувача: баланс + owned/equipped. */
export async function buildShop(userId: string): Promise<ShopResponse | null> {
  await ensureSkinCatalog();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coins: true,
      avatarUrl: true,
      theme: true,
      skins: { select: { skinId: true } },
      themes: { select: { themeId: true } },
    },
  });
  if (!user) return null;

  const ownedSkins = new Set(user.skins.map((s) => s.skinId));
  const ownedThemes = new Set(user.themes.map((t) => t.themeId));
  const equippedSkinId = user.avatarUrl?.startsWith(PRESET_PREFIX)
    ? user.avatarUrl.slice(PRESET_PREFIX.length)
    : null;
  const equippedThemeId = user.theme ?? "nocturne";

  const catalog = await listSkins({ enabledOnly: true });
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
    owned: t.tier === "free" || ownedThemes.has(t.id),
    equipped: equippedThemeId === t.id,
  }));

  return {
    coins: user.coins,
    skins,
    ownedSkinIds: [...ownedSkins],
    themes,
    ownedThemeIds: [...ownedThemes],
  };
}
