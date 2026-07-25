"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { AdminEditor } from "@/components/admin/AdminEditor";
import { AdminEntriesPanel } from "@/components/admin/AdminEntriesPanel";
import { AdminQuestsPanel } from "@/components/admin/AdminQuestsPanel";
import { AdminSkinsPanel } from "@/components/admin/AdminSkinsPanel";
import { Field, inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { GOAL_LABELS, type Goal, type Sex } from "@/lib/calories";
import type { UserDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

type Tab = "users" | "skins" | "quests" | "entries";

const TABS: ReadonlyArray<readonly [Tab, string]> = [
  ["users", "Користувачі"],
  ["skins", "Скіни / ціни"],
  ["quests", "Квести"],
  ["entries", "Модерація"],
];

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserDTO | null>(null);
  const [draft, setDraft] = useState<Partial<UserDTO> & { password?: string }>({});
  const [saving, setSaving] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка");
      setUsers(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (u: UserDTO) => {
    setSelected(u);
    setDraft({ ...u, password: "" });
  };

  const closeEdit = () => {
    setSelected(null);
    setDraft({});
  };

  const save = async () => {
    if (!selected) return;
    if (!draft.name?.trim()) {
      toast.error("Вкажи ім'я");
      return;
    }
    if (!draft.username?.trim()) {
      toast.error("Вкажи логін");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          name: draft.name,
          username: draft.username,
          password: draft.password || undefined,
          birthYear: draft.birthYear,
          birthMonth: draft.birthMonth,
          sex: draft.sex,
          goal: draft.goal,
          weight: draft.weight,
          height: draft.height,
          targetCalories: draft.targetCalories,
          avatarUrl: draft.avatarUrl,
          coins: draft.coins,
          recalcTarget: false,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Помилка збереження");
      toast.success("Збережено");
      setSelected(body);
      setDraft({ ...body, password: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setSaving(false);
    }
  };

  const recalc = async () => {
    if (!selected) return;
    setRecalcing(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          name: draft.name,
          birthYear: draft.birthYear,
          birthMonth: draft.birthMonth,
          sex: draft.sex,
          goal: draft.goal,
          weight: draft.weight,
          height: draft.height,
          recalcTarget: true,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Помилка");
      toast.success(`Норму перераховано: ${body.targetCalories} ккал`);
      setSelected(body);
      setDraft({ ...body, password: "" });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setRecalcing(false);
    }
  };

  const remove = async (u: UserDTO) => {
    if (!confirm(`Видалити «${u.name}» та всі його записи?`)) return;
    setRemovingId(u.id);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(u.id)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Помилка");
      toast.success("Видалено");
      if (selected?.id === u.id) closeEdit();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    } finally {
      setRemovingId(null);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  const subtitle =
    tab === "users"
      ? `${users.length} користувачів`
      : tab === "skins"
        ? "Каталог скінів і ціни"
        : tab === "quests"
          ? "Квести тижня"
          : "Модерація їжі / активності";

  return (
    /*
     * .page-scroll — власний скрол-контейнер. body у цьому проєкті
     * position:fixed + overflow:hidden (мобільний шел), тож без нього
     * адмінка просто обрізалася по висоті екрана без можливості доскролити.
     */
    <div className="page-scroll no-scrollbar">
      <div className="page-chrome border-b border-[var(--color-divider)]">
        <div className="mx-auto w-full max-w-5xl px-4 pb-2 pt-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-[var(--color-text)]">
                Адмінка
              </h1>
              <p className="truncate text-[14px] text-[var(--color-muted3)]">{subtitle}</p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={loading}
                onClick={() => void load()}
              >
                <RefreshCw size={15} className={cn(loading && "animate-spin")} />
                <span className="hidden sm:inline">Оновити</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void logout()}
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Вийти</span>
              </button>
            </div>
          </header>

          {/* Таби скроляться горизонтально, а не переносяться і не тиснуться */}
          <div className="no-scrollbar -mx-4 mt-3 overflow-x-auto px-4">
            <div className="flex w-max gap-1.5 pb-1">
              {TABS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-current={tab === id ? "page" : undefined}
                  className={cn(
                    "min-h-[38px] whitespace-nowrap rounded-[var(--radius-pill)] px-4 text-[14px] font-semibold transition-colors",
                    tab === id
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-tile)] text-[var(--color-muted2)] hover:text-[var(--color-text)]",
                  )}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* pb-32 — нижні кнопки збереження ніколи не впираються в край екрана */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4">
        {tab === "skins" ? (
          <AdminSkinsPanel />
        ) : tab === "quests" ? (
          <AdminQuestsPanel />
        ) : tab === "entries" ? (
          <AdminEntriesPanel />
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-col gap-2">
              {loading ? (
                [0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-[68px] w-full rounded-[var(--radius-lg)]" />
                ))
              ) : users.length === 0 ? (
                <div className="mcard p-6 text-center text-[15px] text-[var(--color-muted3)]">
                  Користувачів ще немає.
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {users.map((u) => (
                    <li
                      key={u.id}
                      className={cn(
                        "mcard flex items-center gap-2 p-3 transition-colors",
                        selected?.id === u.id &&
                          "shadow-[0_0_0_2px_var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))]",
                        removingId === u.id && "opacity-40",
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => openEdit(u)}
                        aria-label={`Редагувати ${u.name}`}
                      >
                        <Avatar name={u.name} avatarUrl={u.avatarUrl} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">
                            {u.name}
                          </span>
                          <span className="block truncate text-[13px] text-[var(--color-muted3)]">
                            @{u.username} · {GOAL_LABELS[u.goal]}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="tag tag-accent tabular-nums">
                              {u.coins} монет
                            </span>
                            <span className="tag tag-outline tabular-nums">
                              {u.targetCalories.toLocaleString("uk-UA")} ккал
                            </span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="icon-btn shrink-0 hover:text-[var(--color-red)]"
                        aria-label={`Видалити ${u.name}`}
                        disabled={removingId === u.id}
                        onClick={() => void remove(u)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <AdminEditor
              open={selected?.id ?? null}
              title={selected ? "Редагування користувача" : undefined}
              onClose={selected ? closeEdit : undefined}
            >
              {!selected ? (
                <p className="text-[15px] text-[var(--color-muted3)]">
                  Обери користувача зі списку, щоб редагувати профіль, монети й норму.
                </p>
              ) : (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar name={draft.name || "?"} avatarUrl={draft.avatarUrl} size={48} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{draft.name}</div>
                      <div className="truncate text-[12px] text-[var(--color-muted3)]">
                        id: {selected.id.slice(0, 10)}…
                      </div>
                    </div>
                  </div>

                  <Field label="Ім'я">
                    <input
                      className={inputClass}
                      value={draft.name ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Логін">
                    <input
                      className={inputClass}
                      value={draft.username ?? ""}
                      autoCapitalize="none"
                      autoCorrect="off"
                      onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Монети">
                    <input
                      className={inputClass}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={draft.coins ?? 0}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, coins: parseInt(e.target.value, 10) || 0 }))
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[50, 100, 250, 500].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="btn btn-ghost btn-sm border border-[var(--color-divider)] px-0"
                        onClick={() => setDraft((d) => ({ ...d, coins: (d.coins ?? 0) + n }))}
                      >
                        +{n}
                      </button>
                    ))}
                  </div>
                  <p className="-mt-1 text-[12px] text-[var(--color-muted3)]">
                    Натисни +N, потім «Зберегти» — нарахує монети юзеру.
                  </p>

                  <Field label="Новий пароль" hint="Порожньо = не міняти">
                    <input
                      className={inputClass}
                      type="password"
                      autoComplete="new-password"
                      value={draft.password ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Вага">
                      <input
                        className={inputClass}
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={draft.weight ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            weight: e.target.value === "" ? undefined : parseFloat(e.target.value),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Зріст">
                      <input
                        className={inputClass}
                        type="number"
                        inputMode="numeric"
                        value={draft.height ?? ""}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            height: e.target.value === "" ? undefined : parseFloat(e.target.value),
                          }))
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Ціль ккал">
                    <input
                      className={inputClass}
                      type="number"
                      inputMode="numeric"
                      value={draft.targetCalories ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          targetCalories:
                            e.target.value === ""
                              ? undefined
                              : parseInt(e.target.value, 10),
                        }))
                      }
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Стать">
                      <select
                        className={inputClass}
                        value={draft.sex ?? "male"}
                        onChange={(e) => setDraft((d) => ({ ...d, sex: e.target.value as Sex }))}
                      >
                        <option value="male">Чоловік</option>
                        <option value="female">Жінка</option>
                      </select>
                    </Field>
                    <Field label="Мета">
                      <select
                        className={inputClass}
                        value={draft.goal ?? "maintain"}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, goal: e.target.value as Goal }))
                        }
                      >
                        {(Object.keys(GOAL_LABELS) as Goal[]).map((k) => (
                          <option key={k} value={k}>
                            {GOAL_LABELS[k]}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <SubmitButton loading={saving} icon={<Save size={16} />}>
                      Зберегти
                    </SubmitButton>
                    <button
                      type="button"
                      className="btn btn-ghost btn-block"
                      disabled={saving || recalcing}
                      aria-busy={recalcing || undefined}
                      onClick={() => void recalc()}
                    >
                      {recalcing ? <span className="spinner" aria-hidden /> : null}
                      {recalcing ? "Рахую…" : "Перерахувати норму (BMR)"}
                    </button>
                  </div>
                </form>
              )}
            </AdminEditor>
          </div>
        )}
      </div>
    </div>
  );
}
