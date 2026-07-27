"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CalorieHero } from "@/components/hero/CalorieHero";
import { DailyCardsRow } from "@/components/DailyCardsRow";
import { EpicCard } from "@/components/EpicCard";
import { MacroTiles } from "@/components/MacroTiles";
import { QuestChip } from "@/components/QuestChip";
import { ThemeAspirationHint } from "@/components/ThemeAspirationHint";
import { WeeklyChart } from "@/components/WeeklyChart";
import { WeeklyQuestsCard } from "@/components/WeeklyQuestsCard";
import { WeightGoalCard } from "@/components/WeightGoalCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentUser, useDashboard, useEpics } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { calcMacroTargets } from "@/lib/calories";
import { humanDate, todayYMD } from "@/lib/date";

export default function DashboardPage() {
  const mounted = useMounted();
  const { user, isLoading } = useCurrentUser();
  const dash = useDashboard();
  const moreRef = useRef<HTMLDetailsElement>(null);

  if (!mounted || isLoading || !user) return <DashboardSkeleton />;

  const today = dash.data?.today;
  const over = (today?.difference ?? 0) < 0;
  const macroTargets = calcMacroTargets(user.targetCalories, user.weight);

  const openQuests = () => {
    const el = moreRef.current;
    if (!el) return;
    el.open = true;
    requestAnimationFrame(() => {
      document.getElementById("weekly-quests")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  return (
    <>
      <DashboardHeader />

      {/* Кільце прогресу — герой першого viewport */}
      <section className="mcard flex flex-col items-center gap-3 p-[26px_20px_22px] shadow-[var(--shadow-card-lg)]">
        <div className="flex w-full items-center justify-between">
          <span className="lbl">Сьогодні · {humanDate(todayYMD())}</span>
          {today ? (
            over ? (
              <span
                className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[14px] font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--color-red) 20%, transparent)",
                  color: "var(--color-red)",
                }}
              >
                Перебір
              </span>
            ) : (
              <span className="rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--color-accent)_22%,transparent)] px-3 py-1.5 text-[14px] font-semibold text-[var(--color-accent-300)]">
                Дефіцит
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

      {/* Картки дня — щоденна дія має бути вище за тижневу */}
      <DailyCardsRow />

      <ThemeAspirationHint />

      {/* Один квест тижня видимий без dump списку на home */}
      <QuestChip onOpen={openQuests} />

      {/*
        Вага / квести / хроніки / графік — поза першим екраном.
        Інакше головна читається як дашборд SaaS.
      */}
      <details ref={moreRef} className="group">
        <summary className="mcard flex cursor-pointer list-none items-center justify-between gap-2 px-[18px] py-3.5 [&::-webkit-details-marker]:hidden">
          <span className="lbl !mb-0">Ще</span>
          <span className="flex items-center gap-1.5 text-[14px] text-[var(--color-muted3)]">
            вага · квести · графік
            <ChevronDown
              size={16}
              className="shrink-0 transition-transform duration-[var(--duration-ui)] group-open:rotate-180"
            />
          </span>
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          <WeightGoalCard />
          <div id="weekly-quests">
            <WeeklyQuestsCard />
          </div>
          <ActiveEpic />
          <section className="mcard p-[18px_18px_16px]">
            <div className="mb-3.5 flex items-baseline justify-between">
              <span className="lbl">Останні 7 днів</span>
              <span className="text-[14px] text-[var(--color-muted3)]">
                ціль {user.targetCalories.toLocaleString("uk-UA")}
              </span>
            </div>
            {dash.data ? (
              <WeeklyChart days={dash.data.days} target={user.targetCalories} />
            ) : (
              <Skeleton className="h-[150px] w-full" />
            )}
          </section>
        </div>
      </details>
    </>
  );
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
        <Link href="/epics" className="btn btn-primary btn-sm shrink-0">
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
        <Link href="/epics" className="text-[13px] text-[var(--color-muted3)]">
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
