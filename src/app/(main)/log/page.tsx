"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Dumbbell, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { DateSelector } from "@/components/DateSelector";
import { ProgressBar } from "@/components/ProgressBar";
import { MealCard } from "@/components/MealCard";
import { EditMealDialog } from "@/components/EditMealDialog";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
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

export default function LogPage() {
  const mounted = useMounted();
  const { user, isLoading } = useCurrentUser();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const meals = useMeals(selectedDate);
  const activities = useActivities(selectedDate);
  const del = useDeleteMeal(selectedDate);
  const delAct = useDeleteActivity(selectedDate);
  const [editMeal, setEditMeal] = useState<MealDTO | null>(null);

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

  const onDelete = (id: string) =>
    del.mutate(id, {
      onError: (e) => toast.error(e instanceof Error ? e.message : "Не вдалося видалити"),
    });

  return (
    <>
      <DateSelector
        date={selectedDate}
        onPrev={() => setSelectedDate(shiftYMD(selectedDate, -1))}
        onNext={() => setSelectedDate(shiftYMD(selectedDate, 1))}
        subline={`${user.name} · ${net.toLocaleString("uk-UA")} / ${target.toLocaleString("uk-UA")} ккал`}
      />

      <section className="mcard p-[15px_16px]">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[15px] text-[var(--color-muted)]">Баланс за день</span>
          <span
            className="text-[15px] font-semibold"
            style={{ color: over ? "var(--color-red)" : "var(--color-green)" }}
          >
            {Math.round(pct * 100)}%
          </span>
        </div>
        <ProgressBar value={pct} over={over} />
        <div className="mt-2 flex justify-between text-[13px] text-[var(--color-muted3)]">
          <span>Зʼїдено {consumed.toLocaleString("uk-UA")}</span>
          <span>Спалено {burned.toLocaleString("uk-UA")}</span>
        </div>
      </section>

      {meals.isLoading || activities.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : list.length === 0 && acts.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Ще немає записів"
          subtitle="Додайте їжу або активність кнопкою «＋»."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {acts.length > 0 ? (
            <section className="flex flex-col gap-2">
              <span className="lbl flex items-center gap-1.5">
                <Dumbbell size={14} /> Активність
              </span>
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
                        className="text-[13px] text-[var(--color-muted3)]"
                        disabled={delAct.isPending}
                        onClick={() =>
                          delAct.mutate(a.id, {
                            onError: (e) =>
                              toast.error(e instanceof Error ? e.message : "Помилка"),
                          })
                        }
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {list.length > 0 ? (
            <section className="flex flex-col">
              <span className="lbl mb-2">Їжа</span>
              <AnimatePresence initial={false}>
                {list.map((m, i) => (
                  <MealCard
                    key={m.id}
                    meal={m}
                    index={i}
                    onEdit={m.status === "cancelled" ? undefined : setEditMeal}
                    onDelete={m.status === "cancelled" ? undefined : onDelete}
                    deleting={del.isPending && del.variables === m.id}
                  />
                ))}
              </AnimatePresence>
            </section>
          ) : null}
        </div>
      )}

      <EditMealDialog
        open={!!editMeal}
        onOpenChange={(open) => {
          if (!open) setEditMeal(null);
        }}
        meal={editMeal}
        listDate={selectedDate}
      />
    </>
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
