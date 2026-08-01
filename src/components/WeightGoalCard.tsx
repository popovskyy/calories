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
  useForecast,
  useLogWeight,
  useWeightHistory,
} from "@/hooks/useQueries";
import { shortDate } from "@/lib/date";

export function WeightGoalCard() {
  const { user } = useCurrentUser();
  const { data, isLoading } = useForecast();
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
    expectedWeight,
    deltaActual,
    projectedDate,
    daysLeft,
    loggedDays,
    totalDays,
    paceStatus,
    avgDeficitPct,
    plannedDeficitPct,
    calorieStance,
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

  let statusLabel = "Мало даних";
  if (paceStatus === "stalled") {
    statusLabel = "Темп не веде до цілі";
  } else if (paceStatus === "progressing" && projectedDate) {
    statusLabel = `Ціль ≈ ${shortDate(projectedDate)}`;
  }

  const deficitNote = deficitPaceNote(
    calorieStance,
    avgDeficitPct,
    plannedDeficitPct,
  );

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-center justify-between">
        <span className="lbl">Ціль по вазі</span>
        <span
          className="rounded-[var(--radius-pill)] px-2.5 py-1 text-[12px] font-semibold"
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
        <Tile label="Зараз" value={fmtKg(currentWeight)} delta={deltaActual} />
        <Tile label="Ціль" value={fmtKg(targetWeight)} />
      </div>

      <ProgressBar value={done} />

      <WeighInRow currentWeight={currentWeight} />

      {startWeight != null &&
      startWeightDate &&
      targetWeight != null &&
      projectedDate ? (
        <WeightChart
          points={history?.items ?? []}
          startWeight={startWeight}
          startWeightDate={startWeightDate}
          targetWeight={targetWeight}
          targetDate={projectedDate}
        />
      ) : null}

      <div>
        <p className="text-[15px] font-semibold text-[var(--color-text)]">
          Прогноз за журналом: {fmtKg(expectedWeight)}
        </p>
        <p className="mt-0.5 text-[13px] text-[var(--color-muted3)]">
          за журналом — дані за {loggedDays} {pluralDays(loggedDays)} з{" "}
          {totalDays}
        </p>
        {deficitNote ? (
          <p className="mt-1 text-[13px] text-[var(--color-muted2)]">
            {deficitNote}
          </p>
        ) : null}
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
}: {
  label: string;
  value: string;
  /** Зміна від старту: <0 — схудли (зелений), >0 — набрали (червоний). */
  delta?: number | null;
}) {
  const showDelta = delta != null && Math.abs(delta) >= 0.05;
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
            color: delta < 0 ? "var(--color-green)" : "var(--color-red)",
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

/** Пояснення глибини дефіциту простими словами (без жаргону «у плані»). */
function deficitPaceNote(
  stance: string | undefined,
  avgPct: number | null | undefined,
  plannedPct: number | null | undefined,
): string | null {
  if (avgPct == null || plannedPct == null || plannedPct <= 0) return null;

  // avgPct: −16 = їсть на 16% менше за підтримку; +5 = на 5% більше.
  if (avgPct > 3) {
    return `За журналом їси ≈ на ${avgPct}% більше, ніж треба щоб вага стояла — так до цілі не йде.`;
  }

  const depth = Math.abs(avgPct);
  const vsPlan =
    depth === plannedPct
      ? `як у плані (${plannedPct}%)`
      : depth > plannedPct
        ? `трохи глибше за план (${plannedPct}%)`
        : `м’якше за план (${plannedPct}%)`;

  switch (stance) {
    case "on_plan":
      return `За журналом їси ≈ на ${depth}% менше, ніж треба щоб вага стояла — ${vsPlan}, темп нормальний.`;
    case "shallow":
      return `За журналом дефіцит ≈ ${depth}% (план ${plannedPct}%) — худнеш, але повільніше. Можна ближче до плану.`;
    case "deep":
      return `За журналом їси ≈ на ${depth}% менше за підтримку — ${vsPlan}. Стеж, щоб не було замало.`;
    case "maintenance":
      return `Майже без дефіциту (план ${plannedPct}%) — до цілі майже не рухаєшся.`;
    case "surplus":
      return `За журналом більше за підтримку — вага може рости, не падати.`;
    default:
      return null;
  }
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дні";
  return "днів";
}
