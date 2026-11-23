"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { compressImageToJpeg } from "@/lib/image-compress";
import type { ScanResultDTO } from "@/lib/types";
import { useScanEquipment } from "@/hooks/queries";

const MAX_PHOTOS = 4;
/** Ліміт base64 на одне фото (дзеркалить сервер): ≈1.5 МБ бінарних даних. */
const MAX_B64 = 1_900_000;

interface Photo {
  id: string;
  preview: string;
  data: string;
}

async function prepare(file: File): Promise<Photo> {
  let out = await compressImageToJpeg(file, 1280, 0.82);
  if (out.base64.length > MAX_B64) out = await compressImageToJpeg(file, 1024, 0.7);
  if (out.base64.length > MAX_B64) throw new Error("Фото завелике навіть після стиснення");
  return { id: crypto.randomUUID(), preview: out.preview, data: out.base64 };
}

/** Завантаження 1–4 фото → прев'ю → Gemini Vision → оновлений арсенал. */
export function ScannerCard() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [result, setResult] = useState<ScanResultDTO | null>(null);
  const scan = useScanEquipment();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    const files = Array.from(list).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (list.length > room) toast(`Максимум ${MAX_PHOTOS} фото за раз`);
    if (files.length === 0) return;
    setPreparing(true);
    setResult(null);
    try {
      const prepared = await Promise.all(files.map(prepare));
      setPhotos((prev) => [...prev, ...prepared].slice(0, MAX_PHOTOS));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не вдалося обробити фото");
    } finally {
      setPreparing(false);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  };

  const analyze = () => {
    scan.mutate(
      photos.map((p) => ({ mime: "image/jpeg", data: p.data })),
      {
        onSuccess: (res) => {
          setResult(res);
          setPhotos([]);
          if (res.added > 0) toast.success(`Розпізнано й додано: ${res.added}`);
          else toast(res.detected > 0 ? "Усе розпізнане вже є в арсеналі" : "Нічого не розпізнано — спробуйте інший ракурс");
        },
      },
    );
  };

  const busy = scan.isPending;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-dashed bg-surface p-4 transition-colors", busy ? "border-volt/60" : "border-white/20")}>
      {busy && <div className="animate-scan absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-volt to-cyan-400 shadow-[0_0_14px_#A3E635]" />}

      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-2 text-volt">
          <ScanLine className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">
            {busy ? "Gemini Vision аналізує фото…" : result ? `Розпізнано: ${result.detected} · нових: ${result.added}` : "Оновити арсенал по фото"}
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            {busy
              ? "Визначаю снаряди та робочу вагу"
              : result?.note ?? "Сфотографуй куточок — AI розпізнає снаряди"}
          </div>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {photos.map((p) => (
            <div key={p.id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element -- локальний data:-прев'ю, оптимізація не потрібна */}
              <img src={p.preview} alt="Фото домашнього спорткуточка" className="h-full w-full object-cover" />
              {!busy && (
                <button
                  aria-label="Прибрати фото"
                  onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                  className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Приховані інпути живуть завжди; кнопки лише викликають .click() (валідний HTML, працює на iOS) */}
      <input ref={galleryRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void addFiles(e.target.files)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void addFiles(e.target.files)} />

      <div className="mt-3 flex gap-2">
        {photos.length > 0 ? (
          <button
            onClick={analyze}
            disabled={busy}
            className="flex-1 rounded-xl bg-volt px-3 py-2.5 text-center text-xs font-bold text-black active:scale-95 disabled:opacity-50"
          >
            {busy ? "Аналізую…" : `Розпізнати (${photos.length})`}
          </button>
        ) : (
          <button
            onClick={() => galleryRef.current?.click()}
            disabled={preparing}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-volt px-3 py-2.5 text-center text-xs font-bold text-black active:scale-95 disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" />
            {preparing ? "Обробка…" : "Завантажити фото"}
          </button>
        )}
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={busy || preparing || photos.length >= MAX_PHOTOS}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-surface-2 px-3 py-2.5 text-xs font-medium text-gray-200 active:scale-95 disabled:opacity-40"
        >
          <Camera className="h-4 w-4" />
          Камера
        </button>
      </div>
      {photos.length > 0 && photos.length < MAX_PHOTOS && !busy && (
        <button onClick={() => galleryRef.current?.click()} className="mt-2 text-[11px] text-gray-400 underline">
          + додати ще фото ({photos.length}/{MAX_PHOTOS})
        </button>
      )}
    </div>
  );
}
