"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CalorieHero } from "@/components/hero/CalorieHero";
import { EpicCard } from "@/components/EpicCard";
import { DietAdvice } from "@/components/DietAdvice";
import { MacroTiles } from "@/components/MacroTiles";
import { QuestChip } from "@/components/QuestChip";
import { ThemeAspirationHint } from "@/components/ThemeAspirationHint";
import { WeeklyQuestsCard } from "@/components/WeeklyQuestsCard";
import { WeightGoalCard } from "@/components/WeightGoalCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadError } from "@/components/ui/LoadError";
import { useCurrentUser, useDashboard, useEpics } from "@/hooks/useQueries";
import { calcMacroTargets, calcMaintenanceCalories } from "@/lib/calories";
import { humanDate, todayYMD } from "@/lib/date";
import { cn } from "@/lib/cn";
import { weekFilledStats } from "@/lib/week-stats";
import type { DashboardDay } from "@/lib/types";
import type { Goal } from "@/lib/calories";

const WeeklyChart = dynamic(
  () => import("@/components/WeeklyChart").then((m) => m.WeeklyChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[150px] w-full" />,
  },
);

/** Повільний скрол до низу сторінки, підлаштовується під зростаючу висоту accordion. */
function scrollPageBottomSlow(durationMs = 480) {
  const startY = window.scrollY;
  const t0 = performance.now();
  const easeOut = (t: number) => 1 - (1 - t) ** 3;

  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / durationMs);
    const maxY = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    window.scrollTo(0, startY + (maxY - startY) * easeOut(p));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function OverviewTab() {
  const { user, isLoading, isError, refetch } = useCurrentUser();
  const dash = useDashboard();
  const [moreOpen, setMoreOpen] = useState(false);
  const scrollMoreRef = useRef(false);

  // Скрол лише після кліку «Ще» (не коли QuestChip відкриває той самий accordion).
  useEffect(() => {
    if (!moreOpen || !scrollMoreRef.current) return;
    scrollMoreRef.current = false;
    scrollPageBottomSlow(520);
  }, [moreOpen]);

  if (isError || dash.isError) {
    return (
      <LoadError
        message="Не вдалося завантажити огляд"
        onRetry={() => {
          if (isError) void refetch();
          if (dash.isError) void dash.refetch();
        }}
      />
    );
  }
  if (isLoading || !user) return <DashboardSkeleton />;

  const today = dash.data?.today;
  const diff = today?.difference ?? 0;
  const over = diff < 0;
  const macroTargets = calcMacroTargets(user.targetCalories, user.weight);

  const openQuests = () => {
    setMoreOpen(true);
    // Чекаємо, поки accordion розгорнеться, інакше scroll цілить у згорнуте.
    window.setTimeout(() => {
      document.getElementById("weekly-quests")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 340);
  };

  const toggleMore = () => {
    setMoreOpen((o) => {
      const next = !o;
      if (next) scrollMoreRef.current = true;
      return next;
    });
  };

  return (
    <>
      <DashboardHeader />

      {/* Кільце прогресу — герой першого viewport */}
      <section className="mcard flex flex-col items-center gap-3 p-[26px_20px_22px] shadow-[var(--shadow-card-lg)]">
        <div className="flex w-full items-center justify-between gap-2">
          <span className="lbl min-w-0 truncate whitespace-nowrap">
            Сьогодні · {humanDate(todayYMD())}
          </span>
          {/*
            День ще триває, тож "Дефіцит" тут був би вердиктом, якого ще нема:
            зранку з одним записом на 400 ккал він же не дефіцит на день, а
            просто ще не з'їдена решта. Перебір — інша річ, його вже не
            відкотити, тож він і лишається вердиктом.
          */}
          {today ? (
            over ? (
              <span
                className="shrink-0 whitespace-nowrap rounded-[var(--radius-pill)] px-2.5 py-1 text-[13px] font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--color-red) 20%, transparent)",
                  color: "var(--color-red)",
                }}
              >
                Перебір
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--color-accent)_22%,transparent)] px-2.5 py-1 text-[13px] font-semibold text-[var(--color-accent-300)]">
                {diff === 0 ? (
                  "Рівно в ціль"
                ) : (
                  <>
                    <span className="font-medium opacity-80">Залишилось</span>
                    <span className="tabular-nums">
                      {diff.toLocaleString("uk-UA")}
                    </span>
                  </>
                )}
              </span>
            )
          ) : null}
        </div>

        {dash.isLoading || !today ? (
          user.theme === "nocturne" ? (
            <Skeleton className="my-1.5 h-[248px] w-[248px] rounded-full" />
          ) : (
            <Skeleton className="my-1.5 h-[250px] w-full rounded-[var(--radius-lg)]" />
          )
        ) : (
          <CalorieHero
            consumed={today.totalCalories}
            target={user.targetCalories}
            frame={user.frame}
            goal={user.goal}
          />
        )}

        {today ? (
          <MacroTiles
            protein={today.protein}
            fats={today.fats}
            carbs={today.carbs}
            targets={macroTargets}
          />
        ) : (
          <div className="flex w-full gap-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[54px] flex-1" />
            ))}
          </div>
        )}
      </section>

      {/*
        Звіт дня — кнопка «Дізнатись вердикт» відкривається після 18:00 (Пн–Сб);
        у неділю — тижневий фідбек після 15:00.
        Стоїть одразу під кільцем: це головна вечірня дія, а вердикт ШІ по
        сьогоднішньому дню читається як продовження цифр героя.
      */}
      <DietAdvice />

      <WeightGoalCard />

      <ThemeAspirationHint />

      {/* Один квест тижня видимий без dump списку на home */}
      <QuestChip onOpen={openQuests} />

      {/*
        Квести / хроніки / графік — поза першим екраном.
        Інакше головна читається як дашборд SaaS.
      */}
      <section>
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={toggleMore}
          className="mcard flex w-full cursor-pointer items-center justify-between gap-2 px-[18px] py-3.5 text-left"
        >
          <span className="lbl !mb-0">Ще</span>
          <span className="flex items-center gap-1.5 text-[14px] text-[var(--color-muted3)]">
            квести · хроніки · графік
            <ChevronDown
              size={16}
              className={cn(
                "shrink-0 transition-transform duration-[var(--duration-sheet)]",
                moreOpen && "rotate-180",
              )}
            />
          </span>
        </button>
        {/* grid-rows 0fr→1fr — height-анімація без вимірювань */}
        <div
          className="grid transition-[grid-template-rows] duration-[var(--duration-sheet)] ease-[var(--ease-out)]"
          style={{ gridTemplateRows: moreOpen ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-4 pt-4">
              <div id="weekly-quests">
                <WeeklyQuestsCard />
              </div>
              <ActiveEpic />
              <section className="mcard p-[18px_18px_16px]">
                <div className="mb-3.5 flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <span className="lbl">Цей тиждень</span>
                    {dash.data ? (
                      <WeekAvgLine
                        days={dash.data.days}
                        today={dash.data.today}
                        target={user.targetCalories}
                        maintenance={calcMaintenanceCalories({
                          birthYear: user.birthYear,
                          birthMonth: user.birthMonth,
                          sex: user.sex,
                          weightKg: user.weight,
                          heightCm: user.height,
                        })}
                        goal={user.goal}
                      />
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[14px] text-[var(--color-muted3)]">
                    ціль {user.targetCalories.toLocaleString("uk-UA")}
                  </span>
                </div>
                {dash.data ? (
                  moreOpen ? (
                    <WeeklyChart days={dash.data.days} target={user.targetCalories} />
                  ) : (
                    <Skeleton className="h-[150px] w-full" />
                  )
                ) : (
                  <Skeleton className="h-[150px] w-full" />
                )}
              </section>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Середнє + норми: підтримка (без дефіциту), ціль дефіциту, факт середнє.
 * Рахується лише за ЗАКРИТИМИ днями (weekFilledStats відрізає сьогодні) —
 * інакше ранковий запис на 400 ккал виглядав би як "−1500 від цілі" замість
 * ще не дописаної цифри. Сьогодні показуємо окремим живим рядком.
 */
function WeekAvgLine({
  days,
  today,
  target,
  maintenance,
  goal,
}: {
  days: DashboardDay[];
  today: DashboardDay;
  target: number;
  maintenance: number;
  goal: Goal;
}) {
  const stats = weekFilledStats(days, target, todayYMD());

  const normsLine =
    goal === "deficit"
      ? `підтримка ${maintenance.toLocaleString("uk-UA")} · дефіцит ${target.toLocaleString("uk-UA")}`
      : `підтримка ${maintenance.toLocaleString("uk-UA")}`;

  const todayHasFood =
    (today.consumedCalories ?? 0) > 0 || today.totalCalories > 0;

  if (!stats) {
    return (
      <div className="mt-0.5 space-y-0.5 text-[13px] tabular-nums text-[var(--color-muted2)]">
        <p>
          {todayHasFood
            ? `сьогодні ${(today.consumedCalories ?? today.totalCalories).toLocaleString("uk-UA")} · день триває`
            : "тиждень щойно почався"}
        </p>
        <p className="text-[12px] text-[var(--color-muted3)]">{normsLine}</p>
      </div>
    );
  }

  const { avgNetKcal: avg, loggedDays } = stats;
  const delta = avg - target;
  const deltaLabel =
    Math.abs(delta) < 30
      ? "біля цілі"
      : delta > 0
        ? `+${delta.toLocaleString("uk-UA")} до цілі`
        : `−${Math.abs(delta).toLocaleString("uk-UA")} від цілі`;

  return (
    <div className="mt-0.5 space-y-0.5 text-[13px] tabular-nums text-[var(--color-muted2)]">
      <p>
        середнє {avg.toLocaleString("uk-UA")} · {loggedDays}{" "}
        {pluralDaysUk(loggedDays)} закритих · {deltaLabel}
      </p>
      <p className="text-[12px] text-[var(--color-muted3)]">{normsLine}</p>
    </div>
  );
}

function pluralDaysUk(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дні";
  return "днів";
}

/**
 * Активна хроніка на дашборді.
 *
 * Показуємо рівно одну — ту, що ближча до наступного вузла. Список із шести
 * шкал на головній перетворив би довгу ціль на шум; одна шкала з підписом
 * «12 км лишилось» тягне вперед.
 */
function ActiveEpic() {
  const q = useEpics();
  const epics = q.data?.epics ?? [];

  const candidates = epics.filter((e) => e.started && !e.completed);
  if (candidates.length === 0) {
    return (
      <section className="mcard flex items-center justify-between gap-3 p-[18px]">
        <div className="min-w-0">
          <span className="lbl">Хроніки</span>
          <p className="mt-1 text-[13px] text-[var(--color-muted3)]">
            Довгий похід на місяці. Обери свій шлях.
          </p>
        </div>
        <Link href="/epics" scroll={false} className="btn btn-primary btn-sm shrink-0">
          Обрати
        </Link>
      </section>
    );
  }

  const epic = candidates.reduce((best, e) =>
    e.remaining < best.remaining ? e : best,
  );

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="lbl">Хроніка</span>
        <Link href="/epics" scroll={false} className="text-[13px] text-[var(--color-muted3)]">
          усі →
        </Link>
      </div>
      <EpicCard epic={epic} compact />
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-12 w-44 rounded-[var(--radius-pill)]" />
        <Skeleton className="h-10 w-10 rounded-[var(--radius-pill)]" />
      </div>
      <Skeleton className="h-[320px] w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-[210px] w-full rounded-[var(--radius-lg)]" />
    </>
  );
}

export default function Page() {
  return null;
}

