"use client";

import { useState } from "react";
import { Pencil, ScanLine } from "lucide-react";
import { accentFor } from "@/lib/accent";
import { cn } from "@/lib/cn";
import type { EquipmentDTO } from "@/lib/types";
import { usePatchEquipment } from "@/hooks/queries";
import { Switch } from "@/components/ui/Switch";

const CATEGORY_LABEL: Record<EquipmentDTO["category"], string> = {
  strength: "Силове",
  cardio: "Кардіо",
  mobility: "Мобіліті",
  other: "Інше",
};

export function EquipmentRow({ item, onEdit }: { item: EquipmentDTO; onEdit: () => void }) {
  const patch = usePatchEquipment();
  const accent = accentFor(item.category === "other" ? "strength" : item.category);
  const max = item.maxWeightKg;
  const hasSlider = item.adjustable && max != null;
  const current = item.weightKg ?? max ?? 0;
  const [draft, setDraft] = useState<number | null>(null);
  const shown = draft ?? current;

  const commit = () => {
    if (draft !== null && draft !== current) patch.mutate({ id: item.id, weightKg: draft });
    setDraft(null);
  };

  return (
    <div className={cn("rounded-2xl border border-white/[0.08] bg-surface p-3.5 transition-opacity", item.active ? "opacity-100" : "opacity-50")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono text-[10px] font-bold", accent.bg, accent.text)}>
            {hasSlider ? `${shown}` : CATEGORY_LABEL[item.category].slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-white">{item.name}</span>
              {item.source === "vision" && <ScanLine className="h-3 w-3 shrink-0 text-volt" aria-label="Розпізнано AI" />}
            </div>
            <div className="truncate text-[11px] text-gray-400">
              {[CATEGORY_LABEL[item.category], item.detail].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <button aria-label={`Редагувати: ${item.name}`} onClick={onEdit} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white">
            <Pencil className="h-4 w-4" />
          </button>
          <Switch checked={item.active} onChange={(v) => patch.mutate({ id: item.id, active: v })} label={`Використовувати: ${item.name}`} />
        </div>
      </div>

      {hasSlider && (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>Поточна зібрана вага (макс. {max} кг)</span>
            <span className="font-mono text-sm font-bold text-volt tabular-nums">{shown.toFixed(1)} кг</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="font-mono text-[11px] text-gray-500">0.5</span>
            <input
              type="range"
              className="weight-range flex-1"
              aria-label={`Вага: ${item.name}`}
              min={0.5}
              max={max}
              step={0.5}
              value={shown}
              onChange={(e) => setDraft(parseFloat(e.target.value))}
              onPointerUp={commit}
              onKeyUp={commit}
              onBlur={commit}
            />
            <span className="font-mono text-[11px] text-gray-500">{max}</span>
          </div>
        </div>
      )}
    </div>
  );
}
