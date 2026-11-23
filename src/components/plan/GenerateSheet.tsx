"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  weekLabel: string;
  hasPlan: boolean;
  hasProgress: boolean;
  onGenerate: (note: string) => void;
}

export function GenerateSheet({ open, onOpenChange, weekLabel, hasPlan, hasProgress, onGenerate }: Props) {
  const [note, setNote] = useState("");
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      eyebrow="AI-тренер"
      title={hasPlan ? "Згенерувати тиждень заново" : "Згенерувати тиждень"}
      description={`План Пн–Пт на ${weekLabel}: враховує профіль, актуальний арсенал та історію твоїх попередніх тренувань.`}
    >
      {hasPlan && (
        <p className="mb-4 rounded-xl border border-ember/30 bg-ember/10 p-3 text-xs leading-relaxed text-orange-200">
          Поточний план цього тижня буде замінено{hasProgress ? ", а відмічений прогрес — архівовано" : ""}.
        </p>
      )}
      <label className="block">
        <span className="text-[11px] tracking-wider text-gray-500 uppercase">Побажання (необов’язково)</span>
        <input
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Напр.: більше кардіо, ноги легше"
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-volt focus:outline-none"
        />
      </label>
      <button
        onClick={() => {
          onGenerate(note);
          setNote("");
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl btn-primary py-3.5 text-sm font-bold active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4" />
        Згенерувати
      </button>
    </Sheet>
  );
}
