"use client";

import { useState } from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Plus, Settings } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { UserFormDialog } from "@/components/UserFormDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useCurrentUser } from "@/hooks/useQueries";
import { useAppStore } from "@/store/useAppStore";

export function DashboardHeader() {
  const { user, users } = useCurrentUser();
  const setCurrentUserId = useAppStore((s) => s.setCurrentUserId);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <DM.Root>
        <DM.Trigger asChild>
          <button className="flex items-center gap-2.5 rounded-[var(--radius-pill)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-2.5 shadow-[var(--shadow-card)] outline-none">
            <Avatar name={user?.name ?? "?"} size={32} />
            <span className="text-left leading-tight">
              <span className="block text-[14px] font-semibold text-[var(--color-text)]">
                {user?.name ?? "Профіль"}
              </span>
              <span className="block text-[11px] text-[var(--color-muted3)]">
                {user ? `Ціль ${user.targetCalories.toLocaleString("uk-UA")} ккал` : "Не обрано"}
              </span>
            </span>
            <ChevronDown size={16} className="ml-0.5 text-[var(--color-muted2)]" />
          </button>
        </DM.Trigger>
        <DM.Portal>
          <DM.Content
            align="start"
            sideOffset={8}
            className="dd-content z-50 min-w-[240px] rounded-[var(--radius-lg)] border border-[var(--color-divider)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-card-lg)]"
          >
            {users.map((u) => (
              <DM.Item
                key={u.id}
                onSelect={() => setCurrentUserId(u.id)}
                className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-[14px] text-[var(--color-text)] outline-none data-[highlighted]:bg-[var(--color-tile)]"
              >
                <Avatar name={u.name} size={28} />
                <span className="flex-1">
                  <span className="block font-medium">{u.name}</span>
                  <span className="block text-[11px] text-[var(--color-muted3)]">
                    {u.targetCalories.toLocaleString("uk-UA")} ккал
                  </span>
                </span>
                {u.id === user?.id ? (
                  <Check size={16} className="text-[var(--color-accent)]" />
                ) : null}
              </DM.Item>
            ))}
            {users.length > 0 ? (
              <DM.Separator className="my-1.5 h-px bg-[var(--color-divider)]" />
            ) : null}
            <DM.Item
              onSelect={() => setCreateOpen(true)}
              className="flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-[14px] font-medium text-[var(--color-accent-200)] outline-none data-[highlighted]:bg-[var(--color-tile)]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-tile)]">
                <Plus size={16} />
              </span>
              Новий профіль
            </DM.Item>
          </DM.Content>
        </DM.Portal>
      </DM.Root>

      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="Налаштування"
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-divider)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)]"
      >
        <Settings size={20} />
      </button>

      <UserFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
    </div>
  );
}
