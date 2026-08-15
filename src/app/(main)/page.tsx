"use client";

import dynamic from "next/dynamic";
import { DashboardHeader } from "@/components/DashboardHeader";
import { CalorieHero } from "@/components/hero/CalorieHero";
import { MacroTiles } from "@/components/MacroTiles";
import { WeightGoalCard } from "@/components/WeightGoalCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadError } from "@/components/ui/LoadError";
import { useCurrentUser, useDashboard } from "@/hooks/useQueries";
import { calcMacroTargets, calcMaintenanceCalories } from "@/lib/calories";
import { humanDate, todayYMD } from "@/lib/date";
import { liveDayTone, toneBg, toneColor } from "@/lib/status-tone";
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

export function OverviewTab() {
  const { user, isLoading, isError, refetch } = useCurrentUser();
  const dash = useDashboard();

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
  const maintenance = calcMaintenanceCalories({
    birthYear: user.birthYear,
    birthMonth: user.birthMonth,
    sex: user.sex,
    weightKg: user.weight,
    heightCm: user.height,
  });
  const todayTone = today
    ? liveDayTone(today.totalCalories, user.targetCalories, maintenance, user.goal)
    : "neutral";

  return (
    <>
      <DashboardHeader />

      <section className="mcard flex flex-col items-center gap-3 p-[26px_20px_22px] shadow-[var(--shadow-card-lg)]">
        <div className="flex w-full items-center justify-between gap-2">
          <span className="lbl min-w-0 truncate whitespace-nowrap">
            {humanDate(todayYMD())}
          </span>
          {today ? (
            <span
              className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap rounded-[var(--radius-pill)] px-2.5 py-1 text-[13px] font-semibold"
              style={{
                background: toneBg(todayTone, 20),
                color: toneColor(todayTone),
              }}
            >
              {over ? (
                <>
                  <span className="font-medium opacity-80">Перебір</span>
                  <span className="tabular-nums">
                    {Math.abs(diff).toLocaleString("uk-UA")}
                  </span>
                </>
              ) : diff === 0 ? (
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
            maintenance={maintenance}
            consumed={today.totalCalories}
            target={user.targetCalories}
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

      <WeightGoalCard />

      <section className="mcard p-[18px_18px_16px]">
        <div className="mb-3.5 flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <span className="lbl">Цей тиждень</span>
            {dash.data ? (
              <WeekAvgLine
                days={dash.data.days}
                today={dash.data.today}
                target={user.targetCalories}
                maintenance={maintenance}
                goal={user.goal}
              />
            ) : null}
          </div>
          <span className="shrink-0 text-[14px] text-[var(--color-muted3)]">
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
            ? `сьогодні ${today.totalCalories.toLocaleString("uk-UA")} · день триває`
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
  return <OverviewTab />;
}
