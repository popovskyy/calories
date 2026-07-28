"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { useAdvice, useForceAdvice } from "@/hooks/useQueries";
import { todayYMD } from "@/lib/date";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";
import type { AdviceResponse } from "@/lib/types";

type Ready = Extract<AdviceResponse, { state: "ready" }>;

/**
 * Звіт дня від ШІ-дієтолога на Огляді — не фонова картка, а кнопка з чітким
 * циклом: до 17:00 задісейблена ("звіт готується…"), після 17:00 активна й
 * чекає тапу ("Отримати фідбек"). Один тап — один запит до ШІ на весь день:
 * щойно відповідь прийшла, кнопка зникає назавжди й лишається сам текст
 * ("Фідбек по сьогоднішньому дню від ШІ"). Наступного дня цикл з нуля.
 */
export function DietAdvice() {
  const q = useAdvice();
  const force = useForceAdvice();

  if (q.isError) {
    return (
      <section className="mcard flex items-center gap-3 p-[18px]">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-tile)] text-[var(--color-muted3)]">
          <Sparkles size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="lbl !mb-0">Звіт дня</span>
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

  // Поки перший запит ще в польоті — нейтральний скелетон, а не «locked».
  // Раніше тут одразу малювався стан «locked» як дефолт, і якщо реальна
  // відповідь (уже після 17:00) виявлялась іншою — «Звіт готується» встигав
  // блимнути й миттю замінитись, що читалось як «звіт зник».
  if (!data) return <LoadingCard />;

  if (data.state === "ready") return <AdviceCard advice={data} />;

  if (data.state === "requestable") {
    return (
      <StatusCard
        state="requestable"
        onRequest={() => force.mutate()}
        pending={force.isPending}
        error={force.isError}
      />
    );
  }

  if (data.state === "no_meals") return <StatusCard state="no_meals" />;

  // "locked" і будь-яка невідома форма відповіді (напр. застарілий кеш зі
  // старої версії API під час hot-reload) — той самий безпечний дефолт.
  return <StatusCard state="locked" />;
}

function LoadingCard() {
  return (
    <section className="mcard flex flex-col gap-3 p-[18px]" aria-hidden>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-tile)] text-[var(--color-muted3)]">
          <Sparkles size={17} className="spark-pulse" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-3 w-full max-w-[240px]" />
        </div>
      </div>
      <Skeleton className="h-11 w-full" />
    </section>
  );
}

const STATUS_COPY = {
  locked: {
    text: "Звіт готується… Стане доступним після 17:00 — коли день вже фактично закритий.",
    button: "Звіт готується…",
  },
  no_meals: {
    text: "Сьогодні ще нема жодного запису їжі — поки що нема що аналізувати.",
    button: "Немає даних за день",
  },
  requestable: {
    text: "День зібрано. Готовий дізнатись вердикт від ШІ-дієтолога?",
    button: "Отримати фідбек",
  },
} as const;

function StatusCard({
  state,
  onRequest,
  pending = false,
  error = false,
}: {
  state: "locked" | "no_meals" | "requestable";
  onRequest?: () => void;
  pending?: boolean;
  error?: boolean;
}) {
  const copy = STATUS_COPY[state];
  const active = state === "requestable";

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            active
              ? "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-[var(--color-accent)]"
              : "bg-[var(--color-tile)] text-[var(--color-muted3)]",
          )}
        >
          <Sparkles size={17} className={pending ? "spark-pulse" : undefined} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="lbl !mb-0">Звіт дня</span>
          <p className="mt-1 text-[14px] leading-snug text-[var(--color-muted)]">
            {copy.text}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block btn-sm"
        data-sfx={active ? "confirm" : "none"}
        disabled={!active || pending}
        onClick={onRequest}
      >
        {pending ? (
          <>
            <RefreshCw size={14} className="animate-spin" /> Готуємо звіт…
          </>
        ) : (
          copy.button
        )}
      </button>

      {error ? (
        <p className="text-center text-[12px] text-[var(--color-red)]">
          ШІ не відповів — спробуй натиснути ще раз
        </p>
      ) : null}
    </section>
  );
}

function AdviceCard({ advice: data }: { advice: Ready }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  // Позначка «вже бачив» — раз на добу, бо звіт за сьогодні більше не зміниться.
  const seenKey = `advice-seen:${todayYMD()}`;
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
      <div className="flex items-start gap-3 p-[18px]">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            background: `color-mix(in srgb, ${accent} 16%, transparent)`,
            color: accent,
          }}
        >
          <Sparkles size={17} />
        </span>

        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1.5">
            <span className="lbl !mb-0">Фідбек по сьогоднішньому дню від ШІ</span>
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
        </button>
      </div>

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
