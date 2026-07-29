"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Єдиний скрол-контейнер шелу + свіжий шар на кожному табі.
 *
 * Вбудований скрол-хендлер Next тут не працює: документ не скролиться
 * (body — fixed), скрол живе в цьому main.
 *
 * На iOS PWA після soft-navigation WebKit інколи лишає metrics/paint
 * попереднього (вищого) маршруту — пейдж виглядає «занадто високим» або
 * з дірами. `key={pathname}` форсує новий scroll-шар; scrollTop=0 після
 * mount прибирає залишковий offset.
 */
export function AppScroll({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [pathname]);

  return (
    <main key={pathname} ref={ref} className={className}>
      {children}
    </main>
  );
}
