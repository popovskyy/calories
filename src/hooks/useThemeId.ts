"use client";

import { useCurrentUser } from "@/hooks/useQueries";
import { DEFAULT_THEME } from "@/lib/theme-catalog";

/**
 * Активна тема для JS-диспетчу.
 *
 * Джерело — профіль користувача, а не `document.documentElement.dataset.theme`:
 * читання DOM під час рендеру дало б розбіжність між сервером і клієнтом.
 * Скін до гідратації однаково ставить THEME_BOOT_SCRIPT із куки.
 *
 * Правило: сюди ходять лише за структурними відмінностями (вогнище замість
 * кільця). Усе, що виражається селектором `html[data-theme="…"]`, живе в CSS.
 */
export function useThemeId(): string {
  const { user } = useCurrentUser();
  return user?.theme ?? DEFAULT_THEME;
}
