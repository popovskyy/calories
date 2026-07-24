"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardList, Trophy, User } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Огляд", icon: House },
  { href: "/log", label: "Журнал", icon: ClipboardList },
  { href: "/arena", label: "Арена", icon: Trophy },
  { href: "/profile", label: "Профіль", icon: User },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="flex shrink-0 border-t border-[var(--color-divider)] bg-[var(--color-bg)] px-2 pb-2 pt-2.5"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-1 transition-colors",
              active ? "text-[var(--color-accent)]" : "text-[var(--color-muted2)]",
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.1 : 1.8} />
            <span className={cn("text-[12px]", active && "font-semibold")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
