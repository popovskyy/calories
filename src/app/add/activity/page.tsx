"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Dumbbell, Sparkles, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { AppFrame } from "@/components/AppFrame";
import { ActivityAnalyzeLoader } from "@/components/loaders/ActivityAnalyzeLoader";
import { Field, inputClass } from "@/components/ui/Field";
import {
  useAnalyzeActivity,
  useCurrentUser,
  useSaveActivity,
} from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { useAppStore } from "@/store/useAppStore";
import { humanDateFull } from "@/lib/date";
import type { AnalyzeActivityResult } from "@/lib/types";

export default function AddActivityPage() {
  const mounted = useMounted();
  const router = useRouter();
  const { user } = useCurrentUser();
  const selectedDate = useAppStore((s) => s.selectedDate);

  const [description, setDescription] = useState("");
  const [result, setResult] = useState<AnalyzeActivityResult | null>(null);
  const [calories, setCalories] = useState("");
  const [duration, setDuration] = useState("");

  const analyze = useAnalyzeActivity();
  const save = useSaveActivity();

  const onAnalyze = () => {
    if (!description.trim()) return toast.error("Опишіть активність");
    analyze.mutate(
      { description: description.trim() },
      {
        onSuccess: (r) => {
          setResult(r);
          setCalories(String(r.caloriesBurned));
          setDuration(r.durationMin != null ? String(r.durationMin) : "");
          toast.success("Оцінку готово");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка ШІ"),
      },
    );
  };

  const onSave = () => {
    if (!description.trim()) return toast.error("Опишіть активність");
    const cal = parseInt(calories, 10);
    if (!Number.isFinite(cal) || cal < 0) {
      return toast.error("Спочатку оцініть спалені ккал");
    }
    const dur = duration.trim() ? parseInt(duration, 10) : null;

    save.mutate(
      {
        date: selectedDate,
        description: description.trim(),
        caloriesBurned: cal,
        durationMin: Number.isFinite(dur) ? dur : null,
      },
      {
        onSuccess: (row) => {
          toast.success(`−${row.caloriesBurned} ккал від активності`);
          router.replace("/log");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );
  };

  if (mounted && !user) {
    return (
      <AppFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[17px] text-[var(--color-muted)]">Спершу увійдіть.</p>
          <Link href="/" className="btn btn-primary">
            На головну
          </Link>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame>
      <header
        className="flex items-center gap-3 px-[18px] pb-2"
        style={{ paddingTop: "18px" }}
      >
        <Link
          href="/"
          aria-label="Назад"
          className="icon-btn bg-[var(--color-surface)]"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="page-title">
            Активність
          </h1>
          {mounted ? (
            <p className="text-[14px] text-[var(--color-muted3)]">
              {humanDateFull(selectedDate)}
            </p>
          ) : null}
        </div>
      </header>

      <div className="app-scroll no-scrollbar flex flex-col gap-4 px-[18px] pb-28 pt-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.replace("/add")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-tile)] px-3 py-2.5 text-[14px] font-semibold text-[var(--color-muted2)]"
          >
            <UtensilsCrossed size={16} /> Їжа
          </button>
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2.5 text-[14px] font-semibold text-[#f5f4ff]">
            <Dumbbell size={16} /> Рух
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="lbl">Що робили?</span>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setResult(null);
            }}
            placeholder="Біг 30 хв, або зал: жим + присідання 1 год"
            rows={3}
            className={inputClass}
          />
        </label>

        {description.trim() ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={analyze.isPending}
            onClick={onAnalyze}
          >
            {analyze.isPending ? (
              <>
                <Sparkles size={18} className="spark-pulse" /> Рахуємо…
              </>
            ) : (
              "Оцінити спалені ккал"
            )}
          </button>
        ) : null}

        <AnimatePresence>
          {analyze.isPending ? <ActivityAnalyzeLoader /> : null}
        </AnimatePresence>

        {result ? (
          <div className="mcard flex shrink-0 flex-col gap-3 p-4">
            <Field label="Спалено, ккал">
              <input
                className={inputClass}
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </Field>
            <Field label="Хвилин (необовʼязково)">
              <input
                className={inputClass}
                inputMode="numeric"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
            {result.notes?.length ? (
              <ul className="list-inside list-disc text-[13px] text-[var(--color-muted3)]">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {result ? (
        <div className="flex flex-col gap-2 border-t border-[var(--color-divider)] bg-[var(--color-bg)] px-[18px] pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-3.5">
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={save.isPending}
            onClick={onSave}
          >
            {save.isPending ? (
              <>
                <span className="spinner" /> Зберігаємо…
              </>
            ) : (
              "Зберегти активність"
            )}
          </button>
        </div>
      ) : null}
    </AppFrame>
  );
}
