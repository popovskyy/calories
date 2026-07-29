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
 *
 * На iOS standalone `scrollTo({ behavior: "instant" })` після зміни маршруту
 * лишав scrollTop від'ємним (гумка overscroll) і розсинхронізував scroll-шар
 * з paint — звідси «діра» з AmbientLayer замість контенту. Тому лише
 * присвоєння scrollTop і повтор після кадру розкладки.
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

    const reset = () => {
      el.scrollTop = 0;
    };

    reset();
    // Другий кадр: iOS WKWebView інколи застосовує гуму overscroll уже після
    // першого layout-ефекту й лишає від'ємний offset.
    const raf = requestAnimationFrame(() => {
      reset();
      if (el.scrollTop < 0) el.scrollTop = 0;
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return (
    <main ref={ref} className={className}>
      {children}
    </main>
  );
}
