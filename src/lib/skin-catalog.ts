import type { SkinDef } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SKINS,
  type AvatarPreset,
  type Rarity,
  type SkinArtKind,
  type SkinTier,
} from "@/lib/avatar-presets";

function toPreset(row: SkinDef): AvatarPreset {
  return {
    id: row.id,
    nameUk: row.nameUk,
    bg: row.bg,
    tier: row.tier as SkinTier,
    price: row.price,
    rarity: row.rarity as Rarity,
    artKind: row.artKind as SkinArtKind,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    svg: row.svg,
  };
}

let ensuring: Promise<void> | null = null;

/**
 * Гарантує наявність дефолтних скінів у БД.
 * Не перетирає price/name/enabled, які міг змінити адмін — лише create відсутніх.
 */
export async function ensureSkinCatalog(): Promise<void> {
  if (ensuring) return ensuring;
  ensuring = (async () => {
    const existing = await prisma.skinDef.findMany({ select: { id: true } });
    const have = new Set(existing.map((e) => e.id));
    const missing = DEFAULT_SKINS.filter((s) => !have.has(s.id));
    if (missing.length === 0) return;
    await prisma.skinDef.createMany({
      data: missing.map((s) => ({
        id: s.id,
        nameUk: s.nameUk,
        tier: s.tier,
        price: s.price,
        rarity: s.rarity,
        bg: s.bg,
        enabled: s.enabled ?? true,
        sortOrder: s.sortOrder ?? 0,
        artKind: s.artKind,
        svg: s.svg ?? null,
      })),
      skipDuplicates: true,
    });
  })().finally(() => {
    ensuring = null;
  });
  return ensuring;
}

export async function listSkins(opts?: {
  enabledOnly?: boolean;
}): Promise<AvatarPreset[]> {
  await ensureSkinCatalog();
  const rows = await prisma.skinDef.findMany({
    where: opts?.enabledOnly ? { enabled: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows.map(toPreset);
}

export async function getSkinDef(id: string): Promise<AvatarPreset | null> {
  await ensureSkinCatalog();
  const row = await prisma.skinDef.findUnique({ where: { id } });
  return row ? toPreset(row) : null;
}

/**
 * Чи може юзер ставити цей avatarUrl.
 * AI/data-URL — ок; preset:premium — лише якщо є UserSkin (або free).
 */
export async function assertAvatarAllowed(
  userId: string | null,
  avatarUrl: string | null | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (avatarUrl == null || avatarUrl === "") return { ok: true };
  if (!avatarUrl.startsWith("preset:")) return { ok: true };

  const id = avatarUrl.slice("preset:".length);
  const skin = await getSkinDef(id);
  if (!skin || !skin.enabled) {
    return { ok: false, error: "Скін недоступний" };
  }
  if (skin.tier === "free") return { ok: true };
  if (!userId) {
    return { ok: false, error: "Преміум-скін лише після купівлі" };
  }
  const owned = await prisma.userSkin.findUnique({
    where: { userId_skinId: { userId, skinId: id } },
  });
  if (!owned) {
    return { ok: false, error: "Спершу купіть скін у магазині" };
  }
  return { ok: true };
}
