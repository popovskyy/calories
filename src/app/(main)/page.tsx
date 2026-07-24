"use client";

import { DashboardHeader } from "@/components/DashboardHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { MacroTiles } from "@/components/MacroTiles";
import { WeeklyChart } from "@/components/WeeklyChart";
import { WeeklyQuestsCard } from "@/components/WeeklyQuestsCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentUser, useDashboard } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { humanDate, todayYMD } from "@/lib/date";

export default function DashboardPage() {
  const mounted = useMounted();
  const { user, isLoading } = useCurrentUser();
  const dash = useDashboard();

  if (!mounted || isLoading || !user) return <DashboardSkeleton />;

  const today = dash.data?.today;
  const over = (today?.difference ?? 0) < 0;

  return (
    <>
      <DashboardHeader />

      {/* Кільце прогресу */}
      <section className="mcard flex flex-col items-center gap-2 p-[22px_20px]">
        <div className="flex w-full items-center justify-between">
          <span className="lbl">Сьогодні · {humanDate(todayYMD())}</span>
          {today ? (
            over ? (
              <span
                className="tag"
                style={{
                  background: "color-mix(in srgb, var(--color-red) 20%, transparent)",
                  color: "var(--color-red)",
                }}
              >
                Перебір
              </span>
            ) : (
              <span className="tag tag-accent">Дефіцит</span>
            )
          ) : null}
        </div>

        {dash.isLoading || !today ? (
          <Skeleton className="my-1.5 h-[200px] w-[200px] rounded-full" />
        ) : (
          <ProgressRing consumed={today.totalCalories} target={user.targetCalories} />
        )}

        {today ? (
          <MacroTiles protein={today.protein} fats={today.fats} carbs={today.carbs} />
        ) : (
          <div className="flex w-full gap-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[54px] flex-1" />
            ))}
          </div>
        )}
      </section>

      {/* Квести тижня */}
      <WeeklyQuestsCard />

      {/* Тижневий графік */}
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
    </>
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
