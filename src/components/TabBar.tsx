"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardList, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Огляд", icon: House },
  { href: "/log", label: "Журнал", icon: ClipboardList },
  { href: "/profile", label: "Профіль", icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="nav-bar">
      <nav className="nav-list">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              scroll={false}
              data-active={active}
              className="nav-tab"
            >
              <span className="nav-tab-inner">
                <Icon size={20} strokeWidth={active ? 2.1 : 1.8} />
                <span className="nav-tab-label">{label}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
