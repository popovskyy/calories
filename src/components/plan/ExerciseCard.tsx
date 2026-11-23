"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { formatPrescription } from "@/lib/plan/format";
import type { ExerciseDTO } from "@/lib/types";
import { HoldToCompleteButton } from "@/components/HoldToCompleteButton";
import { RestTimer } from "@/components/plan/RestTimer";

interface Props {
  exercise: ExerciseDTO;
  done: boolean;
  onComplete: () => void;
  onUndo: () => void;
}

export function ExerciseCard({ exercise: ex, done, onComplete, onUndo }: Props) {
  const [open, setOpen] = useState(false);
  const accent = accentFor(ex.type);
  const facts = [
    ex.load && { k: "Вага / опір", v: ex.load },
    ex.tempo && { k: "Темп", v: ex.tempo },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 transition-[border-color,background-color] duration-300",
        done ? "border-mint/25 bg-mint/[0.05]" : "border-white/[0.08] bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            {ex.equipment && (
              <span className={cn("rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold", accent.bg, accent.text)}>
                {ex.equipment}
              </span>
            )}
            <span className="font-mono text-xs font-semibold text-gray-300 tabular-nums">{formatPrescription(ex)}</span>
          </div>
          <h3
            className={cn(
              "mt-1.5 text-sm leading-snug font-semibold",
              done ? "text-gray-400 line-through decoration-mint/60" : "text-white",
            )}
          >
            {ex.name}
          </h3>
          <span className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
            Техніка та таймер відпочинку
            <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
          </span>
        </button>

        <HoldToCompleteButton
          completed={done}
          onComplete={onComplete}
          onUndo={onUndo}
          label={ex.name}
          doneLabel={`Виконано: ${ex.name}`}
          accent={accent.hex}
        />
      </div>

      <div className="accordion" data-open={open}>
        <div>
          <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
            <p className="rounded-xl border border-white/5 bg-black/30 p-2.5 text-xs leading-relaxed text-gray-300">
              <span className="font-semibold text-volt">Техніка: </span>
              {ex.tip || "—"}
            </p>
            {facts.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {facts.map((f) => (
                  <div key={f.k} className="rounded-xl border border-white/5 bg-black/20 px-2.5 py-1.5">
                    <div className="text-[10px] tracking-wider text-gray-500 uppercase">{f.k}</div>
                    <div className="mt-0.5 text-xs font-semibold text-gray-100">{f.v}</div>
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
