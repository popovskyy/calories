"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Camera, Upload, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { AppFrame } from "@/components/AppFrame";
import { AiResultCard } from "@/components/AiResultCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { inputClass } from "@/components/ui/Field";
import { useAnalyzeMeal, useCurrentUser, useSaveMeal } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { useAppStore } from "@/store/useAppStore";
import { humanDateFull } from "@/lib/date";
import type { AnalyzeResult } from "@/lib/types";

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
  const apiKey = useAppStore((s) => s.geminiApiKey);

  const [description, setDescription] = useState("");
  const [image, setImage] = useState<ImageState | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const analyze = useAnalyzeMeal();
  const save = useSaveMeal();

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const canAnalyze = (description.trim().length > 0 || !!image) && !analyze.isPending;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const comma = dataUrl.indexOf(",");
      const base64 = dataUrl.slice(comma + 1);
      const mime = dataUrl.slice(5, dataUrl.indexOf(";"));
      setImage({ base64, mime, preview: dataUrl });
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const runAnalyze = () => {
    analyze.mutate(
      {
        description: description.trim() || undefined,
        imageBase64: image?.base64,
        imageMimeType: image?.mime,
        apiKey: apiKey || undefined,
      },
      {
        onSuccess: (r) => setResult(r),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Помилка аналізу"),
      },
    );
  };

  const runSave = () => {
    if (!user || !result) return;
    save.mutate(
      {
        date: selectedDate,
        description: description.trim() || result.parsedItems.join(", ") || "Прийом їжі",
        calories: result.calories,
        protein: result.protein,
        fats: result.fats,
        carbs: result.carbs,
      },
      {
        onSuccess: () => {
          toast.success("Додано в журнал");
          router.push("/log");
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Не вдалося зберегти"),
      },
    );
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

  return (
    <AppFrame>
      {/* Хедер */}
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
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--color-text)]">Новий прийом їжі</h1>
          {mounted ? (
            <p className="text-[14px] text-[var(--color-muted3)]">{humanDateFull(selectedDate)}</p>
          ) : null}
        </div>
      </header>

      {/* Контент */}
      <div className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-[18px] py-4">
        <label className="flex flex-col gap-1.5">
          <span className="lbl">Опишіть страву</span>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            placeholder="2 яйця, 100 г авокадо, шматок цільнозернового хліба"
            className={`${inputClass} min-h-[74px] resize-none`}
          />
        </label>

        <div className="flex gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[#595d6c] py-3 text-[15px] text-[var(--color-muted2)] transition-colors hover:border-[var(--color-accent-500)]"
          >
            <Camera size={18} /> Зробити фото
          </button>
          <button
            onClick={() => uploadRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[#595d6c] py-3 text-[15px] text-[var(--color-muted2)] transition-colors hover:border-[var(--color-accent-500)]"
          >
            <Upload size={18} /> Завантажити
          </button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
          <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>

        {image ? (
          <div className="relative overflow-hidden rounded-[var(--radius-md)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt="Фото страви" className="max-h-52 w-full object-cover" />
            <button
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
      </div>

      {/* Панель дій */}
      <div
        className="flex flex-col gap-2 border-t border-[var(--color-divider)] bg-[var(--color-bg)] px-[18px] pt-3.5"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        {result ? (
          <>
            <button className="btn btn-primary btn-block" onClick={runSave} disabled={save.isPending}>
              {save.isPending ? "Збереження…" : "Зберегти в журнал"}
            </button>
            <button className="btn btn-ghost btn-block" onClick={runAnalyze} disabled={analyze.isPending}>
              Перерахувати
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-block" onClick={runAnalyze} disabled={!canAnalyze}>
            <Sparkles size={18} />
            {analyze.isPending ? "Аналізуємо…" : "Розрахувати"}
          </button>
        )}
      </div>
    </AppFrame>
  );
}

function ResultSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[18px]" style={{ border: "1px solid var(--color-accent-800)" }}>
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
