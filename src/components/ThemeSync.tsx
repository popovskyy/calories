"use client";

import { useEffect } from "react";
import { useCurrentUser } from "@/hooks/useQueries";
import { THEME_COOKIE } from "@/lib/theme-constants";

/**
 * Страховка на випадок відсутньої/застарілої куки теми: доводить data-theme
 * до значення з профілю. Монтується глобально в Providers, тож працює на
 * будь-якому екрані, а не лише на дашборді.
 */
export function ThemeSync() {
  const { user } = useCurrentUser();
  const theme = user?.theme;

  useEffect(() => {
    if (!theme) return;
    if (document.documentElement.dataset.theme === theme) return;
    document.documentElement.dataset.theme = theme;
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)};path=/;max-age=${maxAge};samesite=lax`;
  }, [theme]);

  return null;
}
