"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { toast } from "sonner";
import { ProgressBar } from "@/components/ProgressBar";
import { UserFormDialog } from "@/components/UserFormDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useCurrentUser,
  useForecast,
  useLogWeight,
  useWeightHistory,
} from "@/hooks/useQueries";

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
    deltaActual,
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
        <Tile label="Зараз" value={fmtKg(currentWeight)} delta={deltaActual} />
        <Tile label="Ціль" value={fmtKg(targetWeight)} />
      </div>

      <ProgressBar value={done} />

      <WeighInRow currentWeight={currentWeight} />
      <WeightSparkline />

      <div>
        <p className="text-[15px] font-semibold text-[var(--color-text)]">
          Прогноз ШІ на сьогодні: {fmtKg(expectedWeight)}
        </p>
        <p className="mt-0.5 text-[13px] text-[var(--color-muted3)]">
          за журналом — дані за {loggedDays} {pluralDays(loggedDays)} з{" "}
          {totalDays}
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

/** Спарклайн останніх зважувань — тренд видно без сторінки статистики. */
function WeightSparkline() {
  const { data } = useWeightHistory();
  const points = (data?.items ?? []).slice(-30);
  if (points.length < 2) return null;

  const w = 320;
  const h = 44;
  const pad = 3;
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = Math.max(max - min, 0.5);
  const xy = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.weight - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = xy[xy.length - 1]!.split(",");

  return (
    <div>
      <svg
        aria-hidden
        viewBox={`0 0 ${w} ${h}`}
        className="h-[44px] w-full"
        preserveAspectRatio="none"
      >
        <polyline
          points={xy.join(" ")}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx={last[0]} cy={last[1]} r="3" fill="var(--color-accent)" />
      </svg>
      <div className="flex justify-between text-[11px] tabular-nums text-[var(--color-muted3)]">
        <span>{fmtKg(min)}</span>
        <span>
          {points.length} {points.length === 1 ? "запис" : points.length < 5 ? "записи" : "записів"}
        </span>
        <span>{fmtKg(max)}</span>
      </div>
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
