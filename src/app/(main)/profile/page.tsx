"use client";

import { useState } from "react";
import { KeyRound, LogOut, Pencil } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { SoundSettingsCard } from "@/components/SoundSettingsCard";
import { UserFormDialog } from "@/components/UserFormDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadError } from "@/components/ui/LoadError";
import { useCurrentUser, useLogout, useSaveUser, useStreak } from "@/hooks/useQueries";
import { GOAL_LABELS } from "@/lib/calories";
import { THEMES, type ThemeId } from "@/lib/theme-catalog";
import { cn } from "@/lib/cn";

export function ProfileTab() {
  const { user, isLoading, isError, refetch } = useCurrentUser();
  const logout = useLogout();
  const save = useSaveUser();
  const streak = useStreak();
  const [formOpen, setFormOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  if (isError) {
    return (
      <LoadError
        message="Не вдалося завантажити профіль"
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[120px] w-full rounded-[var(--radius-lg)]" />
      </>
    );
  }

  if (!user) return null;

  const streakDays = streak.data?.streak ?? 0;

  const pickTheme = (theme: ThemeId) => {
    if (theme === user.theme || save.isPending) return;
    save.mutate({
      name: user.name,
      birthYear: user.birthYear,
      birthMonth: user.birthMonth,
      sex: user.sex,
      goal: user.goal,
      weight: user.weight,
      height: user.height,
      avatarUrl: user.avatarUrl,
      targetWeight: user.targetWeight,
      theme,
    });
  };

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="page-title">Профіль</h1>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="btn btn-ghost btn-sm gap-1.5"
        >
          <LogOut size={16} />
          Вийти
        </button>
      </header>

      <div className="mcard flex items-center gap-3 p-4">
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <div className="text-[20px] font-semibold text-[var(--color-text)]">{user.name}</div>
          <div className="text-[15px] text-[var(--color-muted3)]">@{user.username}</div>
          <div className="mt-1 text-[14px] text-[var(--color-muted2)]">
            {user.targetCalories.toLocaleString("uk-UA")} ккал ·{" "}
            {GOAL_LABELS[user.goal].toLowerCase()}
          </div>
          <div className="text-[14px] text-[var(--color-muted3)]">
            {user.age} р · {user.weight} кг · {user.height} см
          </div>
          {streakDays > 0 ? (
            <div className="mt-1.5 text-[13px] font-semibold text-[var(--color-accent-300)]">
              Стрік {streakDays}{" "}
              {streakDays === 1 ? "день" : streakDays < 5 ? "дні" : "днів"}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          aria-label="Редагувати"
          className="icon-btn shrink-0"
        >
          <Pencil size={18} />
        </button>
      </div>

      <section className="mcard p-4">
        <span className="lbl">Тема</span>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const active = user.theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTheme(t.id)}
                disabled={save.isPending}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-[var(--radius-md)] border p-2.5 text-left transition-transform active:scale-[0.98]",
                  active
                    ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]"
                    : "border-[var(--color-divider)] bg-[var(--color-tile)]",
                )}
              >
                <span
                  className="h-6 w-6 rounded-full"
                  style={{ background: t.swatch }}
                  aria-hidden
                />
                <span className="text-[13px] font-semibold text-[var(--color-text)]">
                  {t.nameUk}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <SoundSettingsCard />

      <button
        type="button"
        onClick={() => setPwdOpen(true)}
        className="mcard flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)] text-[var(--color-muted2)]">
          <KeyRound size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold text-[var(--color-text)]">
            Змінити пароль
          </div>
          <div className="text-[13px] text-[var(--color-muted3)]">
            Оновіть пароль для входу
          </div>
        </div>
      </button>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={user} />
      <ChangePasswordDialog open={pwdOpen} onOpenChange={setPwdOpen} />
    </>
  );
}

export default function Page() {
  return <ProfileTab />;
}
