import { prisma } from "@/lib/prisma";
import { PRESET_PREFIX } from "@/lib/avatar-presets";
import { ensureSkinCatalog, listSkins } from "@/lib/skin-catalog";
import type { ShopResponse, ShopSkin } from "@/lib/types";

/** Каталог скінів для користувача: баланс + owned/equipped. */
export async function buildShop(userId: string): Promise<ShopResponse | null> {
  await ensureSkinCatalog();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      coins: true,
      avatarUrl: true,
      skins: { select: { skinId: true } },
    },
  });
  if (!user) return null;

  const owned = new Set(user.skins.map((s) => s.skinId));
  const equippedId = user.avatarUrl?.startsWith(PRESET_PREFIX)
    ? user.avatarUrl.slice(PRESET_PREFIX.length)
    : null;

  const catalog = await listSkins({ enabledOnly: true });
  const skins: ShopSkin[] = catalog.map((p) => ({
    id: p.id,
    nameUk: p.nameUk,
    tier: p.tier,
    price: p.price,
    rarity: p.rarity,
    artKind: p.artKind,
    owned: p.tier === "free" || owned.has(p.id),
    equipped: equippedId === p.id,
  }));

  return {
    coins: user.coins,
    skins,
    ownedSkinIds: [...owned],
  };
}
