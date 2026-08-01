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
import type { ForecastResponse } from "@/lib/types";

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
          ledgerWeight={expectedWeight}
        />
      ) : null}

      <JournalForecastBlock data={data} remainingKg={remainingKg} />

      <p className="text-[11px] text-[var(--color-muted3)]">
        Оцінка орієнтовна: 7700 ккал ≈ 1 кг
      </p>
    </section>
  );
}

/** Блок «журнал vs ваги» — окремі рядки, без суцільного дрібного тексту. */
function JournalForecastBlock({
  data,
  remainingKg,
}: {
  data: ForecastResponse;
  remainingKg: number;
}) {
  const {
    startWeight,
    currentWeight,
    expectedWeight,
    loggedDays,
    totalDays,
    daysLeft,
    paceStatus,
    projectedDate,
    maintenanceKcal,
    targetKcal,
    avgNetKcal,
    balanceVsTargetKcal,
    balanceVsMaintenanceKcal,
    daysOverTarget,
    calorieStance,
    plannedDeficitPct,
  } = data;

  const scaleVsLedger =
    currentWeight != null && expectedWeight != null
      ? Math.round((currentWeight - expectedWeight) * 10) / 10
      : null;

  const balanceLine = formatBalanceLine(
    balanceVsTargetKcal,
    balanceVsMaintenanceKcal,
    targetKcal,
    daysOverTarget,
    loggedDays,
  );
  const stanceLine = stanceSummary(
    calorieStance,
    plannedDeficitPct,
    avgNetKcal,
    maintenanceKcal,
  );
  const factVsLedgerLine = scaleGapLine(scaleVsLedger, calorieStance);

  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-tile)] px-3 py-3">
      <div>
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted3)]">
          Вага за калоріями
        </div>
        <div className="mt-0.5 text-[18px] font-semibold tabular-nums text-[var(--color-text)]">
          {fmtKg(expectedWeight)}
        </div>
        <p className="mt-0.5 text-[13px] text-[var(--color-muted2)]">
          від старту {fmtKg(startWeight)} · журнал{" "}
          {loggedDays}/{totalDays} {pluralDays(totalDays)}
        </p>
      </div>

      {factVsLedgerLine ? (
        <p
          className="text-[13px] leading-snug"
          style={{
            color:
              scaleVsLedger != null && scaleVsLedger < -0.15
                ? "var(--color-green)"
                : scaleVsLedger != null && scaleVsLedger > 0.15
                  ? "var(--color-red)"
                  : "var(--color-muted2)",
          }}
        >
          {factVsLedgerLine}
        </p>
      ) : null}

      <div className="h-px bg-[var(--color-divider)]" />

      <div>
        <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--color-muted3)]">
          Баланс журналу
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
        {stanceLine ? (
          <p className="mt-1 text-[13px] leading-snug text-[var(--color-muted2)]">
            {stanceLine}
          </p>
        ) : null}
        {maintenanceKcal != null && targetKcal != null && avgNetKcal != null ? (
          <p className="mt-1 text-[12px] tabular-nums text-[var(--color-muted3)]">
            ціль {targetKcal} · підтримка {maintenanceKcal} · середнє{" "}
            {avgNetKcal} ккал/день
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

function formatBalanceLine(
  vsTarget: number | null | undefined,
  vsMaint: number | null | undefined,
  target: number | null | undefined,
  daysOver: number,
  logged: number,
): string | null {
  if (vsTarget == null || logged <= 0) return null;
  const abs = Math.abs(vsTarget);
  const overHint =
    daysOver > 0
      ? ` · ${daysOver} ${pluralDays(daysOver)} над ціллю`
      : "";
  if (Math.abs(vsTarget) < Math.max(80, Math.round((target ?? 2000) * 0.02) * logged)) {
    const maintBit =
      vsMaint != null && Math.abs(vsMaint) >= 80
        ? vsMaint < 0
          ? ` (від підтримки ще −${Math.abs(vsMaint)} ккал)`
          : ` (над підтримкою +${vsMaint} ккал)`
        : "";
    return `Біля денної цілі за період${maintBit}${overHint}`;
  }
  if (vsTarget > 0) {
    return `Профіцит ≈ +${abs} ккал над денною ціллю${overHint}`;
  }
  return `Дефіцит ≈ −${abs} ккал від денної цілі${overHint}`;
}

function stanceSummary(
  stance: ForecastResponse["calorieStance"] | undefined,
  plannedPct: number | null | undefined,
  avgNet: number | null | undefined,
  maintenance: number | null | undefined,
): string | null {
  if (!stance || stance === "unknown" || plannedPct == null || plannedPct <= 0) {
    return null;
  }
  const depth =
    avgNet != null && maintenance != null && maintenance > 0
      ? Math.abs(Math.round(((avgNet - maintenance) / maintenance) * 100))
      : null;

  switch (stance) {
    case "on_plan":
      return depth != null
        ? `Темп ≈ −${depth}% від підтримки (план −${plannedPct}%) — ок.`
        : `Темп у межах плану (−${plannedPct}% від підтримки).`;
    case "shallow":
      return `Дефіцит м’якший за план (−${plannedPct}%): худнеш повільніше, бо були дні над ціллю.`;
    case "deep":
      return `Глибше за план (−${plannedPct}%) — стеж, щоб не було замало їжі.`;
    case "maintenance":
      return `Майже без дефіциту при плані −${plannedPct}% — до цілі майже не рухає журнал.`;
    case "surplus":
      return `Журнал у профіциті над підтримкою — калорії тягнуть вагу вгору, не до цілі.`;
    default:
      return null;
  }
}

function scaleGapLine(
  scaleVsLedger: number | null,
  stance: ForecastResponse["calorieStance"] | undefined,
): string | null {
  if (scaleVsLedger == null || Math.abs(scaleVsLedger) < 0.15) {
    return "На вагах і за калоріями зараз близько.";
  }
  if (scaleVsLedger < 0) {
    // current < expected → lighter on scale than journal predicts
    const gap = Math.abs(scaleVsLedger).toFixed(1).replace(".", ",");
    if (stance === "surplus" || stance === "shallow" || stance === "maintenance") {
      return `На вагах легше на ${gap} кг, ніж каже журнал — але за калоріями темп слабкий або з переборами.`;
    }
    return `На вагах легше на ${gap} кг, ніж каже журнал (факт попереду калорій).`;
  }
  const gap = scaleVsLedger.toFixed(1).replace(".", ",");
  return `На вагах важче на ${gap} кг, ніж каже журнал — калорії ще не «наздогнали» ваги.`;
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

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дні";
  return "днів";
}
