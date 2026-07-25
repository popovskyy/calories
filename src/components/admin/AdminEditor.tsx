"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Права колонка-редактор адмінки.
 *
 * Головна проблема, яку це вирішує: на вузькому екрані колонка падає ПІД
 * таблицю, тож після кліку по рядку («редагувати») візуально не відбувалось
 * нічого — форма була нижче за межами екрана. Тепер при відкритті ми
 * підкручуємо до неї, а на десктопі вона липне до верху й скролиться сама.
 */
export function AdminEditor({
  open,
  title,
  onClose,
  children,
  className,
}: {
  /** Змінюється, коли обрано інший запис — тригер для підкручування. */
  open: string | null;
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    // Тільки коли колонка справді під таблицею (одноколонковий режим).
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const el = ref.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      el.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  return (
    <aside
      ref={ref}
      className={cn(
        "mcard scroll-mt-4 p-4",
        "lg:sticky lg:top-4 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto",
        className,
      )}
    >
      {title ? (
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-[var(--color-text)]">{title}</h2>
          {onClose ? (
            <button
              type="button"
              className="icon-btn -mr-2 -mt-2 shrink-0"
              aria-label="Закрити редактор"
              onClick={onClose}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
      {children}
    </aside>
  );
}
