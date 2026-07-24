"use client";

import { Settings } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useCurrentUser } from "@/hooks/useQueries";

export function DashboardHeader() {
  const { user } = useCurrentUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 rounded-[var(--radius-pill)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-3 shadow-[var(--shadow-card)]">
        <Avatar name={user?.name ?? "?"} avatarUrl={user?.avatarUrl} size={32} />
        <span className="text-left leading-tight">
          <span className="block text-[14px] font-semibold text-[var(--color-text)]">
            {user?.name ?? "Профіль"}
          </span>
          <span className="block text-[11px] text-[var(--color-muted3)]">
            {user
              ? `Ціль ${user.targetCalories.toLocaleString("uk-UA")} ккал`
              : "Не обрано"}
          </span>
        </span>
      </div>

      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="Налаштування"
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] border border-[var(--color-divider)] text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)]"
      >
        <Settings size={20} />
      </button>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />
    </div>
  );
}
