"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, Ban, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type Entry = {
  kind: "meal" | "activity";
  id: string;
  userId: string;
  userName: string;
  username: string;
  date: string;
  description: string;
  calories: number;
  protein?: number;
  fats?: number;
  carbs?: number;
  durationMin?: number | null;
  status: string;
  createdAt: string;
};

export function AdminEntriesPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Entry | null>(null);
  const [cal, setCal] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/entries?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setEntries(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      toast.success("Оновлено");
      setEdit(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-[var(--color-muted3)]">
          Записи за замовчуванням схвалені. Можна скасувати або підправити ккал.
        </p>
        <button
          type="button"
          className="icon-btn shrink-0"
          aria-label="Оновити список"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw size={15} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="mcard p-6 text-center text-[15px] text-[var(--color-muted3)]">
          Записів ще немає.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((e) => (
            <div
              key={`${e.kind}-${e.id}`}
              className={cn(
                "mcard flex flex-col gap-2 p-3",
                e.status === "cancelled" && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold uppercase text-[var(--color-muted3)]">
                    {e.kind === "meal" ? "Їжа" : "Активність"} · {e.date} · @{e.username}
                  </div>
                  <div className="truncate text-[15px] font-semibold">{e.description}</div>
                  <div className="text-[13px] text-[var(--color-muted2)]">
                    {e.calories} ккал
                    {e.status === "cancelled" ? " · скасовано" : " · ok"}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {e.status === "cancelled" ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() =>
                        void patch({ kind: e.kind, id: e.id, action: "approve" })
                      }
                    >
                      <Check size={14} /> Повернути
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() =>
                        void patch({ kind: e.kind, id: e.id, action: "cancel" })
                      }
                    >
                      <Ban size={14} /> Скасувати
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Редагувати запис"
                    title="Редагувати"
                    onClick={() => {
                      setEdit(e);
                      setCal(String(e.calories));
                      setDesc(e.description);
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              </div>

              {edit?.id === e.id && edit.kind === e.kind ? (
                <div className="flex flex-col gap-2 border-t border-[var(--color-divider)] pt-2">
                  <Field label="Опис">
                    <input
                      className={inputClass}
                      value={desc}
                      onChange={(ev) => setDesc(ev.target.value)}
                    />
                  </Field>
                  <Field label={e.kind === "meal" ? "Ккал (спожито)" : "Ккал (спалено)"}>
                    <input
                      className={inputClass}
                      type="number"
                      value={cal}
                      onChange={(ev) => setCal(ev.target.value)}
                    />
                  </Field>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-primary flex-1"
                      disabled={busy}
                      aria-busy={busy || undefined}
                      onClick={() =>
                        void patch({
                          kind: e.kind,
                          id: e.id,
                          action: "update",
                          description: desc,
                          calories: parseInt(cal, 10) || 0,
                        })
                      }
                    >
                      {busy ? <span className="spinner" aria-hidden /> : null}
                      {busy ? "Збереження…" : "Зберегти правку"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      aria-label="Скасувати правку"
                      disabled={busy}
                      onClick={() => setEdit(null)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
