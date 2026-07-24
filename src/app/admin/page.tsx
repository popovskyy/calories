"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { AdminEntriesPanel } from "@/components/admin/AdminEntriesPanel";
import { AdminQuestsPanel } from "@/components/admin/AdminQuestsPanel";
import { AdminSkinsPanel } from "@/components/admin/AdminSkinsPanel";
import { Field, inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { GOAL_LABELS, type Goal, type Sex } from "@/lib/calories";
import type { UserDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

type Tab = "users" | "skins" | "quests" | "entries";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserDTO | null>(null);
  const [draft, setDraft] = useState<Partial<UserDTO> & { password?: string }>({});
  const [saving, setSaving] = useState(false);

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

  const save = async () => {
    if (!selected || !draft) return;
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
    setSaving(true);
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
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Видалити користувача та всі його записи?")) return;
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Помилка");
      toast.success("Видалено");
      if (selected?.id === id) {
        setSelected(null);
        setDraft({});
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Помилка");
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  };

  return (
    <div className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--color-text)]">Адмінка</h1>
          <p className="text-[15px] text-[var(--color-muted3)]">
            {tab === "users"
              ? `${users.length} користувачів`
              : tab === "skins"
                ? "Каталог скінів і ціни"
                : tab === "quests"
                  ? "Квести тижня"
                  : "Модерація їжі / активності"}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            <RefreshCw size={16} /> Оновити
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            <LogOut size={16} /> Вийти
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["users", "Користувачі"],
            ["skins", "Скіни / ціни"],
            ["quests", "Квести"],
            ["entries", "Модерація"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-[var(--radius-pill)] px-4 py-2 text-[14px] font-semibold",
              tab === id
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-tile)] text-[var(--color-muted2)]",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "skins" ? (
        <AdminSkinsPanel />
      ) : tab === "quests" ? (
        <AdminQuestsPanel />
      ) : tab === "entries" ? (
        <AdminEntriesPanel />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[15px]">
                <thead className="bg-[var(--color-surface)] text-[13px] uppercase tracking-wide text-[var(--color-muted3)]">
                  <tr>
                    <th className="px-3 py-2.5">Юзер</th>
                    <th className="px-3 py-2.5">Монети</th>
                    <th className="px-3 py-2.5">Ціль</th>
                    <th className="px-3 py-2.5">Мета</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-divider)]">
                  {loading
                    ? [0, 1, 2].map((i) => (
                        <tr key={i}>
                          <td colSpan={5} className="p-3">
                            <Skeleton className="h-10 w-full" />
                          </td>
                        </tr>
                      ))
                    : users.map((u) => (
                        <tr
                          key={u.id}
                          className={
                            selected?.id === u.id
                              ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                              : "hover:bg-[var(--color-tile)]"
                          }
                        >
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              className="flex items-center gap-2 text-left"
                              onClick={() => openEdit(u)}
                            >
                              <Avatar name={u.name} avatarUrl={u.avatarUrl} size={32} />
                              <span>
                                <span className="block font-semibold">{u.name}</span>
                                <span className="text-[13px] text-[var(--color-muted3)]">
                                  @{u.username}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{u.coins}</td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {u.targetCalories.toLocaleString("uk-UA")}
                          </td>
                          <td className="px-3 py-2.5">{GOAL_LABELS[u.goal]}</td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              className="rounded p-1.5 text-[var(--color-muted3)] hover:text-[var(--color-red)]"
                              aria-label="Видалити"
                              onClick={() => void remove(u.id)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="mcard h-fit p-4">
            {!selected ? (
              <p className="text-[15px] text-[var(--color-muted3)]">
                Оберіть користувача, щоб редагувати.
              </p>
            ) : (
              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
              >
                <div className="flex items-center gap-2">
                  <Avatar name={draft.name || "?"} avatarUrl={draft.avatarUrl} size={48} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{draft.name}</div>
                    <div className="truncate text-[13px] text-[var(--color-muted3)]">
                      id: {selected.id.slice(0, 10)}…
                    </div>
                  </div>
                </div>

                <Field label="Ім'я">
                  <input
                    className={inputClass}
                    value={draft.name ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </Field>
                <Field label="Логін">
                  <input
                    className={inputClass}
                    value={draft.username ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                  />
                </Field>
                <Field label="Монети">
                  <input
                    className={inputClass}
                    type="number"
                    value={draft.coins ?? 0}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, coins: parseInt(e.target.value, 10) || 0 }))
                    }
                  />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {[50, 100, 250, 500].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="btn btn-ghost flex-1 py-1.5 text-[12px]"
                      onClick={() =>
                        setDraft((d) => ({ ...d, coins: (d.coins ?? 0) + n }))
                      }
                    >
                      +{n}
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-[var(--color-muted3)]">
                  Натисни +N, потім «Зберегти» — нарахує монети юзеру.
                </p>
                <Field label="Новий пароль" hint="Порожньо = не міняти">
                  <input
                    className={inputClass}
                    type="password"
                    value={draft.password ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                  />
                </Field>
                <div className="flex gap-2">
                  <Field label="Вага">
                    <input
                      className={inputClass}
                      type="number"
                      value={draft.weight ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, weight: parseFloat(e.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="Зріст">
                    <input
                      className={inputClass}
                      type="number"
                      value={draft.height ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, height: parseFloat(e.target.value) }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Ціль ккал">
                  <input
                    className={inputClass}
                    type="number"
                    value={draft.targetCalories ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        targetCalories: parseInt(e.target.value, 10),
                      }))
                    }
                  />
                </Field>
                <Field label="Стать">
                  <select
                    className={inputClass}
                    value={draft.sex ?? "male"}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, sex: e.target.value as Sex }))
                    }
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

                <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                  <Save size={16} /> {saving ? "Збереження…" : "Зберегти"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={saving}
                  onClick={() => void recalc()}
                >
                  Перерахувати норму (BMR)
                </button>
              </form>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
