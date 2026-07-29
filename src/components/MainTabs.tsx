"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

export type MainTab = "overview" | "log" | "arena" | "profile";

const TAB_PATH: Record<MainTab, string> = {
  overview: "/",
  log: "/log",
  arena: "/arena",
  profile: "/profile",
};

const PATH_TAB: Record<string, MainTab> = {
  "/": "overview",
  "/log": "log",
  "/arena": "arena",
  "/profile": "profile",
};

function pathToTab(path: string): MainTab | null {
  if (PATH_TAB[path]) return PATH_TAB[path];
  if (path.startsWith("/epics")) return "overview";
  if (path.startsWith("/shop")) return "profile";
  return null;
}

function isShellExtra(path: string): boolean {
  return path.startsWith("/shop") || path.startsWith("/epics");
}

type MainTabsCtx = {
  tab: MainTab;
  selectTab: (tab: MainTab) => void;
  isExtra: boolean;
};

const Ctx = createContext<MainTabsCtx | null>(null);

export function useMainTabs(): MainTabsCtx {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error("useMainTabs outside MainTabsProvider");
  }
  return v;
}

export function useMainTabsOptional(): MainTabsCtx | null {
  return useContext(Ctx);
}

/**
 * Чотири головні таби в одному клієнтському шеллі без soft-nav Next.
 * /shop і /epics — звичайні маршрути.
 */
export function MainTabsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const extra = isShellExtra(pathname);

  const [tab, setTab] = useState<MainTab>(
    () => pathToTab(pathname) ?? "overview",
  );

  useEffect(() => {
    const t = pathToTab(pathname);
    if (t) setTab(t);
  }, [pathname]);

  const selectTab = useCallback(
    (next: MainTab) => {
      const url = TAB_PATH[next];
      if (isShellExtra(pathname)) {
        router.replace(url, { scroll: false });
        setTab(next);
        return;
      }
      setTab(next);
      if (window.location.pathname !== url) {
        window.history.replaceState(window.history.state, "", url);
      }
    },
    [pathname, router],
  );

  const value = useMemo(
    () => ({ tab, selectTab, isExtra: extra }),
    [tab, selectTab, extra],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { TAB_PATH, pathToTab, isShellExtra };
