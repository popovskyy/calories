"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardList, Trophy, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMainTabs, type MainTab } from "@/components/MainTabs";

const TABS: { id: MainTab; href: string; label: string; icon: LucideIcon }[] = [
  { id: "overview", href: "/", label: "Огляд", icon: House },
  { id: "log", href: "/log", label: "Журнал", icon: ClipboardList },
  { id: "arena", href: "/arena", label: "Арена", icon: Trophy },
  { id: "profile", href: "/profile", label: "Профіль", icon: User },
];

/**
 * Головні таби — кнопки (без Next Link), щоб не тригерити soft-nav на iOS.
 * Лише /shop|/epics лишають Link.
 */
export function TabBar() {
  const pathname = usePathname();
  const { tab, selectTab, isExtra } = useMainTabs();

  return (
    <div className="nav-bar">
      <nav className="nav-list">
        {TABS.map(({ id, href, label, icon: Icon }) => {
          const active = isExtra
            ? id === "overview"
              ? pathname === "/" || pathname.startsWith("/epics")
              : id === "profile"
                ? pathname.startsWith("/profile") || pathname.startsWith("/shop")
                : pathname.startsWith(href)
            : tab === id;

          if (isExtra) {
            return (
              <Link
                key={id}
                href={href}
                scroll={false}
                data-active={active}
                className="nav-tab"
              >
                <LinkTabContent icon={Icon} label={label} active={active} />
              </Link>
            );
          }

          return (
            <button
              key={id}
              type="button"
              data-active={active}
              className="nav-tab"
              onClick={() => selectTab(id)}
            >
              <span className="nav-tab-inner">
                <Icon size={20} strokeWidth={active ? 2.1 : 1.8} />
                <span className="nav-tab-label">{label}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function LinkTabContent({
  icon: Icon,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  return (
    <span className="nav-tab-inner" data-pending={pending || undefined}>
      <Icon size={20} strokeWidth={active || pending ? 2.1 : 1.8} />
      <span className="nav-tab-label">{label}</span>
    </span>
  );
}
