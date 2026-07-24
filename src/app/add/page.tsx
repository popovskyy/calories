"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Camera, Upload, Sparkles, X, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { AiResultCard } from "@/components/AiResultCard";
import { SaveCelebrate } from "@/components/SaveCelebrate";
import { Skeleton } from "@/components/ui/Skeleton";
import { Field, inputClass } from "@/components/ui/Field";
import {
  useAnalyzeMeal,
  useCurrentUser,
  useDashboard,
  useRecentMeals,
  useSaveMeal,
} from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { useAppStore } from "@/store/useAppStore";
import { humanDateFull } from "@/lib/date";
import { compressImageToJpeg } from "@/lib/image-compress";
import { cn } from "@/lib/cn";
import type { AnalyzeResult, RecentMealDTO } from "@/lib/types";

interface ImageState {
  base64: string;
  mime: string;
  preview: string;
}

type Mode = "ai" | "manual";

export default function AddFoodPage() {
  const mounted = useMounted();
  const router = useRouter();
  const { user } = useCurrentUser();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const recent = useRecentMeals(10);
  const dash = useDashboard();

  const [mode, setMode] = useState<Mode>("ai");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<ImageState | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fats, setFats] = useState("");
  const [carbs, setCarbs] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateInTarget, setCelebrateInTarget] = useState(false);

  const analyze = useAnalyzeMeal();
  const save = useSaveMeal();

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const canAnalyze =
    (description.trim().length > 0 || !!image) && !analyze.isPending;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImageToJpeg(file);
      setImage(compressed);
      setResult(null);
    } catch {
      toast.error("Не вдалося обробити фото");
    }
  };

  const applyRecent = (m: RecentMealDTO) => {
    setDescription(m.description);
    setCalories(String(m.calories));
    setProtein(String(m.protein));
    setFats(String(m.fats));
    setCarbs(String(m.carbs));
    setResult({
      calories: m.calories,
      protein: m.protein,
      fats: m.fats,
      carbs: m.carbs,
      parsedItems: [],
    });
    setMode("manual");
    setImage(null);
    toast.message("Макроси підставлено — можна зберегти або підправити");
  };

  const afterSaved = useCallback(
    (savedCalories: number) => {
      const today = dash.data?.today;
      const prev = today?.totalCalories ?? 0;
      const target = user?.targetCalories ?? today?.targetCalories ?? 0;
      const nextTotal = prev + savedCalories;
      const inTarget = target > 0 && Math.abs(nextTotal - target) <= target * 0.05;
      setCelebrateInTarget(inTarget);
      setCelebrate(true);
    },
    [dash.data?.today, user?.targetCalories],
  );

  const runAnalyze = () => {
    analyze.mutate(
      {
        description: description.trim() || undefined,
        imageBase64: image?.base64,
        imageMimeType: image?.mime,
      },
      {
        onSuccess: (r) => {
          setResult(r);
          setCalories(String(r.calories));
          setProtein(String(r.protein));
          setFats(String(r.fats));
          setCarbs(String(r.carbs));
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Помилка аналізу";
          toast.error(`${msg} Спробуйте режим «Вручну».`, { duration: 6000 });
          setMode("manual");
        },
      },
    );
  };

  const persist = (macros: {
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
  }) => {
    if (!user) return;
    const desc =
      description.trim() ||
      result?.parsedItems.join(", ") ||
      "Прийом їжі";
    save.mutate(
      {
        date: selectedDate,
        description: desc,
        calories: macros.calories,
        protein: macros.protein,
        fats: macros.fats,
        carbs: macros.carbs,
      },
      {
        onSuccess: (res) => {
          for (const rw of res.rewards) {
            toast.success(`+${rw.coins} монет · ${rw.label}`);
          }
          afterSaved(macros.calories);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Не вдалося зберегти"),
      },
    );
  };

  const runSaveFromAi = () => {
    if (!result) return;
    persist(result);
  };

  const runSaveManual = () => {
    const cal = parseInt(calories, 10);
    const p = parseInt(protein, 10);
    const f = parseInt(fats, 10);
    const c = parseInt(carbs, 10);
    if (!description.trim()) return toast.error("Вкажіть опис");
    if (![cal, p, f, c].every((n) => Number.isFinite(n) && n >= 0)) {
      return toast.error("Калорії та макроси — цілі числа ≥ 0");
    }
    persist({ calories: cal, protein: p, fats: f, carbs: c });
  };

  if (mounted && !user) {
    return (
      <AppFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[17px] text-[var(--color-muted)]">
            Спершу створіть профіль на вкладці «Профіль».
          </p>
          <Link href="/" className="btn btn-primary">
            На головну
          </Link>
        </div>
      </AppFrame>
    );
  }

  const recentList = recent.data ?? [];

  return (
    <AppFrame>
      <header
        className="flex items-center gap-3 px-[18px] pb-2"
        style={{ paddingTop: "18px" }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold text-[var(--color-text)]">
            Новий прийом їжі
          </h1>
          {mounted ? (
            <p className="text-[14px] text-[var(--color-muted3)]">
              {humanDateFull(selectedDate)}
            </p>
          ) : null}
        </div>
      </header>

      <div className="app-scroll no-scrollbar flex flex-col gap-4 px-[18px] py-4">
        <div className="flex gap-2">
          <span className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2.5 text-[14px] font-semibold text-[#f5f4ff]">
            Їжа
          </span>
          <Link
            href="/add/activity"
            className="flex flex-1 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-tile)] px-3 py-2.5 text-[14px] font-semibold text-[var(--color-muted2)]"
          >
            Рух
          </Link>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] font-semibold transition-colors",
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
              "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2.5 text-[14px] font-semibold transition-colors",
              mode === "manual"
                ? "bg-[var(--color-accent)] text-[#f5f4ff]"
                : "bg-[var(--color-tile)] text-[var(--color-muted2)]",
            )}
            onClick={() => setMode("manual")}
          >
            <Keyboard size={16} /> Вручну
          </button>
        </div>

        {recentList.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="lbl">Повторити</span>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {recentList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => applyRecent(m)}
                  className="shrink-0 rounded-[var(--radius-pill)] border border-[var(--color-divider)] bg-[var(--color-tile)] px-3 py-2 text-left transition-colors hover:border-[var(--color-accent-500)]"
                >
                  <div className="max-w-[140px] truncate text-[13px] font-semibold text-[var(--color-text)]">
                    {m.description}
                  </div>
                  <div className="text-[12px] text-[var(--color-muted3)]">
                    {m.calories} ккал
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="lbl">Опишіть страву</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="2 яйця, 100 г авокадо, шматок цільнозернового хліба"
            className={`${inputClass} min-h-[74px] resize-none`}
          />
        </label>

        {mode === "ai" ? (
          <>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[#595d6c] py-3 text-[15px] text-[var(--color-muted2)] transition-colors hover:border-[var(--color-accent-500)]"
              >
                <Camera size={18} /> Фото
              </button>
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[#595d6c] py-3 text-[15px] text-[var(--color-muted2)] transition-colors hover:border-[var(--color-accent-500)]"
              >
                <Upload size={18} /> Файл
              </button>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => void onFile(e)}
              />
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void onFile(e)}
              />
            </div>

            {image ? (
              <div className="relative overflow-hidden rounded-[var(--radius-md)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.preview}
                  alt="Фото страви"
                  className="max-h-52 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  aria-label="Прибрати фото"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-[var(--radius-pill)] bg-black/60 text-white"
                >
                  <X size={15} />
                </button>
              </div>
            ) : null}

            {analyze.isPending ? (
              <ResultSkeleton />
            ) : result ? (
              <AiResultCard result={result} source={image ? "фото" : "опису"} />
            ) : null}
          </>
        ) : (
          <>
            <Field label="Калорії">
              <input
                className={inputClass}
                inputMode="numeric"
                value={calories}
                onChange={(e) => setCalories(e.target.value.replace(/[^\d]/g, ""))}
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Білки">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value.replace(/[^\d]/g, ""))}
                />
              </Field>
              <Field label="Жири">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={fats}
                  onChange={(e) => setFats(e.target.value.replace(/[^\d]/g, ""))}
                />
              </Field>
              <Field label="Вуглеводи">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value.replace(/[^\d]/g, ""))}
                />
              </Field>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--color-divider)] bg-[var(--color-bg)] px-[18px] pb-3.5 pt-3.5">
        {mode === "ai" ? (
          result ? (
            <>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={runSaveFromAi}
                disabled={save.isPending}
              >
                {save.isPending ? "Збереження…" : "Зберегти в журнал"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={runAnalyze}
                disabled={analyze.isPending}
              >
                Перерахувати
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={runAnalyze}
              disabled={!canAnalyze}
            >
              <Sparkles size={18} />
              {analyze.isPending ? "Аналізуємо…" : "Розрахувати"}
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={runSaveManual}
            disabled={save.isPending}
          >
            {save.isPending ? "Збереження…" : "Зберегти в журнал"}
          </button>
        )}
      </div>

      <SaveCelebrate
        open={celebrate}
        inTarget={celebrateInTarget}
        onDone={() => {
          setCelebrate(false);
          toast.success("Додано в журнал");
          router.push("/log");
        }}
      />
    </AppFrame>
  );
}

function ResultSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[18px]"
      style={{ border: "1px solid var(--color-accent-800)" }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16 rounded-[var(--radius-pill)]" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="h-6 w-20 rounded-[var(--radius-pill)]" />
        <Skeleton className="h-6 w-24 rounded-[var(--radius-pill)]" />
      </div>
      <Skeleton className="mx-auto mt-4 h-10 w-24" />
      <div className="mt-4 flex gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 flex-1" />
        ))}
      </div>
    </div>
  );
}
