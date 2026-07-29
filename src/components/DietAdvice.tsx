"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { useAdvice, useForceAdvice } from "@/hooks/useQueries";
import { WeeklyFeedbackButton } from "@/components/WeeklyFeedbackButton";
import { todayYMD } from "@/lib/date";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";
import type { AdviceKind, AdviceResponse } from "@/lib/types";

type Ready = Extract<AdviceResponse, { state: "ready" }>;

/**
 * Звіт від ШІ-дієтолога на Огляді — не фонова картка, а кнопка з чітким
 * циклом:
 *  • Пн–Сб: до 18:00 задісейблена, після — «Дізнатись вердикт» (денний звіт).
 *  • Неділя: до 15:00 «Звіт готується…», після — «Дізнатись вердикт»
 *    (звіт тижня; денний не показуємо).
 * Один тап — один запит до ШІ на період; щойно відповідь прийшла, кнопка
 * зникає й лишається сам розбір.
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
          <span className="lbl !mb-0">Звіт</span>
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
  if (!data) return <LoadingCard />;

  if (data.state === "ready") return <AdviceCard advice={data} />;

  if (data.state === "requestable") {
    return (
      <StatusCard
        kind={data.kind}
        state="requestable"
        onRequest={() => force.mutate()}
        pending={force.isPending}
        error={force.isError}
      />
    );
  }

  if (data.state === "no_meals") {
    return <StatusCard kind={data.kind} state="no_meals" />;
  }

  // locked — денний або тижневий (до unlock-години)
  return <StatusCard kind={data.kind ?? "daily"} state="locked" />;
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

const DAILY_COPY = {
  locked: {
    text: "Звіт готується… Стане доступним після 18:00 — коли день вже фактично закритий.",
    button: "Звіт готується…",
  },
  no_meals: {
    text: "Сьогодні ще нема жодного запису їжі — поки що нема що аналізувати.",
    button: "Немає даних за день",
  },
  requestable: {
    text: "День зібрано. Готовий дізнатись вердикт від ШІ-дієтолога?",
    button: "Дізнатись вердикт",
  },
} as const;

const WEEKLY_COPY = {
  locked: {
    text: "Звіт готується… Стане доступним після 15:00 — коли тиждень вже майже закритий.",
  },
  no_meals: {
    text: "Цього тижня ще нема жодного запису їжі — поки що нема що аналізувати.",
    button: "Немає даних за тиждень",
  },
  requestable: {
    text: "Тиждень зібрано. Готовий дізнатись вердикт від ШІ-дієтолога?",
  },
} as const;

function StatusCard({
  kind,
  state,
  onRequest,
  pending = false,
  error = false,
}: {
  kind: AdviceKind;
  state: "locked" | "no_meals" | "requestable";
  onRequest?: () => void;
  pending?: boolean;
  error?: boolean;
}) {
  const weekly = kind === "weekly";
  const title = weekly ? "Звіт тижня" : "Звіт дня";
  const text = weekly ? WEEKLY_COPY[state].text : DAILY_COPY[state].text;
  const active = state === "requestable";
  const neon =
    weekly && (state === "locked" || state === "requestable" || pending);

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            weekly && (state === "locked" || active)
              ? "bg-[color-mix(in_srgb,#3db89a_16%,transparent)] text-[#3db89a]"
              : active
                ? "bg-[color-mix(in_srgb,var(--color-accent)_16%,transparent)] text-[var(--color-accent)]"
                : "bg-[var(--color-tile)] text-[var(--color-muted3)]",
          )}
        >
          <Sparkles
            size={17}
            className={pending || (weekly && state === "locked") ? "spark-pulse" : undefined}
          />
        </span>
        <div className="min-w-0 flex-1">
          <span className="lbl !mb-0">{title}</span>
          <p className="mt-1 text-[14px] leading-snug text-[var(--color-muted)]">
            {text}
          </p>
        </div>
      </div>

      {neon ? (
        <WeeklyFeedbackButton
          phase={
            pending ? "pending" : state === "locked" ? "collecting" : "ready"
          }
          onClick={onRequest}
        />
      ) : (
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
          ) : weekly && state === "no_meals" ? (
            WEEKLY_COPY.no_meals.button
          ) : (
            DAILY_COPY[state].button
          )}
        </button>
      )}

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
  const weekly = data.kind === "weekly";

  const seenKey = weekly
    ? `advice-seen:week:${data.date}`
    : `advice-seen:${data.date || todayYMD()}`;
  const [seen] = useState(() => {
    try {
      return sessionStorage.getItem(seenKey) !== null;
    } catch {
      return true;
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
        : weekly
          ? "#3db89a"
          : "var(--color-accent)";

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mcard overflow-hidden", !seen && "advice-fresh")}
    >
      <div
        className="h-[3px] w-full"
        style={{
          background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 8%, transparent))`,
        }}
      />

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

        <div className="min-w-0 flex-1">
          <span className="lbl !mb-0">
            {weekly ? "Звіт тижня · ШІ-дієтолог" : "Звіт дня · ШІ-дієтолог"}
          </span>
          <p
            className="mt-1 text-[16px] font-semibold leading-tight"
            style={{ color: accent }}
          >
            {data.headline}
          </p>
          <p className="mt-1.5 text-[14px] leading-snug text-[var(--color-muted)]">
            {data.body}
          </p>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 border-t border-[var(--color-divider)]",
          "px-[18px] py-3 text-left transition-[background-color,transform] active:scale-[0.99]",
        )}
      >
        <span className="lbl !mb-0">
          {weekly ? "Що робити наступного тижня" : "Що робити завтра"}
        </span>
        <ChevronDown
          size={16}
          className={cn(
            "shrink-0 text-[var(--color-muted3)] transition-transform duration-[var(--duration-ui)]",
            open && "rotate-180",
          )}
        />
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
            <div className="px-[18px] pb-[18px]">
              <div
                className="rounded-[var(--radius-md)] bg-[var(--color-tile)] p-3.5"
                style={{ boxShadow: `inset 2px 0 0 ${accent}` }}
              >
                <p className="text-[14px] leading-snug text-[var(--color-text)]">
                  {data.tip}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
