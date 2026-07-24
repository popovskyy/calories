"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Dumbbell, Sparkles, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { Field, inputClass } from "@/components/ui/Field";
import {
  useAnalyzeActivity,
  useCurrentUser,
  useSaveActivity,
} from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { useAppStore } from "@/store/useAppStore";
import { humanDateFull } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { AnalyzeActivityResult } from "@/lib/types";

type Mode = "ai" | "manual";

export default function AddActivityPage() {
  const mounted = useMounted();
  const router = useRouter();
  const { user } = useCurrentUser();
  const selectedDate = useAppStore((s) => s.selectedDate);

  const [mode, setMode] = useState<Mode>("ai");
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
      return toast.error("Вкажіть спалені ккал або натисніть «Оцінити ШІ»");
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
          router.push("/log");
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
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-muted)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold text-[var(--color-text)]">
            Активність
          </h1>
          {mounted ? (
            <p className="text-[14px] text-[var(--color-muted3)]">
              {humanDateFull(selectedDate)}
            </p>
          ) : null}
        </div>
      </header>

      <div className="no-scrollbar min-h-0 flex-1 flex flex-col gap-4 overflow-y-auto px-[18px] py-4">
        <div className="flex gap-2">
          <Link
            href="/add"
            className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-tile)] px-3 py-2.5 text-[14px] font-semibold text-[var(--color-muted2)]"
          >
            Їжа
          </Link>
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2.5 text-[14px] font-semibold text-[#f5f4ff]">
            <Dumbbell size={16} /> Рух
          </span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] font-semibold",
              mode === "ai"
                ? "bg-[var(--color-accent)] text-[#f5f4ff]"
                : "bg-[var(--color-tile)] text-[var(--color-muted2)]",
            )}
            onClick={() => setMode("ai")}
          >
            <Sparkles size={16} /> ШІ
          </button>
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] font-semibold",
              mode === "manual"
                ? "bg-[var(--color-accent)] text-[#f5f4ff]"
                : "bg-[var(--color-tile)] text-[var(--color-muted2)]",
            )}
            onClick={() => setMode("manual")}
          >
            <Keyboard size={16} /> Вручну
          </button>
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

        {mode === "ai" ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!description.trim() || analyze.isPending}
            onClick={onAnalyze}
          >
            {analyze.isPending ? "Рахуємо…" : "Оцінити спалені ккал"}
          </button>
        ) : null}

        {result || mode === "manual" ? (
          <div className="mcard flex flex-col gap-3 p-4">
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
            {result?.notes?.length ? (
              <ul className="list-inside list-disc text-[13px] text-[var(--color-muted3)]">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={save.isPending}
              onClick={onSave}
            >
              {save.isPending ? "Зберігаємо…" : "Зберегти активність"}
            </button>
          </div>
        ) : null}
      </div>
    </AppFrame>
  );
}
