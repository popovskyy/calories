"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { humanDate, shiftYMD, weekStartYMD } from "@/lib/date";
import type { QuestTemplate } from "@/lib/quests";

type QuestRow = {
  id: string;
  weekStart: string;
  code: string;
  titleUk: string;
  description: string;
  kind: string;
  target: number;
  rewardCoins: number;
  sortOrder: number;
  active: boolean;
};

const KINDS = [
  { value: "in_target_days", label: "Дні в ±5%" },
  { value: "log_days", label: "Дні з їжею" },
  { value: "activity_days", label: "Дні з активністю" },
  { value: "dual_days", label: "Їжа + активність" },
  { value: "no_blowout", label: "Без перебору +15%" },
  { value: "weekend_clean", label: "Чисті вихідні" },
] as const;

export function AdminQuestsPanel() {
  const [weekStart, setWeekStart] = useState(weekStartYMD());
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [pool, setPool] = useState<QuestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuestRow | null>(null);
  const [draft, setDraft] = useState<Partial<QuestRow>>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/quests?week=${encodeURIComponent(weekStart)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setQuests(data.quests);
      setPool(data.pool ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = (q: QuestRow) => {
    setCreating(false);
    setSelected(q);
    setDraft({ ...q });
  };

  const startCreate = (from?: QuestTemplate) => {
    setCreating(true);
    setSelected(null);
    setDraft({
      weekStart,
      code: from?.code ? `${from.code}_x` : `custom_${Date.now().toString(36)}`,
      titleUk: from?.titleUk ?? "",
      description: from?.description ?? "",
      kind: from?.kind ?? "in_target_days",
      target: from?.target ?? 5,
      rewardCoins: from?.rewardCoins ?? 120,
      sortOrder: 100,
      active: true,
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (creating) {
        const res = await fetch("/api/admin/quests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weekStart,
            code: draft.code,
            titleUk: draft.titleUk,
            description: draft.description,
            kind: draft.kind,
            target: draft.target,
            rewardCoins: draft.rewardCoins,
            sortOrder: draft.sortOrder,
            active: draft.active,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Помилка");
        toast.success("Квест додано");
        setCreating(false);
        setSelected(body);
        setDraft(body);
      } else if (selected) {
        const res = await fetch(`/api/admin/quests/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleUk: draft.titleUk,
            description: draft.description,
            kind: draft.kind,
            target: draft.target,
            rewardCoins: draft.rewardCoins,
            sortOrder: draft.sortOrder,
            active: draft.active,
          }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Помилка");
        toast.success("Збережено");
        setSelected(body);
        setDraft(body);
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Вимкнути квест?")) return;
    const res = await fetch(`/api/admin/quests/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Помилка");
      return;
    }
    toast.success("Вимкнено");
    setSelected(null);
    setDraft({});
    await load();
  };

  const weekEnd = shiftYMD(weekStart, 6);

  return (
    <div className="flex flex-col gap-4">
      <div className="mcard flex flex-wrap items-center gap-3 p-3">
        <span className="text-[14px] text-[var(--color-muted3)]">Тиждень</span>
        <button
          type="button"
          className="btn btn-ghost py-1.5 text-[13px]"
          onClick={() => setWeekStart(shiftYMD(weekStart, -7))}
        >
          ← минул.
        </button>
        <span className="font-semibold tabular-nums">
          {humanDate(weekStart)} — {humanDate(weekEnd)}
        </span>
        <button
          type="button"
          className="btn btn-ghost py-1.5 text-[13px]"
          onClick={() => setWeekStart(shiftYMD(weekStart, 7))}
        >
          наступ. →
        </button>
        <button
          type="button"
          className="btn btn-ghost py-1.5 text-[13px]"
          onClick={() => setWeekStart(weekStartYMD())}
        >
          Поточний
        </button>
        <button type="button" className="btn btn-primary ml-auto py-1.5 text-[13px]" onClick={() => startCreate()}>
          <Plus size={14} /> Свій квест
        </button>
      </div>

      <p className="text-[13px] text-[var(--color-muted3)]">
        Автоматично крутяться 3 квести з пулу. Ти можеш змінити нагороду / ціль або додати свої
        на тиждень (неділя = кінець тижня). Великі монети — лише за квести, не за «надутий» день.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-[var(--color-surface)] text-[12px] uppercase text-[var(--color-muted3)]">
              <tr>
                <th className="px-3 py-2">Квест</th>
                <th className="px-3 py-2">Ціль</th>
                <th className="px-3 py-2">Монети</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-divider)]">
              {loading
                ? [0, 1, 2].map((i) => (
                    <tr key={i}>
                      <td colSpan={4} className="p-3">
                        <Skeleton className="h-10 w-full" />
                      </td>
                    </tr>
                  ))
                : quests.map((q) => (
                    <tr
                      key={q.id}
                      className={
                        selected?.id === q.id
                          ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                          : "hover:bg-[var(--color-tile)]"
                      }
                    >
                      <td className="px-3 py-2">
                        <button type="button" className="text-left" onClick={() => open(q)}>
                          <span className="block font-semibold">
                            {q.titleUk}
                            {!q.active ? " · вимк." : ""}
                          </span>
                          <span className="text-[12px] text-[var(--color-muted3)]">{q.code}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{q.target}</td>
                      <td className="px-3 py-2 tabular-nums font-semibold">{q.rewardCoins}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="rounded p-1.5 text-[var(--color-muted3)] hover:text-[var(--color-red)]"
                          onClick={() => void remove(q.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {pool.length > 0 ? (
            <div className="border-t border-[var(--color-divider)] p-3">
              <div className="mb-2 text-[12px] uppercase text-[var(--color-muted3)]">
                Швидко з пулу
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pool.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    className="btn btn-ghost py-1 text-[12px]"
                    onClick={() => startCreate(p)}
                  >
                    + {p.titleUk}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="mcard h-fit p-4">
          {!creating && !selected ? (
            <p className="text-[14px] text-[var(--color-muted3)]">
              Оберіть квест або створіть свій на цей тиждень.
            </p>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <Field label="Код">
                <input
                  className={inputClass}
                  value={draft.code ?? ""}
                  disabled={!creating}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    }))
                  }
                />
              </Field>
              <Field label="Назва">
                <input
                  className={inputClass}
                  value={draft.titleUk ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, titleUk: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Опис">
                <textarea
                  className={`${inputClass} min-h-[72px]`}
                  value={draft.description ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Тип">
                <select
                  className={inputClass}
                  value={draft.kind ?? "in_target_days"}
                  onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex gap-2">
                <Field label="Скільки днів">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    max={7}
                    value={draft.target ?? 1}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, target: parseInt(e.target.value, 10) || 1 }))
                    }
                  />
                </Field>
                <Field label="Нагорода">
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={draft.rewardCoins ?? 0}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        rewardCoins: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-[14px]">
                <input
                  type="checkbox"
                  checked={draft.active !== false}
                  onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                />
                Активний
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                <Save size={16} /> {saving ? "…" : creating ? "Створити" : "Зберегти"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
