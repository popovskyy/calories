"use client";

import { useState } from "react";
import { Check, Pencil, Plus } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { UserFormDialog } from "@/components/UserFormDialog";
import { OnboardingPrompt } from "@/components/OnboardingPrompt";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { useAppStore } from "@/store/useAppStore";
import type { UserDTO } from "@/lib/types";

export default function ProfilePage() {
  const mounted = useMounted();
  const { user, users, isLoading } = useCurrentUser();
  const setCurrentUserId = useAppStore((s) => s.setCurrentUserId);
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserDTO | null>(null);

  if (!mounted || isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-40" />
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-[var(--radius-lg)]" />
        ))}
      </>
    );
  }
  if (users.length === 0) return <OnboardingPrompt />;

  const openCreate = () => {
    setEditUser(null);
    setFormOpen(true);
  };
  const openEdit = (u: UserDTO) => {
    setEditUser(u);
    setFormOpen(true);
  };

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-[var(--color-text)]">Профілі</h1>
        <button
          onClick={openCreate}
          aria-label="Новий профіль"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-divider)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)]"
        >
          <Plus size={18} />
        </button>
      </header>

      <div className="flex flex-col gap-3">
        {users.map((u) => {
          const active = u.id === user?.id;
          return (
            <div
              key={u.id}
              className="mcard flex items-center gap-3 p-3.5"
              style={active ? { boxShadow: "0 0 0 1px var(--color-accent-500)" } : undefined}
            >
              <button
                onClick={() => setCurrentUserId(u.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <Avatar name={u.name} size={44} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-[var(--color-text)]">
                      {u.name}
                    </span>
                    {active ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)]">
                        <Check size={13} /> активний
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[12px] text-[var(--color-muted3)]">
                    {u.targetCalories.toLocaleString("uk-UA")} ккал · {u.age} р · {u.weight} кг · {u.height} см
                  </div>
                </div>
              </button>
              <button
                onClick={() => openEdit(u)}
                aria-label="Редагувати"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-pill)] text-[var(--color-muted2)] transition-colors hover:bg-[var(--color-tile)] hover:text-[var(--color-text)]"
              >
                <Pencil size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <button className="btn btn-primary btn-block" onClick={openCreate}>
        <Plus size={18} /> Новий профіль
      </button>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editUser} />
    </>
  );
}
