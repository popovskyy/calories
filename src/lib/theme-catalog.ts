/** Каталог тем оформлення. Усі три — безкоштовні, перемикач у профілі. */

export const DEFAULT_THEME = "nocturne";

export type ThemeId = "nocturne" | "minecraft" | "forest";

export interface ThemeDef {
  id: ThemeId;
  nameUk: string;
  swatch: string;
  vibe: string;
  tier: "free";
}

export const THEMES: ThemeDef[] = [
  {
    id: "nocturne",
    nameUk: "Нічне",
    swatch: "#9184d9",
    vibe: "кільце · ніч · спокій",
    tier: "free",
  },
  {
    id: "minecraft",
    nameUk: "Minecraft",
    swatch: "#5b9c3a",
    vibe: "блоки · XP · creeper",
    tier: "free",
  },
  {
    id: "forest",
    nameUk: "99 ночей у лісі",
    swatch: "#ff8a3d",
    vibe: "вогнище · олені · ніч",
    tier: "free",
  },
];

export function isThemeId(id: string): id is ThemeId {
  return THEMES.some((t) => t.id === id);
}

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}
