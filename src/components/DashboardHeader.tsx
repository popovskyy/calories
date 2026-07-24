"use client";

import { Avatar } from "@/components/Avatar";
import { useCurrentUser } from "@/hooks/useQueries";

export function DashboardHeader() {
  const { user } = useCurrentUser();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5 rounded-[var(--radius-pill)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-3 shadow-[var(--shadow-card)]">
        <Avatar name={user?.name ?? "?"} avatarUrl={user?.avatarUrl} size={32} />
        <span className="text-left leading-tight">
          <span className="block text-[16px] font-semibold text-[var(--color-text)]">
            {user?.name ?? "Профіль"}
          </span>
          <span className="block text-[13px] text-[var(--color-muted3)]">
            {user
              ? `Ціль ${user.targetCalories.toLocaleString("uk-UA")} ккал`
              : "Не обрано"}
          </span>
        </span>
      </div>
    </div>
  );
}
