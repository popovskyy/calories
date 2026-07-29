"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardList, Trophy, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
              <TabContent icon={Icon} label={label} active={active} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Вміст таба з індикатором очікування переходу.
 *
 * `useLinkStatus` доступний лише всередині `<Link>`, тому це окремий
 * компонент. Поки маршрут вантажиться, таб підсвічується як активний —
 * інакше при швидкому перемиканні здається, що тап не спрацював.
 */
function TabContent({
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
