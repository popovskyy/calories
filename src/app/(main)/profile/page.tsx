"use client";

import { useState } from "react";
import { LogOut, Pencil } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { UserFormDialog } from "@/components/UserFormDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentUser, useLogout } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { GOAL_LABELS } from "@/lib/calories";

export default function ProfilePage() {
  const mounted = useMounted();
  const { user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const [formOpen, setFormOpen] = useState(false);

  if (!mounted || isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[120px] w-full rounded-[var(--radius-lg)]" />
      </>
    );
  }

  if (!user) return null;

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-[var(--color-text)]">Профіль</h1>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-divider)] px-3 py-2 text-[13px] font-medium text-[var(--color-muted2)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          <LogOut size={16} />
          Вийти
        </button>
      </header>

      <div className="mcard flex items-center gap-3 p-4">
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size={64} />
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-semibold text-[var(--color-text)]">{user.name}</div>
          <div className="text-[13px] text-[var(--color-muted3)]">@{user.username}</div>
          <div className="mt-1 text-[12px] text-[var(--color-muted2)]">
            {user.targetCalories.toLocaleString("uk-UA")} ккал ·{" "}
            {GOAL_LABELS[user.goal].toLowerCase()} · {user.age} р · {user.weight} кг ·{" "}
            {user.height} см
          </div>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          aria-label="Редагувати"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-pill)] text-[var(--color-muted2)] transition-colors hover:bg-[var(--color-tile)] hover:text-[var(--color-text)]"
        >
          <Pencil size={18} />
        </button>
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={user} />
    </>
  );
}
