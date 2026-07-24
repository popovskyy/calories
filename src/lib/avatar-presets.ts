/** Типи, дефолтний каталог і хелпери preset-аватарів. Ціни/каталог у рантаймі — з SkinDef (БД). */

export const PRESET_PREFIX = "preset:" as const;

/** Валідний slug скіна */
export const SKIN_ID_RE = /^[a-z][a-z0-9_]{0,31}$/;

export type SkinTier = "free" | "premium";
export type Rarity = "common" | "rare" | "epic" | "legendary";
export type SkinArtKind = "builtin" | "file" | "inline";

/** Історичний union для безкоштовних builtin-малюнків у PresetMascot. */
export type BuiltinMascotId =
  | "kiwi"
  | "fox"
  | "cat"
  | "bear"
  | "panda"
  | "bunny"
  | "frog"
  | "penguin"
  | "chick"
  | "raccoon";

/** @deprecated використовуйте string skin id; залишено для сумісності типів */
export type AvatarPresetId = string;

export interface AvatarPreset {
  id: string;
  nameUk: string;
  bg: string;
  tier: SkinTier;
  price: number;
  rarity: Rarity;
  artKind: SkinArtKind;
  enabled?: boolean;
  sortOrder?: number;
  svg?: string | null;
}

/** Дефолти для seed / ensureSkinCatalog (адмін може змінити price/name після upsert create). */
export const DEFAULT_SKINS: AvatarPreset[] = [
  { id: "kiwi", nameUk: "Ківі", bg: "#58CC02", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 10 },
  { id: "fox", nameUk: "Лис", bg: "#FF9600", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 20 },
  { id: "cat", nameUk: "Кіт", bg: "#CE82FF", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 30 },
  { id: "bear", nameUk: "Ведмідь", bg: "#D4A574", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 40 },
  { id: "panda", nameUk: "Панда", bg: "#4B4B4B", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 50 },
  { id: "bunny", nameUk: "Зайчик", bg: "#FF86D0", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 60 },
  { id: "frog", nameUk: "Жабка", bg: "#78C800", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 70 },
  { id: "penguin", nameUk: "Пінгвін", bg: "#1CB0F6", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 80 },
  { id: "chick", nameUk: "Курча", bg: "#FFC800", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 90 },
  { id: "raccoon", nameUk: "Єнот", bg: "#AFAFAF", tier: "free", price: 0, rarity: "common", artKind: "builtin", sortOrder: 100 },
  { id: "ronaldo", nameUk: "Cristiano Ronaldo", bg: "#046A38", tier: "premium", price: 450, rarity: "epic", artKind: "file", sortOrder: 300 },
  { id: "messi", nameUk: "Lionel Messi", bg: "#74C0FC", tier: "premium", price: 450, rarity: "epic", artKind: "file", sortOrder: 310 },
  { id: "yamal", nameUk: "Lamine Yamal", bg: "#C60B1E", tier: "premium", price: 400, rarity: "epic", artKind: "file", sortOrder: 320 },
  { id: "mcgregor", nameUk: "Conor McGregor", bg: "#2F9E44", tier: "premium", price: 500, rarity: "epic", artKind: "file", sortOrder: 330 },
  { id: "usyk", nameUk: "Oleksandr Usyk", bg: "#4DABF7", tier: "premium", price: 500, rarity: "epic", artKind: "file", sortOrder: 340 },
  { id: "tyson", nameUk: "Mike Tyson", bg: "#495057", tier: "premium", price: 550, rarity: "legendary", artKind: "file", sortOrder: 345 },
  { id: "deer", nameUk: "99 ночей в лесу", bg: "#3D2B1F", tier: "premium", price: 350, rarity: "epic", artKind: "file", sortOrder: 350 },
  { id: "potter", nameUk: "Harry Potter", bg: "#1A1A40", tier: "premium", price: 400, rarity: "epic", artKind: "file", sortOrder: 360 },
];

/** Синхронний фолбек (реєстрація / SSR до ensure). */
export const AVATAR_PRESETS = DEFAULT_SKINS;

export const BUILTIN_MASCOT_IDS = new Set<string>([
  "kiwi", "fox", "cat", "bear", "panda", "bunny", "frog", "penguin", "chick", "raccoon",
]);

export interface RarityStyle {
  label: string;
  color: string;
  glow: string;
}

export const RARITY: Record<Rarity, RarityStyle> = {
  common: { label: "Звичайний", color: "var(--color-divider)", glow: "transparent" },
  rare: { label: "Рідкісний", color: "#1CB0F6", glow: "rgba(28,176,246,0.45)" },
  epic: { label: "Епічний", color: "#b5abfc", glow: "rgba(181,171,252,0.5)" },
  legendary: { label: "Легендарний", color: "#FFC800", glow: "rgba(255,200,0,0.5)" },
};

export function rarityStyle(rarity: Rarity): RarityStyle {
  return RARITY[rarity];
}

export function toPresetUrl(id: string): string {
  return `${PRESET_PREFIX}${id}`;
}

export function parsePresetId(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl?.startsWith(PRESET_PREFIX)) return null;
  const id = avatarUrl.slice(PRESET_PREFIX.length);
  return SKIN_ID_RE.test(id) ? id : null;
}

export function isPresetAvatar(avatarUrl: string | null | undefined): boolean {
  return parsePresetId(avatarUrl) !== null;
}

export function getPreset(id: string | null | undefined): AvatarPreset | undefined {
  if (!id) return undefined;
  return DEFAULT_SKINS.find((p) => p.id === id);
}

/** Синхронний lookup у дефолтах (без БД). Для API — listSkins/getSkinDef. */
export function getSkin(id: string): AvatarPreset | undefined {
  return DEFAULT_SKINS.find((p) => p.id === id);
}

/** URL картинки: file → /mascots; inline → API; builtin → null. */
export function mascotAssetPath(
  id: string,
  artKind: SkinArtKind = BUILTIN_MASCOT_IDS.has(id) ? "builtin" : "file",
): string | null {
  if (artKind === "builtin") return null;
  if (artKind === "inline") return `/api/skins/${id}/svg`;
  return `/mascots/${id}.svg`;
}

export const FREE_SKINS = DEFAULT_SKINS.filter((p) => p.tier === "free");
export const PREMIUM_SKINS = DEFAULT_SKINS.filter((p) => p.tier === "premium");
