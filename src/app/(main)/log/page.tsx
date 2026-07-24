"use client";

import { AnimatePresence } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { DateSelector } from "@/components/DateSelector";
import { ProgressBar } from "@/components/ProgressBar";
import { MealCard } from "@/components/MealCard";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentUser, useDeleteMeal, useMeals } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { useAppStore } from "@/store/useAppStore";
import { shiftYMD } from "@/lib/date";

export default function LogPage() {
  const mounted = useMounted();
  const { user, isLoading } = useCurrentUser();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const meals = useMeals(selectedDate);
  const del = useDeleteMeal(selectedDate);

  if (!mounted || isLoading || !user) return <LogSkeleton />;

  const list = meals.data ?? [];
  const consumed = list.reduce((s, m) => s + m.calories, 0);
  const target = user.targetCalories;
  const pct = target > 0 ? consumed / target : 0;
  const over = consumed > target;

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
        subline={`${user.name} · ${consumed.toLocaleString("uk-UA")} / ${target.toLocaleString("uk-UA")} ккал`}
      />

      <section className="mcard p-[15px_16px]">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] text-[var(--color-muted)]">Спожито за день</span>
          <span
            className="text-[13px] font-semibold"
            style={{ color: over ? "var(--color-red)" : "var(--color-green)" }}
          >
            {Math.round(pct * 100)}%
          </span>
        </div>
        <ProgressBar value={pct} over={over} />
      </section>

      {meals.isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Ще немає записів"
          subtitle="Додайте перший прийом їжі за цей день кнопкою «＋»."
        />
      ) : (
        <div className="flex flex-col">
          <AnimatePresence initial={false}>
            {list.map((m, i) => (
              <MealCard
                key={m.id}
                meal={m}
                index={i}
                onDelete={onDelete}
                deleting={del.isPending && del.variables === m.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
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
