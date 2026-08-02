"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ProgressBar";
import { UserFormDialog } from "@/components/UserFormDialog";
import { WeightChart } from "@/components/WeightChart";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useCurrentUser,
  useDashboard,
  useForecast,
  useLogWeight,
  useWeightHistory,
} from "@/hooks/useQueries";
import { shortDate } from "@/lib/date";
import { KCAL_PER_KG, isGoal, stanceLabelUk, type Goal } from "@/lib/calories";
import { weekFilledStats, type WeekFilledStats } from "@/lib/week-stats";
import type { ForecastResponse } from "@/lib/types";

export function WeightGoalCard() {
  const { user } = useCurrentUser();
  const { data, isLoading } = useForecast();
  const dash = useDashboard();
  const { data: history } = useWeightHistory();
  const [formOpen, setFormOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-[140px] w-full rounded-[var(--radius-lg)]" />;
  }

  if (!data?.configured) {
    return (
      <>
        <section className="mcard flex flex-col items-start gap-3 p-[18px]">
          <span className="lbl">Ціль по вазі</span>
          <p className="text-[15px] text-[var(--color-muted)]">
            Задайте цільову вагу — зʼявиться прогноз прогресу з журналу.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setFormOpen(true)}
          >
            Задайте цільову вагу
          </button>
        </section>
        <UserFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          user={user}
        />
      </>
    );
  }

  const {
    startWeight,
    startWeightDate,
    currentWeight,
    targetWeight,
    deltaActual,
    projectedDate,
    paceStatus,
    maintenanceKcal,
    targetKcal,
  } = data;

  const target = user?.targetCalories ?? data.targetKcal ?? 0;
  const rawGoal = user?.goal ?? "";
  const goal: Goal = isGoal(rawGoal) ? rawGoal : "maintain";
  const weekStats =
    dash.data && target > 0
      ? weekFilledStats(dash.data.days, target)
      : null;

  // Прогрес зі знаком: рух У БІК цілі. Раніше брався модуль, тож набір ваги
  // при цілі схуднути теж посував смужку вперед.
  const span = (targetWeight ?? 0) - (startWeight ?? 0);
  const moved = (currentWeight ?? 0) - (startWeight ?? 0);
  const done = span !== 0 ? Math.min(1, Math.max(0, moved / span)) : 1;
  /** −1 — ціль схуднути, +1 — набрати. Задає, який напрямок «зелений». */
  const goalDir = Math.sign(span);

  const remainingKg =
    startWeight != null && targetWeight != null && currentWeight != null
      ? Math.abs(currentWeight - targetWeight)
      : 0;

  // Плановий темп із калорійного плану — незалежний від зважувань орієнтир
  // для лінії плану на графіку.
  const planRateKgPerDay =
    maintenanceKcal != null && targetKcal != null
      ? (targetKcal - maintenanceKcal) / KCAL_PER_KG
      : null;

  let statusLabel = "Мало даних";
  if (paceStatus === "stalled") {
    statusLabel = "Темп не веде до цілі";
  } else if (paceStatus === "stale") {
    statusLabel = "Зважся — дані застаріли";
  } else if (paceStatus === "progressing" && projectedDate) {
    statusLabel = `Ціль ≈ ${shortDate(projectedDate)}`;
  }

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-center justify-between">
        <span className="lbl">Ціль по вазі</span>
        <span
          className="rounded-[var(--radius-pill)] px-2.5 py-1 text-[12px] font-semibold"
          // `stale` і `unknown` лишаються нейтральними: відсутність свіжих
          // даних — це не помилка користувача, червоним її позначати нема за що.
          style={{
            background:
              paceStatus === "stalled"
                ? "color-mix(in srgb, var(--color-red) 18%, transparent)"
                : paceStatus === "progressing"
                  ? "color-mix(in srgb, var(--color-green) 18%, transparent)"
                  : "color-mix(in srgb, var(--color-muted3) 18%, transparent)",
            color:
              paceStatus === "stalled"
                ? "var(--color-red)"
                : paceStatus === "progressing"
                  ? "var(--color-green)"
                  : "var(--color-muted2)",
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex gap-2.5">
        <Tile label="Старт" value={fmtKg(startWeight)} />
        <Tile
          label="Зараз"
          value={fmtKg(currentWeight)}
          delta={deltaActual}
          goalDir={goalDir}
        />
        <Tile label="Ціль" value={fmtKg(targetWeight)} />
      </div>

      <ProgressBar value={done} />

      <WeighInRow currentWeight={currentWeight} />

      {/* Графік не залежить від прогнозованої дати: він найпотрібніший саме
          тоді, коли темп стоїть і дати ще немає. */}
      {startWeight != null && startWeightDate && targetWeight != null ? (
        <WeightChart
          points={history?.items ?? []}
          startWeight={startWeight}
          startWeightDate={startWeightDate}
          targetWeight={targetWeight}
          planRateKgPerDay={planRateKgPerDay}
        />
      ) : null}

      <CalorieTrackRow forecast={data} goal={goal} />

      <SimpleBalanceBlock
        weekStats={weekStats}
        target={target}
        remainingKg={remainingKg}
        forecast={data}
      />

      <p className="text-[11px] text-[var(--color-muted3)]">
        Оцінка орієнтовна: 7700 ккал ≈ 1 кг
      </p>
    </section>
  );
}

/**
 * Калорійний трек від старту цілі: яку вагу «обіцяє» журнал і як вона
 * розходиться з вагами. Раніше `computeForecast` рахував це все й нікуди не
 * показував — а саме тут видно недозапис (ваги стоять, журнал обіцяє мінус)
 * або затримку води (навпаки).
 */
function CalorieTrackRow({
  forecast,
  goal,
}: {
  forecast: ForecastResponse;
  goal: Goal;
}) {
  const {
    expectedWeight,
    currentWeight,
    calorieStance,
    loggedDays,
    skippedDays,
    trendKgPerWeek,
  } = forecast;

  if (expectedWeight == null || currentWeight == null || loggedDays === 0) {
    return null;
  }

  const gap = Math.round((currentWeight - expectedWeight) * 10) / 10;

  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] bg-[var(--color-tile)] px-3 py-3">
      <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted3)]">
        Трек за калоріями
      </div>
      <p className="text-[14px] leading-snug text-[var(--color-text)]">
        Журнал обіцяє {fmtKg(expectedWeight)} · на вагах {fmtKg(currentWeight)}
      </p>
      {Math.abs(gap) >= 0.4 ? (
        <p className="text-[13px] leading-snug text-[var(--color-muted2)]">
          {gap > 0
            ? "Ваги йдуть повільніше за калорії — частіше недозапис або затримка води."
            : "Ваги випереджають калорійний трек — схоже, руху більше, ніж у журналі."}
        </p>
      ) : null}
      <p className="text-[13px] tabular-nums text-[var(--color-muted2)]">
        {calorieStance !== "unknown"
          ? `Темп журналу: ${stanceLabelUk(calorieStance, goal)}`
          : "Темп журналу: замало записів"}
        {trendKgPerWeek != null
          ? ` · ваги ${trendKgPerWeek > 0 ? "+" : "−"}${Math.abs(trendKgPerWeek).toFixed(2).replace(".", ",")} кг/тиж`
          : ""}
      </p>
      <p className="text-[12px] text-[var(--color-muted3)]">
        {loggedDays} {pluralDays(loggedDays)} у розрахунку
        {skippedDays > 0
          ? ` · ${skippedDays} ${pluralDays(skippedDays)} відкинуто як недозаписані`
          : ""}
      </p>
    </div>
  );
}

/**
 * Баланс цього тижня — ті самі цифри, що «Цей тиждень» (dashboard),
 * не forecast від старту цілі.
 */
function SimpleBalanceBlock({
  weekStats,
  target,
  remainingKg,
  forecast,
}: {
  weekStats: WeekFilledStats | null;
  target: number;
  remainingKg: number;
  forecast: ForecastResponse;
}) {
  const { daysLeft, paceStatus, projectedDate } = forecast;
  const loggedDays = weekStats?.loggedDays ?? 0;
  const avgNetKcal = weekStats?.avgNetKcal ?? null;
  const balanceVsTargetKcal = weekStats?.balanceVsTargetKcal ?? null;

  const balanceLine = formatTargetBalance(
    balanceVsTargetKcal,
    target,
    loggedDays,
  );

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] bg-[var(--color-tile)] px-3 py-3">
      <div>
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted3)]">
          Баланс за тиждень
        </div>
        {balanceLine ? (
          <p className="mt-0.5 text-[14px] font-medium leading-snug text-[var(--color-text)]">
            {balanceLine}
          </p>
        ) : (
          <p className="mt-0.5 text-[13px] text-[var(--color-muted2)]">
            Немає днів із записами їжі
          </p>
        )}
        {avgNetKcal != null && loggedDays > 0 ? (
          <p className="mt-1 text-[13px] tabular-nums text-[var(--color-muted2)]">
            середнє {avgNetKcal.toLocaleString("uk-UA")} · ціль{" "}
            {target.toLocaleString("uk-UA")} ккал/день · {loggedDays}{" "}
            {pluralDays(loggedDays)} із записами
          </p>
        ) : null}
      </div>

      <div className="h-px bg-[var(--color-divider)]" />

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px] text-[var(--color-muted2)]">
        <span>
          Залишилось {remainingKg.toFixed(1).replace(".", ",")} кг
        </span>
        <span>
          {paceStatus === "progressing" && projectedDate
            ? `≈ ${daysLeft} ${pluralDays(daysLeft ?? 0)} · ${shortDate(projectedDate)}`
            : paceStatus === "stalled"
              ? "темп зважувань не до цілі"
              : "мало зважувань для дати"}
        </span>
      </div>
    </div>
  );
}

function formatTargetBalance(
  vsTarget: number | null | undefined,
  target: number | null | undefined,
  logged: number,
): string | null {
  if (vsTarget == null || logged <= 0) return null;
  const abs = Math.abs(vsTarget);
  const near =
    Math.abs(vsTarget) <
    Math.max(80, Math.round((target ?? 2000) * 0.02) * logged);
  if (near) {
    return `Біля денної цілі за ${logged} ${pluralDays(logged)} із записами`;
  }
  if (vsTarget > 0) {
    return `Профіцит ≈ +${abs.toLocaleString("uk-UA")} ккал над денною ціллю · ${logged} ${pluralDays(logged)} із записами`;
  }
  return `Дефіцит ≈ −${abs.toLocaleString("uk-UA")} ккал від денної цілі · ${logged} ${pluralDays(logged)} із записами`;
}

/** Швидке зважування: одне поле і кнопка — без відкриття форми профілю. */
function WeighInRow({ currentWeight }: { currentWeight: number | null }) {
  const logWeight = useLogWeight();
  const [value, setValue] = useState("");

  const submit = () => {
    const w = Number(value.replace(",", "."));
    if (!Number.isFinite(w) || w < 30 || w > 300) {
      toast.error("Вкажи вагу від 30 до 300 кг");
      return;
    }
    logWeight.mutate(Math.round(w * 10) / 10, {
      onSuccess: (res) => {
        setValue("");
        toast.success(
          `Вагу записано: ${res.weight.toFixed(1).replace(".", ",")} кг`,
        );
      },
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Не вдалося записати"),
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Scale
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted3)]"
        />
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min={30}
          max={300}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={
            currentWeight != null
              ? `Зважився? Зараз ${currentWeight.toFixed(1).replace(".", ",")}`
              : "Вага, кг"
          }
          className="h-11 w-full rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-tile)] pl-9 pr-3 text-[15px] tabular-nums text-[var(--color-text)] placeholder:text-[var(--color-muted3)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm h-11 shrink-0 px-4"
        disabled={logWeight.isPending || value.trim() === ""}
        onClick={submit}
      >
        {logWeight.isPending ? "…" : "Записати"}
      </button>
    </div>
  );
}

function Tile({
  label,
  value,
  delta,
  goalDir = -1,
}: {
  label: string;
  value: string;
  /** Зміна від старту в кг (<0 — схудли, >0 — набрали). */
  delta?: number | null;
  /**
   * Напрямок цілі: −1 схуднути, +1 набрати. Зелений — рух ДО цілі, а не
   * «мінус на вагах»: при цілі набрати вагу набір і є прогресом.
   */
  goalDir?: number;
}) {
  const showDelta = delta != null && Math.abs(delta) >= 0.05;
  const towardGoal = delta != null && goalDir !== 0 && Math.sign(delta) === Math.sign(goalDir);
  return (
    <div className="tile flex-1 rounded-[var(--radius-md)] bg-[var(--color-tile)] px-2 py-2 text-center">
      <div className="text-[12px] text-[var(--color-muted3)]">{label}</div>
      <div className="text-[16px] font-semibold tabular-nums text-[var(--color-text)]">
        {value}
      </div>
      {showDelta ? (
        <div
          className="text-[12px] font-semibold tabular-nums"
          style={{
            color: towardGoal ? "var(--color-green)" : "var(--color-red)",
          }}
        >
          {delta < 0 ? "−" : "+"}
          {Math.abs(delta).toFixed(1).replace(".", ",")} кг
        </div>
      ) : delta != null ? (
        <div className="text-[12px] text-[var(--color-muted3)]">без змін</div>
      ) : null}
    </div>
  );
}

function fmtKg(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v.toFixed(1).replace(".", ",")} кг`;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дні";
  return "днів";
}
