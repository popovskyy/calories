/** Каталог тем оформлення. */

export const DEFAULT_THEME = "nocturne";

export interface ThemeDef {
  id: string;
  nameUk: string;
  tier: "free" | "premium";
  price: number;
  /** CSS-колір для свотча в магазині. */
  swatch: string;
  /** Короткий vibe для картки магазину. */
  vibe: string;
  /** Фон міні-прев’ю (CSS). */
  previewBg: string;
  /** Акцент у прев’ю. */
  previewAccent: string;
  /**
   * Тизер у каталозі — показуємо «скоро», не продаємо.
   * Не додавати в isThemeId як активну тему користувача.
   */
  comingSoon?: boolean;
}

export const THEMES: ThemeDef[] = [
  {
    id: "nocturne",
    nameUk: "Нічне (Nocturne)",
    tier: "free",
    price: 0,
    swatch: "#9184d9",
    vibe: "кільце · ніч · спокій",
    previewBg: "linear-gradient(160deg, #161826 0%, #1e2140 55%, #2a2450 100%)",
    previewAccent: "#9184d9",
  },
  {
    // 300 ≈ тиждень гри для дисциплінованого гравця — тема має бути метою,
    // а не випадковою покупкою на другий день.
    id: "minecraft",
    nameUk: "Minecraft",
    tier: "premium",
    price: 300,
    swatch: "#5b9c3a",
    vibe: "блоки · XP · creeper",
    previewBg: "linear-gradient(160deg, #1a1a1e 0%, #25252a 50%, #2f4a22 100%)",
    previewAccent: "#80ff20",
  },
  {
    id: "forest",
    nameUk: "99 ночей у лісі",
    tier: "premium",
    price: 500,
    swatch: "#ff8a3d",
    vibe: "вогнище · олені · ніч",
    previewBg: "linear-gradient(160deg, #08120e 0%, #0f1f18 45%, #2a1810 100%)",
    previewAccent: "#ff8a3d",
  },
  {
    id: "lighthouse",
    nameUk: "Маяк",
    tier: "premium",
    price: 420,
    swatch: "#ffb35c",
    vibe: "промінь · сіль · ніч",
    previewBg: "linear-gradient(160deg, #0e141c 0%, #15202c 50%, #1a2838 100%)",
    previewAccent: "#ffb35c",
  },
  {
    // Ціна виставлена ще до релізу: buy-роут перевіряє лише tier, тож
    // premium-тема з price 0 роздавалася б безкоштовно, щойно зникне comingSoon.
    id: "polonyna",
    nameUk: "Полонина",
    tier: "premium",
    price: 460,
    swatch: "#f0d9a0",
    vibe: "світанок · сосна · іній",
    previewBg: "linear-gradient(160deg, #1a2430 0%, #243044 50%, #2f5d4a 100%)",
    previewAccent: "#f0d9a0",
    comingSoon: true,
  },
];

/** Активні теми (можна купити / вдягнути). */
export const ACTIVE_THEMES = THEMES.filter((t) => !t.comingSoon);

export function isThemeId(id: string): boolean {
  return ACTIVE_THEMES.some((t) => t.id === id);
}

export function getTheme(id: string): ThemeDef {
  return ACTIVE_THEMES.find((t) => t.id === id) ?? THEMES[0]!;
}

export function getThemeMeta(id: string): ThemeDef | undefined {
  return THEMES.find((t) => t.id === id);
}
