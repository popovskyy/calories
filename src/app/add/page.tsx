"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Camera,
  Upload,
  Sparkles,
  X,
  UtensilsCrossed,
  Dumbbell,
} from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { AiResultCard } from "@/components/AiResultCard";
import { SaveCelebrate } from "@/components/SaveCelebrate";
import { MealAnalyzeLoader } from "@/components/loaders/MealAnalyzeLoader";
import { inputClass } from "@/components/ui/Field";
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
import type { AnalyzeResult, RecentMealDTO } from "@/lib/types";

interface ImageState {
  base64: string;
  mime: string;
  preview: string;
}

export default function AddFoodPage() {
  const mounted = useMounted();
  const router = useRouter();
  const { user } = useCurrentUser();
  const selectedDate = useAppStore((s) => s.selectedDate);
  const recent = useRecentMeals(10);
  const dash = useDashboard();

  const [description, setDescription] = useState("");
  const [image, setImage] = useState<ImageState | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
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
    setResult({
      calories: m.calories,
      protein: m.protein,
      fats: m.fats,
      carbs: m.carbs,
      parsedItems: [],
    });
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
        onSuccess: (r) => setResult(r),
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Помилка аналізу";
          toast.error(msg, { duration: 6000 });
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
        <Link
          href="/"
          aria-label="Назад"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface)] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
        >
          <ChevronLeft size={18} />
        </Link>
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

      <div className="app-scroll no-scrollbar flex flex-col gap-4 px-[18px] pb-28 pt-4">
        <div className="flex gap-2">
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-2.5 text-[14px] font-semibold text-[#f5f4ff]">
            <UtensilsCrossed size={16} /> Їжа
          </span>
          <button
            type="button"
            onClick={() => router.replace("/add/activity")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-tile)] px-3 py-2.5 text-[14px] font-semibold text-[var(--color-muted2)]"
          >
            <Dumbbell size={16} /> Рух
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

        {/* Під час аналізу фото вже показує сканер — тут воно було б удруге */}
        {image && !analyze.isPending ? (
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

        <AnimatePresence mode="wait" initial={false}>
          {analyze.isPending ? (
            <MealAnalyzeLoader key="loading" preview={image?.preview} />
          ) : result ? (
            <AiResultCard
              key="result"
              result={result}
              source={image ? "фото" : "опису"}
            />
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--color-divider)] bg-[var(--color-bg)] px-[18px] pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-3.5">
        {result ? (
          <>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={runSaveFromAi}
              disabled={save.isPending}
            >
              {save.isPending ? (
                <>
                  <span className="spinner" /> Збереження…
                </>
              ) : (
                "Зберегти в журнал"
              )}
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
            <Sparkles
              size={18}
              className={analyze.isPending ? "spark-pulse" : undefined}
            />
            {analyze.isPending ? "Аналізуємо…" : "Розрахувати"}
          </button>
        )}
      </div>

      <SaveCelebrate
        open={celebrate}
        inTarget={celebrateInTarget}
        onDone={() => {
          setCelebrate(false);
          toast.success("Додано в журнал");
          router.replace("/log");
        }}
      />
    </AppFrame>
  );
}
