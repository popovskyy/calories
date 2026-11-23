"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Dumbbell, Sparkles, Zap } from "lucide-react";
import { addDays, defaultWeekStart, formatWeekRange, weekdayIndex, WEEKDAY_LONG } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { BLOCKS, BLOCK_LABEL } from "@/lib/types";
import { useToday } from "@/hooks/useToday";
import {
  useAdaptDay,
  useEquipment,
  useGeneratePlan,
  usePlan,
  useProfile,
  useToggleLog,
} from "@/hooks/queries";
import { HoldToCompleteButton } from "@/components/HoldToCompleteButton";
import { AdaptSheet } from "@/components/plan/AdaptSheet";
import { DayCard } from "@/components/plan/DayCard";
import { DaySelector } from "@/components/plan/DaySelector";
import { ExerciseCard } from "@/components/plan/ExerciseCard";
import { GenerateSheet } from "@/components/plan/GenerateSheet";
import { GeneratingOverlay } from "@/components/plan/GeneratingOverlay";

export function PlanScreen() {
  const today = useToday();
  // До маунта дата невідома (SSR у UTC) — малюємо скелетон, щоб не було hydration mismatch
  if (!today) return <PlanSkeleton />;
  return <PlanContent today={today} />;
}

function PlanContent({ today }: { today: string }) {
  const [weekStart, setWeekStart] = useState(() => defaultWeekStart(today));
  const [picked, setPicked] = useState<{ week: string; day: number } | null>(null);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const profile = useProfile();
  const equipment = useEquipment();
  const planQ = usePlan(weekStart);
  const generate = useGeneratePlan(weekStart);
  const adapt = useAdaptDay(weekStart);
  const toggle = useToggleLog(weekStart);

  const plan = planQ.data ?? null;

  // Обраний день виводимо, а не зберігаємо в ефекті: сьогодні (якщо в цьому тижні), інакше Пн
  const defaultDay = useMemo(() => {
    const idx = weekdayIndex(today);
    return today >= weekStart && today <= addDays(weekStart, 4) && idx <= 4 ? idx : 0;
  }, [today, weekStart]);
  const selected = picked && picked.week === weekStart ? picked.day : defaultDay;
  const day = plan?.days.find((d) => d.weekday === selected) ?? null;
  const activeEquipmentCount = (equipment.data ?? []).filter((e) => e.active).length;

  const hasProgress = !!plan?.days.some((d) => d.completedExerciseIds.length > 0 || d.workoutCompletedAt);
  const dayFinished = day?.workoutCompletedAt != null;
  const done = new Set(day?.completedExerciseIds ?? []);

  const shiftWeek = (delta: number) => {
    setWeekStart((w) => addDays(w, delta * 7));
    setPicked(null);
  };

  const log = (exerciseId: string | null, isDone: boolean) => {
    if (!day) return;
    toggle.mutate({ dayId: day.id, exerciseId, done: isDone });
  };

  const p = profile.data;

  return (
    <section className="space-y-4">
      {/* Телеметрія атлета + адаптація */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-volt" />
            <span className="truncate font-mono text-[11px] tracking-wider text-gray-400 uppercase">
              {p ? `${p.name} · ${p.age} р.` : "Атлет"}
            </span>
          </div>
          <h1 className="mt-0.5 text-lg font-bold tracking-tight text-white">
            {p ? (
              <>
                {p.heightCm} см <span className="font-normal text-gray-600">·</span>{" "}
                <span className="font-mono text-volt">{p.weightKg} кг</span>
              </>
            ) : (
              <span className="inline-block h-6 w-28 rounded skeleton" />
            )}
          </h1>
        </div>
        <button
          onClick={() => setAdaptOpen(true)}
          disabled={!day || dayFinished || adapt.isPending}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3 py-2 text-xs font-semibold text-gray-100 shadow-sm transition hover:border-volt/40 active:scale-95 disabled:opacity-40"
        >
          <Zap className="h-3.5 w-3.5 text-volt" strokeWidth={2.2} />
          Адаптувати
        </button>
      </div>

      {/* Навігація по тижнях + новий тиждень */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button aria-label="Попередній тиждень" onClick={() => shiftWeek(-1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[88px] text-center font-mono text-xs font-semibold text-gray-200 tabular-nums">
            {formatWeekRange(weekStart)}
          </span>
          <button aria-label="Наступний тиждень" onClick={() => shiftWeek(1)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {plan && (
          <button
            onClick={() => setGenOpen(true)}
            disabled={generate.isPending}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 transition hover:border-volt/40 hover:text-volt active:scale-95 disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Новий тиждень
          </button>
        )}
      </div>

      {planQ.isPending ? (
        <PlanSkeleton inline />
      ) : planQ.isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Не вдалося завантажити план: {planQ.error.message}
          <button onClick={() => planQ.refetch()} className="mt-2 block font-semibold underline">
            Спробувати ще
          </button>
        </div>
      ) : !plan ? (
        <EmptyPlan
          weekLabel={formatWeekRange(weekStart)}
          noEquipment={equipment.isSuccess && activeEquipmentCount === 0}
          onGenerate={() => setGenOpen(true)}
        />
      ) : (
        <>
          <DaySelector days={plan.days} selected={selected} today={today} onSelect={(d) => setPicked({ week: weekStart, day: d })} />

          {plan.summary && (
            <div className="rounded-2xl border border-white/[0.07] bg-surface">
              <button
                type="button"
                onClick={() => setSummaryOpen((v) => !v)}
                aria-expanded={summaryOpen}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[11px] tracking-wider text-gray-400 uppercase"
              >
                Логіка тижня від тренера
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", summaryOpen && "rotate-180")} />
              </button>
              <div className="accordion" data-open={summaryOpen}>
                <div>
                  <p className="px-3.5 pb-3 text-xs leading-relaxed text-gray-300">{plan.summary}</p>
                </div>
              </div>
            </div>
          )}

          {day && (
            <div key={`${weekStart}-${day.id}-${day.adaptedMode ?? ""}`} className="space-y-4">
              <DayCard day={day} />

              {adapt.isPending ? (
                <div className="space-y-3" aria-busy>
                  <div className="skeleton h-20 rounded-2xl" />
                  <div className="skeleton h-20 rounded-2xl" />
                  <div className="skeleton h-20 rounded-2xl" />
                </div>
              ) : (
                <>
                  <p className="flex items-center justify-end gap-1 px-1 text-[11px] text-gray-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-volt" />
                    Затисни кнопку на 1.5 с для фіксації
                  </p>

                  {BLOCKS.map((block) => {
                    const items = day.exercises.filter((e) => e.block === block);
                    if (items.length === 0) return null;
                    return (
                      <div key={block} className="space-y-2.5">
                        <h3 className="px-1 font-mono text-[11px] tracking-widest text-gray-400 uppercase">
                          {BLOCK_LABEL[block]}
                        </h3>
                        {items.map((ex) => (
                          <ExerciseCard
                            key={ex.id}
                            exercise={ex}
                            done={done.has(ex.id)}
                            onComplete={() => log(ex.id, true)}
                            onUndo={() => log(ex.id, false)}
                          />
                        ))}
                      </div>
                    );
                  })}

                  <div className="pt-1">
                    <HoldToCompleteButton
                      variant="bar"
                      completed={dayFinished}
                      onComplete={() => log(null, true)}
                      onUndo={() => log(null, false)}
                      label="Затисни, щоб завершити тренування"
                      doneLabel="Тренування зараховано"
                    />
                    {dayFinished && (
                      <p className="mt-2 text-center text-[11px] text-gray-500">
                        {WEEKDAY_LONG[day.weekday]}: чудова робота! Торкнись кнопки, щоб скасувати.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      <AdaptSheet
        open={adaptOpen}
        onOpenChange={setAdaptOpen}
        dayLabel={day ? WEEKDAY_LONG[day.weekday] : ""}
        onPick={(mode, note) => {
          setAdaptOpen(false);
          if (day) adapt.mutate({ dayId: day.id, mode, note });
        }}
      />
      <GenerateSheet
        open={genOpen}
        onOpenChange={setGenOpen}
        weekLabel={formatWeekRange(weekStart)}
        hasPlan={!!plan}
        hasProgress={hasProgress}
        onGenerate={(note) => {
          setGenOpen(false);
          generate.mutate(note);
        }}
      />
      {generate.isPending && <GeneratingOverlay title="Тренер складає план" />}
    </section>
  );
}

function EmptyPlan({ weekLabel, noEquipment, onGenerate }: { weekLabel: string; noEquipment: boolean; onGenerate: () => void }) {
  return (
    <div className="animate-day-enter rounded-2xl border border-dashed border-white/15 bg-surface p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-surface-2 text-volt">
        <Dumbbell className="h-6 w-6" />
      </div>
      <h2 className="mt-3 text-base font-bold text-white">Плану на {weekLabel} ще немає</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-400">
        AI-тренер складе тиждень Пн–Пт під твій профіль, арсенал та історію тренувань.
      </p>
      {noEquipment && (
        <p className="mt-3 rounded-xl border border-ember/30 bg-ember/10 p-2.5 text-xs leading-relaxed text-orange-200">
          Арсенал порожній — план буде лише з власною вагою.{" "}
          <Link href="/arsenal" className="font-semibold underline">
            Додати обладнання
          </Link>
        </p>
      )}
      <button
        onClick={onGenerate}
        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-volt px-5 py-3 text-sm font-bold text-black active:scale-95"
      >
        <Sparkles className="h-4 w-4" />
        Згенерувати тиждень
      </button>
    </div>
  );
}

function PlanSkeleton({ inline = false }: { inline?: boolean }) {
  return (
    <div className="space-y-4" aria-busy>
      {!inline && <div className="skeleton h-12 rounded-xl" />}
      <div className="skeleton h-12 rounded-2xl" />
      <div className="skeleton h-36 rounded-2xl" />
      <div className="skeleton h-20 rounded-2xl" />
      <div className="skeleton h-20 rounded-2xl" />
    </div>
  );
}
