"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Єдиний скрол-контейнер шелу + скидання позиції на кожному переході.
 *
 * Вбудований скрол-хендлер Next тут не працює: він міряє видимість елемента
 * відносно `document.documentElement` і робить `htmlElement.scrollTop = 0`, а в
 * цьому застосунку документ узагалі не скролиться (body — fixed + overflow
 * hidden), скрол живе в цьому div. Якщо верх нового екрана випадково потрапляє
 * в межі documentElement, хендлер виходить раніше й не скролить нічого.
 *
 * Друга половина проблеми — висота: перший кадр нового екрана це скелетон,
 * нижчий за фінальний контент, тож браузер підрізає scrollTop під нього. Коли
 * дані догружаються й блок росте, підрізане значення лишається — і сторінка
 * відкривається десь посередині. Явне обнулення на зміну pathname прибирає
 * обидва випадки.
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
    ref.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <main ref={ref} className={className}>
      {children}
    </main>
  );
}
