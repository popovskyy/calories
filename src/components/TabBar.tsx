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
      className="z-20 flex shrink-0 items-center justify-around border-t border-white/[0.08] bg-surface/95 px-6 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur-xl"
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-16 flex-col items-center gap-1 py-1 transition-colors",
              active ? "text-volt" : "text-gray-500 hover:text-gray-300",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2.1} />
            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
