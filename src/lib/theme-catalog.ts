/** Каталог тем оформлення. */

export const DEFAULT_THEME = "nocturne";

export interface ThemeDef {
  id: string;
  nameUk: string;
  tier: "free" | "premium";
  price: number;
  /** CSS-колір для свотча в магазині. */
  swatch: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: "nocturne",
    nameUk: "Нічне (Nocturne)",
    tier: "free",
    price: 0,
    swatch: "#9184d9",
  },
  {
    id: "minecraft",
    nameUk: "Minecraft",
    tier: "premium",
    price: 300,
    swatch: "#5B8731",
  },
];

export function isThemeId(id: string): id is string {
  return THEMES.some((t) => t.id === id);
}

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}
