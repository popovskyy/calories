"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, LayoutGrid, UserRound } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Тренування", Icon: ClipboardCheck },
  { href: "/arsenal", label: "Мій арсенал", Icon: LayoutGrid },
  { href: "/profile", label: "Профіль", Icon: UserRound },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Навігація"
      className="z-20 flex shrink-0 items-center justify-around border-t border-white/[0.08] bg-surface/95 px-4 pt-1.5 pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur-xl"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 min-w-20 flex-col items-center justify-center gap-1 transition-colors",
              active ? "text-volt" : "text-gray-400 hover:text-gray-300",
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={2.1} />
            <span className="text-xs font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
