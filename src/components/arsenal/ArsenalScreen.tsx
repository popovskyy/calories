"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAddEquipment, useEquipment } from "@/hooks/queries";
import type { EquipmentDTO } from "@/lib/types";
import { EquipmentEditSheet } from "@/components/arsenal/EquipmentEditSheet";
import { EquipmentRow } from "@/components/arsenal/EquipmentRow";
import { ScannerCard } from "@/components/arsenal/ScannerCard";

export function ArsenalScreen() {
  const equipment = useEquipment();
  const add = useAddEquipment();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<EquipmentDTO | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) return;
    add.mutate({ name: n, category: "strength", adjustable: false }, { onSuccess: () => setName("") });
  };

  const items = equipment.data ?? [];
  const activeCount = items.filter((i) => i.active).length;

  return (
    <section className="animate-day-enter space-y-4">
      <div>
        <span className="text-sm font-semibold text-volt">Gemini Vision Sync</span>
        <h1 className="font-display mt-0.5 text-3xl leading-tight font-semibold tracking-wide text-white">Мій домашній арсенал</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          AI будує план виключно під активне обладнання
          {equipment.isSuccess && items.length > 0 && ` · активно ${activeCount} з ${items.length}`}
        </p>
      </div>

      <ScannerCard />

      <div className="space-y-2.5">
        {equipment.isPending ? (
          <>
            <div className="skeleton h-16 rounded-2xl" />
            <div className="skeleton h-16 rounded-2xl" />
          </>
        ) : equipment.isError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-base text-red-200">
            Не вдалося завантажити арсенал: {equipment.error.message}
            <button onClick={() => equipment.refetch()} className="mt-2 block font-semibold underline">
              Спробувати ще
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-surface p-5 text-center">
            <p className="text-base font-semibold text-white">Арсенал порожній</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-400">
              Завантаж фото свого спорткуточка або додай предмет вручну. Без інвентарю тренер складе план лише з власною вагою.
            </p>
          </div>
        ) : (
          items.map((item) => <EquipmentRow key={item.id} item={item} onEdit={() => setEditing(item)} />)
        )}
      </div>

      <form onSubmit={submit} className="flex gap-2 rounded-2xl border border-white/[0.08] bg-surface p-3">
        <input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          aria-label="Назва нового предмета"
          placeholder="Додати інвентар (напр. Еспандер)…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-volt focus:outline-none"
        />
        <button
          type="submit"
          disabled={add.isPending || name.trim().length < 2}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-surface-2 px-3.5 py-2 text-sm font-semibold text-volt active:scale-95 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          Додати
        </button>
      </form>

      <EquipmentEditSheet item={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
