"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Dumbbell, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { DateSelector } from "@/components/DateSelector";
import { ProgressBar } from "@/components/ProgressBar";
import { MealCard } from "@/components/MealCard";
import { EditMealDialog } from "@/components/EditMealDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { EmberFlash } from "@/components/hero/EmberFlash";
import { BeamFlash } from "@/components/hero/BeamFlash";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadError } from "@/components/ui/LoadError";
import {
  useActivities,
  useCurrentUser,
  useDeleteActivity,
  useDeleteMeal,
  useMeals,
} from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { useAppStore } from "@/store/useAppStore";
import { shiftYMD } from "@/lib/date";
import type { MealDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

type ConfirmState =
  | { kind: "meal"; id: string; label: string }
  | { kind: "activity"; id: string; label: string }
  | null;

type LogTab = "food" | "activity";

function LogPageInner() {
  const mounted = useMounted();
  const { user, isLoading } = useCurrentUser();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const searchParams = useSearchParams();
  const meals = useMeals(selectedDate);
  const activities = useActivities(selectedDate);
  const del = useDeleteMeal(selectedDate);
  const delAct = useDeleteActivity(selectedDate);
  const [editMeal, setEditMeal] = useState<MealDTO | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [tab, setTab] = useState<LogTab>("food");

  useEffect(() => {
    const d = searchParams.get("date");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      setSelectedDate(d);
    }
  }, [searchParams, setSelectedDate]);

  if (mounted && (meals.isError || activities.isError)) {
    return (
      <LoadError
        message="Не вдалося завантажити журнал"
        onRetry={() => {
          if (meals.isError) void meals.refetch();
          if (activities.isError) void activities.refetch();
        }}
      />
    );
  }
  if (!mounted || isLoading || !user) return <LogSkeleton />;

  const list = meals.data ?? [];
  const acts = activities.data ?? [];
  const consumed = list
    .filter((m) => m.status !== "cancelled")
    .reduce((s, m) => s + m.calories, 0);
  const burned = acts
    .filter((a) => a.status !== "cancelled")
    .reduce((s, a) => s + a.caloriesBurned, 0);
  const net = consumed - burned;
  const target = user.targetCalories;
  const pct = target > 0 ? net / target : 0;
  const over = net > target;

  const onConfirmDelete = () => {
    if (!confirm) return;
    if (confirm.kind === "meal") {
      del.mutate(confirm.id, {
        onSuccess: () => setConfirm(null),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Не вдалося видалити"),
      });
    } else {
      delAct.mutate(confirm.id, {
        onSuccess: () => setConfirm(null),
        onError: (e) =>
          toast.error(e instanceof Error ? e.message : "Помилка"),
      });
    }
  };

  return (
    <>
      <DateSelector
        date={selectedDate}
        onPrev={() => setSelectedDate(shiftYMD(selectedDate, -1))}
        onNext={() => setSelectedDate(shiftYMD(selectedDate, 1))}
        subline={`${user.name} · ${net.toLocaleString("uk-UA")} / ${target.toLocaleString("uk-UA")} ккал`}
      />

      <section className="mcard p-[15px_16px]">
        <EmberFlash />
        <BeamFlash />
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[15px] text-[var(--color-muted)]">Баланс за день</span>
          <span
            className="text-[15px] font-semibold"
            style={{ color: over ? "var(--color-red)" : "var(--color-green)" }}
          >
            {Math.round(pct * 100)}%
          </span>
        </div>
        <ProgressBar value={pct} over={over} frame={user.frame} />
        <div className="mt-2 flex justify-between text-[13px] text-[var(--color-muted3)]">
          <span>Зʼїдено {consumed.toLocaleString("uk-UA")}</span>
          <span>Спалено {burned.toLocaleString("uk-UA")}</span>
        </div>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("food")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] font-semibold transition-colors",
            tab === "food"
              ? "bg-[var(--color-accent)] text-[#f5f4ff]"
              : "bg-[var(--color-tile)] text-[var(--color-muted2)]",
          )}
        >
          <UtensilsCrossed size={16} /> Харчування
        </button>
        <button
          type="button"
          onClick={() => setTab("activity")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] font-semibold transition-colors",
            tab === "activity"
              ? "bg-[var(--color-accent)] text-[#f5f4ff]"
              : "bg-[var(--color-tile)] text-[var(--color-muted2)]",
          )}
        >
          <Dumbbell size={16} /> Активність
        </button>
      </div>

      {meals.isLoading || activities.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : tab === "food" ? (
        list.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            context="log"
            action={
              <Link href="/add" className="btn btn-primary btn-sm">
                Додати запис
              </Link>
            }
          />
        ) : (
          <section className="flex flex-col">
            <AnimatePresence initial={false}>
              {list.map((m, i) => (
                <MealCard
                  key={m.id}
                  meal={m}
                  index={i}
                  onEdit={m.status === "cancelled" ? undefined : setEditMeal}
                  onDelete={
                    m.status === "cancelled"
                      ? undefined
                      : (id) =>
                          setConfirm({
                            kind: "meal",
                            id,
                            label: `«${m.description}» — ${m.calories} ккал. Дію не можна скасувати.`,
                          })
                  }
                  deleting={del.isPending && del.variables === m.id}
                />
              ))}
            </AnimatePresence>
          </section>
        )
      ) : acts.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          context="log"
          action={
            <Link href="/add/activity" className="btn btn-primary btn-sm">
              Додати запис
            </Link>
          }
        />
      ) : (
        <section className="flex flex-col gap-2">
          {acts.map((a) => (
            <div
              key={a.id}
              className={cn(
                "mcard flex items-center justify-between gap-3 p-3",
                a.status === "cancelled" && "opacity-50 line-through",
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold text-[var(--color-text)]">
                  {a.description}
                </div>
                <div className="text-[13px] text-[var(--color-muted3)]">
                  {a.status === "cancelled"
                    ? "Скасовано адміном"
                    : a.durationMin
                      ? `${a.durationMin} хв`
                      : "активність"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[18px] font-semibold text-[var(--color-green)]">
                  −{a.caloriesBurned}
                </span>
                {a.status !== "cancelled" ? (
                  <button
                    type="button"
                    className="icon-btn hover:text-[var(--color-red)]"
                    aria-label="Видалити активність"
                    disabled={delAct.isPending}
                    onClick={() =>
                      setConfirm({
                        kind: "activity",
                        id: a.id,
                        label: `«${a.description}» — −${a.caloriesBurned} ккал. Дію не можна скасувати.`,
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      )}

      <EditMealDialog
        open={!!editMeal}
        onOpenChange={(open) => {
          if (!open) setEditMeal(null);
        }}
        meal={editMeal}
        listDate={selectedDate}
      />

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title="Видалити запис?"
        description={confirm?.label}
        danger
        pending={del.isPending || delAct.isPending}
        onConfirm={onConfirmDelete}
      />
    </>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={<LogSkeleton />}>
      <LogPageInner />
    </Suspense>
  );
}

function LogSkeleton() {
  return (
    <>
      <Skeleton className="mx-auto h-12 w-56 rounded-[var(--radius-md)]" />
      <Skeleton className="h-[62px] w-full rounded-[var(--radius-lg)]" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[88px] w-full rounded-[var(--radius-lg)]" />
      ))}
    </>
  );
}
