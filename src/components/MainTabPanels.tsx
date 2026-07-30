"use client";

import { useEffect, useState, type ReactNode } from "react";
import { OverviewTab } from "@/app/(main)/page";
import { LogTab } from "@/app/(main)/log/page";
import { ArenaTab } from "@/app/(main)/arena/page";
import { ProfileTab } from "@/app/(main)/profile/page";
import { useMainTabs, type MainTab } from "@/components/MainTabs";

function Panel({
  id,
  active,
  mounted,
  children,
}: {
  id: MainTab;
  active: boolean;
  mounted: boolean;
  children: ReactNode;
}) {
  if (!mounted) return null;
  return (
    <div
      data-main-tab={id}
      aria-hidden={!active}
      className="flex w-full flex-col gap-4"
      style={{ display: active ? "flex" : "none" }}
    >
      {children}
    </div>
  );
}

/** Keep-alive панелі головних табів — без soft-nav Next між ними. */
export function MainTabPanels({ children }: { children: ReactNode }) {
  const { tab, isExtra } = useMainTabs();
  const [visited, setVisited] = useState(() => new Set<MainTab>([tab]));

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, isExtra]);

  if (isExtra) {
    return <>{children}</>;
  }

  return (
    <>
      <Panel
        id="overview"
        active={tab === "overview"}
        mounted={visited.has("overview")}
      >
        <OverviewTab />
      </Panel>
      <Panel id="log" active={tab === "log"} mounted={visited.has("log")}>
        <LogTab />
      </Panel>
      <Panel
        id="arena"
        active={tab === "arena"}
        mounted={visited.has("arena")}
      >
        <ArenaTab />
      </Panel>
      <Panel
        id="profile"
        active={tab === "profile"}
        mounted={visited.has("profile")}
      >
        <ProfileTab />
      </Panel>
    </>
  );
}
