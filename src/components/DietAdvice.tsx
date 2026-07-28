"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, RefreshCw, Sparkles, Sun, Sunrise, Moon } from "lucide-react";
import { useAdvice } from "@/hooks/useQueries";
import { todayYMD } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { AdviceResponse } from "@/lib/types";

type Ready = Extract<AdviceResponse, { ready: true }>;

/** Підписи міняються разом із днем: зранку це не «підсумок», а погляд уперед. */
const PART_UI = {
  morning: { label: "Ранковий розбір", tip: "Далі сьогодні", Icon: Sunrise },
  day: { label: "Розбір дня", tip: "До вечора", Icon: Sun },
  evening: { label: "Вечірній розбір", tip: "Завтра", Icon: Moon },
} as const;

/**
 * Розбір раціону від ШІ на Огляді.
 *
 * З'являється щойно за день є хоч один запис їжі й оновлюється разом із днем
 * (сніданок → «гарний початок», вечеря → підсумок). Порожній день — єдиний
 * випадок, коли картки немає взагалі: коментувати нічого.
 *
 * Помилку показуємо явно з кнопкою повтору: мовчазне зникнення картки читалось
 * як «фічі немає» — саме на це й скаржились.
 */
export function DietAdvice() {
  const q = useAdvice();

  if (q.isError) {
    return (
      <section className="mcard flex items-center gap-3 p-[18px]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-tile)] text-[var(--color-muted3)]">
          <Sparkles size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="lbl !mb-0">Розбір раціону</span>
          <p className="mt-0.5 text-[13px] text-[var(--color-muted3)]">
            Не вдалося зібрати — ШІ не відповів
          </p>
        </div>
        <button
          type="button"
          className="icon-btn shrink-0"
          aria-label="Спробувати знову"
          onClick={() => void q.refetch()}
        >
          <RefreshCw size={15} className={q.isFetching ? "animate-spin" : undefined} />
        </button>
      </section>
    );
  }

  const data = q.data;
  if (!data || !data.ready) return null;
  // key за частиною доби — щоб оновлений текст «в'їхав», а не підмінився мовчки
  return <AdviceCard key={data.dayPart} advice={data} />;
}

function AdviceCard({ advice: data }: { advice: Ready }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const ui = PART_UI[data.dayPart] ?? PART_UI.evening;

  // Позначка «вже бачив» — своя на кожну частину доби, тож оновлений
  // розбір знову ловить око, а те саме — ні.
  const seenKey = `advice-seen:${todayYMD()}:${data.dayPart}`;
  const [seen] = useState(() => {
    try {
      return sessionStorage.getItem(seenKey) !== null;
    } catch {
      return true; // private mode — не блимаємо
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(seenKey, "1");
    } catch {
      /* private mode */
    }
  }, [seenKey]);

  const accent =
    data.mood === "over"
      ? "var(--color-red)"
      : data.mood === "good"
        ? "var(--color-green)"
        : "var(--color-accent)";

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mcard overflow-hidden", !seen && "advice-fresh")}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 p-[18px] text-left"
      >
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            background: `color-mix(in srgb, ${accent} 16%, transparent)`,
            color: accent,
          }}
        >
          <ui.Icon size={17} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="lbl !mb-0">{ui.label}</span>
            <ChevronDown
              size={14}
              className={cn(
                "shrink-0 text-[var(--color-muted3)] transition-transform duration-[var(--duration-ui)]",
                open && "rotate-180",
              )}
            />
          </div>
          <p
            className="mt-1 text-[16px] font-semibold leading-tight"
            style={{ color: accent }}
          >
            {data.headline}
          </p>
          <p className="mt-1 text-[14px] leading-snug text-[var(--color-muted)]">
            {data.body}
          </p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="tip"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-divider)] px-[18px] py-3.5">
              <span className="lbl">{ui.tip}</span>
              <p className="mt-1 text-[14px] leading-snug text-[var(--color-text)]">
                {data.tip}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
