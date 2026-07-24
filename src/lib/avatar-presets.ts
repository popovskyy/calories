/** Локальна бібліотека анімованих аватарів (як у Duolingo). */

export const PRESET_PREFIX = "preset:" as const;

export type AvatarPresetId =
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

export interface AvatarPreset {
  id: AvatarPresetId;
  nameUk: string;
  /** Фон кола під персонажем */
  bg: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "kiwi", nameUk: "Ківі", bg: "#58CC02" },
  { id: "fox", nameUk: "Лис", bg: "#FF9600" },
  { id: "cat", nameUk: "Кіт", bg: "#CE82FF" },
  { id: "bear", nameUk: "Ведмідь", bg: "#D4A574" },
  { id: "panda", nameUk: "Панда", bg: "#4B4B4B" },
  { id: "bunny", nameUk: "Зайчик", bg: "#FF86D0" },
  { id: "frog", nameUk: "Жабка", bg: "#78C800" },
  { id: "penguin", nameUk: "Пінгвін", bg: "#1CB0F6" },
  { id: "chick", nameUk: "Курча", bg: "#FFC800" },
  { id: "raccoon", nameUk: "Єнот", bg: "#AFAFAF" },
];

export function toPresetUrl(id: AvatarPresetId): string {
  return `${PRESET_PREFIX}${id}`;
}

export function parsePresetId(
  avatarUrl: string | null | undefined,
): AvatarPresetId | null {
  if (!avatarUrl?.startsWith(PRESET_PREFIX)) return null;
  const id = avatarUrl.slice(PRESET_PREFIX.length) as AvatarPresetId;
  return AVATAR_PRESETS.some((p) => p.id === id) ? id : null;
}

export function isPresetAvatar(avatarUrl: string | null | undefined): boolean {
  return parsePresetId(avatarUrl) !== null;
}

export function getPreset(
  id: AvatarPresetId | null | undefined,
): AvatarPreset | undefined {
  if (!id) return undefined;
  return AVATAR_PRESETS.find((p) => p.id === id);
}
