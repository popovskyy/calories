"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Обгортка для Recharts `ResponsiveContainer`.
 *
 * Recharts міряє батька на маунті й сипле в консоль
 * «width(0) and height(0)…», якщо контейнер ще згорнутий (grid 0fr,
 * accordion, overlay). Монтуємо чарт лише коли є реальний розмір.
 */
export function ChartFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setReady(width > 1 && height > 1);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {ready ? children : null}
    </div>
  );
}
