"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EquipmentCategory, EquipmentDTO } from "@/lib/types";
import { useDeleteEquipment, usePatchEquipment } from "@/hooks/queries";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";

const CATEGORIES: { id: EquipmentCategory; label: string }[] = [
  { id: "strength", label: "Силове" },
  { id: "cardio", label: "Кардіо" },
  { id: "mobility", label: "Мобіліті" },
  { id: "other", label: "Інше" },
];

const input =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-volt focus:outline-none";

/** Ручне редагування предмета. Рендериться лише для відкритого предмета (key = id) → стан ініціалізується з пропа. */
export function EquipmentEditSheet({ item, onClose }: { item: EquipmentDTO | null; onClose: () => void }) {
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()} eyebrow="Арсенал" title="Редагувати предмет">
      {item && <EditForm key={item.id} item={item} onClose={onClose} />}
    </Sheet>
  );
}

function EditForm({ item, onClose }: { item: EquipmentDTO; onClose: () => void }) {
  const patch = usePatchEquipment();
  const del = useDeleteEquipment();
  const [name, setName] = useState(item.name);
  const [detail, setDetail] = useState(item.detail ?? "");
  const [category, setCategory] = useState<EquipmentCategory>(item.category);
  const [adjustable, setAdjustable] = useState(item.adjustable);
  const [maxW, setMaxW] = useState(item.maxWeightKg?.toString() ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = () => {
    const max = adjustable && maxW.trim() !== "" ? Number(maxW.replace(",", ".")) : null;
    patch.mutate(
      {
        id: item.id,
        name: name.trim(),
        detail: detail.trim() || null,
        category,
        adjustable,
        maxWeightKg: max !== null && Number.isFinite(max) ? max : null,
        // Нова межа → поточну вагу не вище неї; якщо була порожня — ставимо максимум
        weightKg: max !== null && Number.isFinite(max) ? Math.min(item.weightKg ?? max, max) : null,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="space-y-3.5">
      <label className="block">
        <span className="text-[11px] tracking-wider text-gray-500 uppercase">Назва</span>
        <input className={input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block">
        <span className="text-[11px] tracking-wider text-gray-500 uppercase">Опис</span>
        <input className={input} value={detail} maxLength={140} placeholder="Напр.: широкий та паралельний хват" onChange={(e) => setDetail(e.target.value)} />
      </label>

      <div>
        <span className="text-[11px] tracking-wider text-gray-500 uppercase">Категорія</span>
        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-xl border py-2 text-[11px] font-semibold transition",
                category === c.id ? "border-volt/50 bg-volt/15 text-volt" : "border-white/10 text-gray-400",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
        <div>
          <div className="text-sm font-medium text-white">Регульована вага</div>
          <div className="text-[11px] text-gray-500">Розбірна гантеля, гиря зі змінними блінами</div>
        </div>
        <Switch checked={adjustable} onChange={setAdjustable} label="Регульована вага" />
      </div>

      {adjustable && (
        <label className="block">
          <span className="text-[11px] tracking-wider text-gray-500 uppercase">Максимальна вага, кг</span>
          <input className={input} inputMode="decimal" value={maxW} placeholder="13" onChange={(e) => setMaxW(e.target.value)} />
        </label>
      )}

      <button
        onClick={save}
        disabled={patch.isPending || name.trim().length < 2}
        className="w-full rounded-2xl bg-volt py-3.5 text-sm font-bold text-black active:scale-[0.98] disabled:opacity-50"
      >
        {patch.isPending ? "Зберігаю…" : "Зберегти"}
      </button>

      <button
        onClick={() => (confirmDelete ? del.mutate(item.id, { onSuccess: onClose }) : setConfirmDelete(true))}
        disabled={del.isPending}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition",
          confirmDelete ? "border-red-500/60 bg-red-500/15 text-red-300" : "border-white/10 text-gray-400",
        )}
      >
        <Trash2 className="h-4 w-4" />
        {confirmDelete ? "Точно видалити? Торкніться ще раз" : "Видалити предмет"}
      </button>
    </div>
  );
}
