"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardList, Trophy, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Огляд", icon: House },
  { href: "/log", label: "Журнал", icon: ClipboardList },
  { href: "/arena", label: "Арена", icon: Trophy },
  { href: "/profile", label: "Профіль", icon: User },
] as const;

/**
 * Один markup — три вигляди: плоскі таби (Nocturne), pill (Forest),
 * хотбар-слоти (Minecraft). Різницю робить CSS за data-theme, тому список
 * табів і роути лишаються спільними.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="nav-bar">
      <nav className="nav-list">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? // Хроніки відкриваються з Огляду — таб лишається активним
                pathname === "/" || pathname.startsWith("/epics")
              : // Магазин відкривається лише з Профілю — таб лишається активним
                pathname.startsWith(href) ||
                (href === "/profile" && pathname.startsWith("/shop"));
          return (
            <Link key={href} href={href} data-active={active} className="nav-tab">
              <Icon size={20} strokeWidth={active ? 2.1 : 1.8} />
              <span className="nav-tab-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
