"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Plus,
  Power,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AdminEditor } from "@/components/admin/AdminEditor";
import { Field, inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { humanDate, shiftYMD, weekStartYMD } from "@/lib/date";
import { QUEST_LIMITS, validateQuestDraft } from "@/lib/quest-schema";
import type { QuestTemplate } from "@/lib/quests";
import { cn } from "@/lib/cn";

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
  { value: "week_balance", label: "Тижневий баланс" },
  { value: "activity_minutes", label: "Хвилини руху" },
  { value: "burn_total", label: "Спалені ккал" },
  { value: "protein_days", label: "Дні з білком" },
] as const;

const KIND_LABEL = new Map<string, string>(KINDS.map((k) => [k.value, k.label]));

/**
 * Код має бути унікальним у межах тижня (@@unique([weekStart, code])).
 * Раніше кнопка з пулу завжди давала `${code}_x`, тож другий клік по тому
 * самому шаблону впирався в 409 і виглядав як «створення не працює».
 */
function uniqueCode(base: string, taken: Set<string>): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9_]/g, "") || "custom";
  if (!taken.has(clean)) return clean.slice(0, 40);
  for (let i = 2; i < 100; i++) {
    const next = `${clean}_${i}`.slice(0, 40);
    if (!taken.has(next)) return next;
  }
  return `${clean}_${Date.now().toString(36)}`.slice(0, 40);
}

export function AdminQuestsPanel() {
  const [weekStart, setWeekStart] = useState(weekStartYMD());
  const [quests, setQuests] = useState<QuestRow[]>([]);
  const [pool, setPool] = useState<QuestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QuestRow | null>(null);
  const [draft, setDraft] = useState<Partial<QuestRow>>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  /** Тиждень, для якого відкрито форму — щоб не зберегти квест не в той тиждень. */
  const formWeek = useRef(weekStart);

  const closeForm = useCallback(() => {
    setCreating(false);
    setSelected(null);
    setDraft({});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/quests?week=${encodeURIComponent(weekStart)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка завантаження");
      setQuests(data.quests ?? []);
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

  /**
   * Зміна тижня має скидати відкриту форму: інакше в ній лишалися дані
   * квесту з іншого тижня, і «Зберегти» правило чужий запис.
   */
  useEffect(() => {
    if (formWeek.current !== weekStart) {
      formWeek.current = weekStart;
      closeForm();
    }
  }, [weekStart, closeForm]);

  const openEdit = (q: QuestRow) => {
    setCreating(false);
    setSelected(q);
    // Форма заповнюється поточними значеннями квесту — копією, не посиланням.
    setDraft({ ...q });
  };

  const startCreate = (from?: QuestTemplate) => {
    const taken = new Set(quests.map((q) => q.code));
    setCreating(true);
    setSelected(null);
    setDraft({
      weekStart,
      code: uniqueCode(from?.code ?? `custom_${Date.now().toString(36)}`, taken),
      titleUk: from?.titleUk ?? "",
      description: from?.description ?? "",
      kind: from?.kind ?? "in_target_days",
      target: from?.target ?? 5,
      rewardCoins: from?.rewardCoins ?? 120,
      sortOrder: from?.sortOrder ?? 100,
      active: true,
    });
  };

  const save = async () => {
    if (!creating && !selected) return;

    const problem = validateQuestDraft({
      code: creating ? draft.code : undefined,
      titleUk: draft.titleUk,
      description: draft.description,
      target: draft.target,
      rewardCoins: draft.rewardCoins,
    });
    if (problem) {
      toast.error(problem);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        titleUk: draft.titleUk?.trim(),
        description: draft.description?.trim(),
        kind: draft.kind,
        target: draft.target,
        rewardCoins: draft.rewardCoins,
        sortOrder: draft.sortOrder ?? 100,
        active: draft.active !== false,
      };

      const res = creating
        ? await fetch("/api/admin/quests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...payload,
              weekStart: formWeek.current,
              code: draft.code?.trim(),
            }),
          })
        : await fetch(`/api/admin/quests/${selected!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Помилка збереження");

      toast.success(creating ? "Квест створено" : "Збережено");
      // Далі редагуємо вже створений запис — а не створюємо його ще раз.
      setCreating(false);
      setSelected(body as QuestRow);
      setDraft({ ...(body as QuestRow) });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setSaving(false);
    }
  };

  /** Перемикач «активний» прямо зі списку — вимкнений квест можна повернути. */
  const toggleActive = async (q: QuestRow) => {
    setRowBusy(q.id);
    try {
      const res = await fetch(`/api/admin/quests/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !q.active }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Помилка");
      toast.success(q.active ? "Квест вимкнено" : "Квест увімкнено");
      if (selected?.id === q.id) {
        setSelected(body as QuestRow);
        setDraft({ ...(body as QuestRow) });
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setRowBusy(null);
    }
  };

  const removeForever = async (q: QuestRow) => {
    if (!confirm(`Видалити квест «${q.titleUk}» назавжди?`)) return;
    setRowBusy(q.id);
    try {
      const res = await fetch(`/api/admin/quests/${q.id}?hard=1`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Помилка");
      toast.success("Видалено");
      if (selected?.id === q.id) closeForm();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setRowBusy(null);
    }
  };

  const weekEnd = shiftYMD(weekStart, 6);
  const isCurrentWeek = weekStart === weekStartYMD();
  const formOpen = creating || !!selected;

  return (
    <div className="flex flex-col gap-4">
      {/* Навігація по тижнях */}
      <div className="mcard flex flex-wrap items-center gap-2 p-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="icon-btn"
            aria-label="Попередній тиждень"
            onClick={() => setWeekStart(shiftYMD(weekStart, -7))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Наступний тиждень"
            onClick={() => setWeekStart(shiftYMD(weekStart, 7))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] uppercase tracking-wide text-[var(--color-muted3)]">
            Тиждень {isCurrentWeek ? "· поточний" : ""}
          </div>
          <div className="truncate text-[15px] font-semibold tabular-nums">
            {humanDate(weekStart)} — {humanDate(weekEnd)}
          </div>
        </div>
        {!isCurrentWeek ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setWeekStart(weekStartYMD())}
          >
            Поточний
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => startCreate()}
        >
          <Plus size={16} /> Свій квест
        </button>
      </div>

      <p className="text-[13px] leading-relaxed text-[var(--color-muted3)]">
        Автоматично крутяться 3 квести з пулу. Можна змінити нагороду / ціль або додати свої
        на тиждень (неділя = кінець тижня). Великі монети — лише за квести, не за «надутий» день.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-3">
          {/* Список квестів: картки, а не таблиця — читається на будь-якій ширині */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[86px] w-full rounded-[var(--radius-lg)]" />
              ))}
            </div>
          ) : quests.length === 0 ? (
            <div className="mcard p-6 text-center">
              <p className="text-[15px] text-[var(--color-muted3)]">
                На цей тиждень квестів немає.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm mx-auto mt-3"
                onClick={() => startCreate()}
              >
                <Plus size={16} /> Додати квест
              </button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {quests.map((q) => {
                const isSelected = selected?.id === q.id;
                const busy = rowBusy === q.id;
                return (
                  <li
                    key={q.id}
                    className={cn(
                      "mcard flex items-stretch gap-2 p-3 transition-colors",
                      isSelected &&
                        "shadow-[0_0_0_2px_var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))]",
                      !q.active && "opacity-55",
                      busy && "opacity-40",
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => openEdit(q)}
                      aria-label={`Редагувати квест ${q.titleUk}`}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[15px] font-semibold text-[var(--color-text)]">
                          {q.titleUk}
                        </span>
                        {!q.active ? (
                          <span className="tag tag-outline">вимкнено</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--color-muted2)]">
                        {q.description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="tag tag-outline">
                          {KIND_LABEL.get(q.kind) ?? q.kind}
                        </span>
                        <span className="tag tag-outline tabular-nums">
                          ціль: {q.target} дн.
                        </span>
                        <span className="tag tag-accent tabular-nums">
                          <Coins size={12} className="mr-1" />
                          {q.rewardCoins}
                        </span>
                      </div>
                    </button>

                    <div className="flex shrink-0 flex-col items-center justify-center gap-1">
                      <button
                        type="button"
                        className={cn("icon-btn", q.active && "text-[var(--color-green)]")}
                        disabled={busy}
                        aria-label={q.active ? "Вимкнути квест" : "Увімкнути квест"}
                        title={q.active ? "Вимкнути квест" : "Увімкнути квест"}
                        onClick={() => void toggleActive(q)}
                      >
                        <Power size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn hover:text-[var(--color-red)]"
                        disabled={busy}
                        aria-label="Видалити квест назавжди"
                        title="Видалити назавжди"
                        onClick={() => void removeForever(q)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {pool.length > 0 ? (
            <div className="mcard p-3">
              <div className="mb-2 text-[12px] uppercase tracking-wide text-[var(--color-muted3)]">
                Швидко з пулу
              </div>
              <div className="flex flex-wrap gap-1.5">
                {pool.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    className="btn btn-ghost btn-sm border border-[var(--color-divider)]"
                    onClick={() => startCreate(p)}
                  >
                    <Plus size={13} /> {p.titleUk}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <AdminEditor
          open={formOpen ? (selected?.id ?? "new") : null}
          title={creating ? "Новий квест" : selected ? "Редагування квесту" : undefined}
          onClose={formOpen ? closeForm : undefined}
        >
          {!formOpen ? (
            <div className="flex flex-col gap-3">
              <p className="text-[14px] text-[var(--color-muted3)]">
                Обери квест зі списку, щоб змінити ціль і нагороду, або створи свій на цей
                тиждень.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => startCreate()}
              >
                <Plus size={16} /> Свій квест
              </button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <Field
                label="Код"
                hint={creating ? "Унікальний у межах тижня" : "Код не змінюється після створення"}
              >
                <input
                  className={cn(inputClass, !creating && "opacity-60")}
                  value={draft.code ?? ""}
                  disabled={!creating}
                  maxLength={40}
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
                  maxLength={QUEST_LIMITS.titleMax}
                  onChange={(e) => setDraft((d) => ({ ...d, titleUk: e.target.value }))}
                  required
                />
              </Field>
              <Field
                label="Опис"
                hint={`${(draft.description ?? "").length} / ${QUEST_LIMITS.descriptionMax}`}
              >
                <textarea
                  className={`${inputClass} min-h-[72px] resize-y`}
                  value={draft.description ?? ""}
                  maxLength={QUEST_LIMITS.descriptionMax}
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
              <div className="grid grid-cols-2 gap-2">
                <Field label="Скільки днів">
                  <input
                    className={inputClass}
                    type="number"
                    inputMode="numeric"
                    min={QUEST_LIMITS.targetMin}
                    max={QUEST_LIMITS.targetMax}
                    value={draft.target ?? 1}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, target: parseInt(e.target.value, 10) || 1 }))
                    }
                  />
                </Field>
                <Field label="Нагорода" hint={`макс. ${QUEST_LIMITS.rewardMax}`}>
                  <input
                    className={inputClass}
                    type="number"
                    inputMode="numeric"
                    min={QUEST_LIMITS.rewardMin}
                    max={QUEST_LIMITS.rewardMax}
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
              <Field label="Порядок у списку">
                <input
                  className={inputClass}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={QUEST_LIMITS.sortOrderMax}
                  value={draft.sortOrder ?? 100}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      sortOrder: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </Field>

              <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[15px]">
                <input
                  type="checkbox"
                  className="h-[18px] w-[18px] accent-[var(--color-accent)]"
                  checked={draft.active !== false}
                  onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
                />
                Активний (видно юзерам)
              </label>

              <div className="flex flex-col gap-2 pt-1">
                <SubmitButton
                  loading={saving}
                  loadingText={creating ? "Створення…" : "Збереження…"}
                  icon={<Save size={16} />}
                >
                  {creating ? "Створити квест" : "Зберегти зміни"}
                </SubmitButton>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={saving}
                  onClick={closeForm}
                >
                  Скасувати
                </button>
              </div>
            </form>
          )}
        </AdminEditor>
      </div>
    </div>
  );
}
