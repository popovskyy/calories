"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Moon } from "lucide-react";
import { useAdvice } from "@/hooks/useQueries";
import { todayYMD } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { AdviceResponse } from "@/lib/types";

/**
 * Вечірній розбір раціону від ШІ — з'являється на Огляді після 20:00,
 * коли за день є щонайменше два записи їжі.
 *
 * Свідомо остання картка перед «Ще»: це підсумок дня, а не заклик до дії.
 * Порада (tip) схована під тап — вердикт видно завжди, а «що зробити завтра»
 * читає той, кому цікаво. Гейт по часу і кеш живуть на сервері (/api/advice),
 * тут лише подача.
 */
export function EveningAdvice() {
  const q = useAdvice();
  const data = q.data;
  // Картка монтується лише коли є що показати — тому «перша поява за вечір»
  // визначається просто в ініціалізаторі стану всередині неї.
  if (!data || !data.ready) return null;
  return <AdviceCard advice={data} />;
}

function AdviceCard({
  advice: data,
}: {
  advice: Extract<AdviceResponse, { ready: true }>;
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  // true, якщо цю пораду вже бачили в цій сесії — тоді без підсвітки.
  const [seen] = useState(() => {
    try {
      return sessionStorage.getItem(`advice-seen:${todayYMD()}`) !== null;
    } catch {
      return true; // private mode — не блимаємо
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(`advice-seen:${todayYMD()}`, "1");
    } catch {
      /* private mode */
    }
  }, []);

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
          <Moon size={17} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="lbl !mb-0">Вечірній розбір</span>
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
              <span className="lbl">Завтра</span>
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
