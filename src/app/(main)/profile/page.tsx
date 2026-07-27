"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, LogOut, Pencil, ShoppingBag } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { ReminderToggle } from "@/components/ReminderToggle";
import { UserFormDialog } from "@/components/UserFormDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadError } from "@/components/ui/LoadError";
import { useCurrentUser, useLogout, useStreak } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { GOAL_LABELS } from "@/lib/calories";

export default function ProfilePage() {
  const mounted = useMounted();
  const { user, isLoading, isError, refetch } = useCurrentUser();
  const logout = useLogout();
  const streak = useStreak();
  const [formOpen, setFormOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  if (mounted && isError) {
    return (
      <LoadError
        message="Не вдалося завантажити профіль"
        onRetry={() => void refetch()}
      />
    );
  }

  if (!mounted || isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[120px] w-full rounded-[var(--radius-lg)]" />
      </>
    );
  }

  if (!user) return null;

  const streakDays = streak.data?.streak ?? 0;

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

      <Link
        href="/shop"
        className="mcard flex w-full items-center gap-3 p-4 text-left transition-[transform,background-color] duration-[var(--duration-press)] active:scale-[0.98] hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,#FFC800_15%,transparent)] text-[#FFC800]">
          <ShoppingBag size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold text-[var(--color-text)]">Магазин</div>
          <div className="text-[13px] text-[var(--color-muted3)]">
            Скіни за монети
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[15px] font-semibold text-[var(--color-text)]">
          <CoinIcon size={16} />
          <span className="tabular-nums">{user.coins.toLocaleString("uk-UA")}</span>
        </div>
      </Link>

      <ReminderToggle />

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
