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
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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
        // Картка «Доказ» перевіряє imageUrl — фото має лишитись у записі.
        imageUrl: image ? image.preview : null,
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
          className="icon-btn bg-[var(--color-surface)]"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="page-title">
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
            <span className="lbl">Швидкий шлях · повторити</span>
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

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex min-h-11 flex-col items-center gap-1.5 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-accent)_35%,var(--color-divider))] bg-[var(--color-tile)] px-3 py-3 text-[var(--color-text)] shadow-[var(--shadow-card)] transition-[transform,background-color] active:scale-[0.97]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--color-accent)_14%,var(--color-surface))] text-[var(--color-accent)]">
              <Camera size={20} strokeWidth={2} />
            </span>
            <span className="text-[14px] font-semibold leading-none">Фото</span>
            <span className="text-[11px] text-[var(--color-muted3)]">
              Зняти камерою
            </span>
          </button>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="flex min-h-11 flex-col items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-tile)] px-3 py-3 text-[var(--color-text)] shadow-[var(--shadow-card)] transition-[transform,background-color] active:scale-[0.97]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[var(--color-muted)]">
              <Upload size={20} strokeWidth={2} />
            </span>
            <span className="text-[14px] font-semibold leading-none">Файл</span>
            <span className="text-[11px] text-[var(--color-muted3)]">
              З галереї
            </span>
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

        <div className="rounded-[var(--radius-md)] border border-[var(--color-divider)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between gap-2 px-3.5 py-3 text-[14px] font-semibold text-[var(--color-text)]">
            Описати текстом
            <span className="text-[12px] font-normal text-[var(--color-muted3)]">
              за бажанням
            </span>
          </div>
          <div className="border-t border-[var(--color-divider)] px-3.5 pb-3.5 pt-2">
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="2 яйця, 100 г авокадо, шматок цільнозернового хліба"
              className={`${inputClass} min-h-[110px] resize-none`}
            />
          </div>
        </div>

        {/* Під час аналізу фото вже показує сканер — тут воно було б удруге */}
        {image && !analyze.isPending ? (
          <div className="relative shrink-0 overflow-hidden rounded-[var(--radius-md)]">
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
              className="icon-btn absolute right-2 top-2 bg-black/60 text-white hover:bg-black/70 hover:text-white"
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
              data-sfx="none"
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
        finisher={user?.finisher}
        soundpack={user?.soundpack}
        onDone={() => {
          setCelebrate(false);
          toast.success("Додано в журнал");
          router.replace("/log");
        }}
      />
    </AppFrame>
  );
}
