"use client";

import { useEffect } from "react";
import { THEME_COOKIE } from "@/lib/theme-constants";

interface ThemeSyncProps {
  theme: string;
}

/** Синхронізує тему з сервера до data-theme на <html> та cookie. */
export function ThemeSync({ theme }: ThemeSyncProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)};path=/;max-age=${maxAge};samesite=lax`;
  }, [theme]);

  return null;
}
