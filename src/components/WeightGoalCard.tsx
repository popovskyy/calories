"use client";

import { useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { UserFormDialog } from "@/components/UserFormDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentUser, useForecast } from "@/hooks/useQueries";

export function WeightGoalCard() {
  const { user } = useCurrentUser();
  const { data, isLoading } = useForecast();
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
    currentWeight,
    targetWeight,
    expectedWeight,
    plannedWeightToday,
    daysLeft,
    loggedDays,
    totalDays,
    scheduleStatus,
  } = data;

  const totalSpan = Math.abs((startWeight ?? 0) - (targetWeight ?? 0));
  const done =
    totalSpan > 0
      ? Math.min(
          1,
          Math.max(0, Math.abs((startWeight ?? 0) - (currentWeight ?? 0)) / totalSpan),
        )
      : 1;

  const remainingKg =
    startWeight != null && targetWeight != null && currentWeight != null
      ? Math.abs(currentWeight - targetWeight)
      : 0;

  const vsPlan =
    currentWeight != null && plannedWeightToday != null
      ? Math.round((currentWeight - plannedWeightToday) * 10) / 10
      : 0;

  let statusLabel = "За планом";
  if (scheduleStatus === "ahead") {
    statusLabel = `Випереджаєте на ${Math.abs(vsPlan).toFixed(1).replace(".", ",")} кг`;
  } else if (scheduleStatus === "behind") {
    statusLabel = `Відстаєте на ${Math.abs(vsPlan).toFixed(1).replace(".", ",")} кг`;
  } else if (scheduleStatus === "unknown") {
    statusLabel = "Мало даних";
  }

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-center justify-between">
        <span className="lbl">Ціль по вазі</span>
        <span
          className="rounded-[var(--radius-pill)] px-2.5 py-1 text-[12px] font-semibold"
          style={{
            background:
              scheduleStatus === "behind"
                ? "color-mix(in srgb, var(--color-red) 18%, transparent)"
                : "color-mix(in srgb, var(--color-green) 18%, transparent)",
            color:
              scheduleStatus === "behind"
                ? "var(--color-red)"
                : "var(--color-green)",
          }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="flex gap-2.5">
        <Tile label="Старт" value={fmtKg(startWeight)} />
        <Tile label="Зараз" value={fmtKg(currentWeight)} />
        <Tile label="Ціль" value={fmtKg(targetWeight)} />
      </div>

      <ProgressBar value={done} />

      <div>
        <p className="text-[15px] font-semibold text-[var(--color-text)]">
          Прогноз ШІ на сьогодні: {fmtKg(expectedWeight)}
        </p>
        <p className="mt-0.5 text-[13px] text-[var(--color-muted3)]">
          за журналом — дані за {loggedDays} з {totalDays}{" "}
          {pluralDays(totalDays)}
        </p>
      </div>

      <div className="flex items-center justify-between text-[13px] text-[var(--color-muted2)]">
        <span>
          Залишилось {remainingKg.toFixed(1).replace(".", ",")} кг · {daysLeft}{" "}
          {pluralDays(daysLeft ?? 0)}
        </span>
      </div>

      <p className="text-[11px] text-[var(--color-muted3)]">
        Оцінка орієнтовна: 7700 ккал ≈ 1 кг
      </p>
    </section>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile flex-1 rounded-[var(--radius-md)] bg-[var(--color-tile)] px-2 py-2 text-center">
      <div className="text-[12px] text-[var(--color-muted3)]">{label}</div>
      <div className="text-[16px] font-semibold tabular-nums text-[var(--color-text)]">
        {value}
      </div>
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
  if (mod10 === 1 && mod100 !== 11) return "дня";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дні";
  return "днів";
}
