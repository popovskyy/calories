"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { formatPrescription, videoUrl } from "@/lib/plan/format";
import type { ExerciseDTO } from "@/lib/types";
import { HoldToCompleteButton } from "@/components/HoldToCompleteButton";
import { RestTimer } from "@/components/plan/RestTimer";

/**
 * Скільки виконана картка чекає, перш ніж стиснутись. Має бути помітно більше за
 * «хвіст»-клік hold-кнопки (700 мс): інакше список стрибав би просто з-під пальця.
 */
const SETTLE_MS = 900;

interface Props {
  exercise: ExerciseDTO;
  done: boolean;
  /** Перша невиконана вправа дня — підсвічується як «далі». */
  isNext?: boolean;
  /** Є лише коли відео-API ввімкнено: тоді кнопка відкриває шторку з плеєром замість переходу на YouTube. */
  onVideo?: (exercise: ExerciseDTO) => void;
  onComplete: () => void;
  onUndo: () => void;
}

/** «власна вага» — шум у рядку; показуємо лише змістовне навантаження. */
function inlineLoad(load: string | null): string | null {
  if (!load) return null;
  return /^власна вага$/i.test(load.trim()) ? null : load;
}

export function ExerciseCard({ exercise: ex, done, isNext = false, onVideo, onComplete, onUndo }: Props) {
  const [open, setOpen] = useState(false);
  // Початково виконана (завантаження сторінки) — одразу стиснута; щойно виконана — з паузою.
  const [settled, setSettled] = useState(done);
  useEffect(() => {
    if (!done) {
      setSettled(false);
      return;
    }
    const id = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(id);
  }, [done]);

  const accent = accentFor(ex.type);
  const load = inlineLoad(ex.load);
  const highlight = isNext && !done;
  // Остання лексема + шеврон не розриваються: інакше іконка падає на окремий рядок
  const words = ex.name.split(" ");
  const lastWord = words.pop() ?? "";
  const headWords = words.join(" ");
  const facts = [
    ex.load && { k: "Вага / опір", v: ex.load },
    ex.tempo && { k: "Темп", v: ex.tempo },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div
      className={cn(
        "rounded-2xl border transition-[padding,border-color,background-color,box-shadow] duration-300",
        settled ? "p-2.5" : "p-3.5",
        done
          ? "border-mint/25 bg-mint/[0.05]"
          : highlight
            ? "border-volt/40 bg-surface shadow-[0_8px_30px_-12px_rgba(43,144,254,0.45)]"
            : "border-white/[0.08] bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
        <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="w-full text-left">
          {/* Метадані згортаються у виконаної картки: лишається один рядок із назвою */}
          <span className="accordion" data-open={!settled}>
            <span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pb-1.5">
                {highlight && (
                  <span className="rounded bg-volt px-1.5 py-0.5 text-xs font-bold tracking-wide text-white">ДАЛІ</span>
                )}
                {ex.equipment && (
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", accent.bg, accent.text)}>
                    {ex.equipment}
                  </span>
                )}
                <span className="text-sm font-semibold text-gray-300 tabular-nums">{formatPrescription(ex)}</span>
                {load && <span className="text-sm text-gray-400">{load}</span>}
              </span>
            </span>
          </span>
          <span
            className={cn(
              "block leading-snug font-semibold",
              // Виконане — спокійніше й дрібніше, щоб не відбирати увагу й місце в списку
              done ? "text-sm text-gray-400 line-through decoration-mint/60" : "text-base text-white",
            )}
          >
            {headWords && `${headWords} `}
            <span className="whitespace-nowrap">
              {lastWord}
              <ChevronDown
                aria-hidden
                className={cn("ml-1 inline h-3.5 w-3.5 align-[-2px] text-gray-400 transition-transform", open && "rotate-180")}
              />
            </span>
          </span>
        </button>

        {/* Відео — поза кнопкою-розкривачем (посилання всередині button — невалідний HTML); у виконаної картки згортається */}
        <div className="accordion" data-open={!settled}>
          <div>
            <a
              href={videoUrl(ex)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (!onVideo) return; // без ключа — звичайний перехід на пошук
                e.preventDefault();
                onVideo(ex);
              }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs font-semibold text-gray-200 transition hover:bg-white/10 active:scale-95"
            >
              <Play className="h-3 w-3 fill-red-500 text-red-500" aria-hidden />
              Як робити — відео
            </a>
          </div>
        </div>
        </div>

        <HoldToCompleteButton
          completed={done}
          onComplete={onComplete}
          onUndo={onUndo}
          label={ex.name}
          doneLabel={`Виконано: ${ex.name}`}
          accent={accent.hex}
          size={settled ? "md" : "lg"}
        />
      </div>

      <div className="accordion" data-open={open}>
        <div>
          <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
            <p className="rounded-xl border border-white/5 bg-black/30 p-2.5 text-sm leading-relaxed text-gray-300">
              <span className="font-semibold text-volt">Як робити: </span>
              {ex.tip || "—"}
            </p>
            {facts.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {facts.map((f) => (
                  <div key={f.k} className="rounded-xl border border-white/5 bg-black/20 px-2.5 py-1.5">
                    <div className="text-xs font-medium text-gray-300">{f.k}</div>
                    <div className="mt-0.5 text-sm font-semibold text-gray-100">{f.v}</div>
                  </div>
                ))}
              </div>
            )}
            {ex.restSec > 0 && open && <RestTimer seconds={ex.restSec} />}
          </div>
        </div>
      </div>
    </div>
  );
}
