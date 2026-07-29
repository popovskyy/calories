"use client";

import { Flame } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { CoinsPill } from "@/components/CoinsPill";
import { NotificationBell } from "@/components/NotificationBell";
import { useMainTabsOptional } from "@/components/MainTabs";
import { useCurrentUser, useStreak } from "@/hooks/useQueries";

export function DashboardHeader() {
  const { user } = useCurrentUser();
  const streak = useStreak();
  const days = streak.data?.streak ?? 0;
  const tabs = useMainTabsOptional();

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label="Профіль"
        onClick={() => tabs?.selectTab("profile")}
        className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-pill)] bg-[var(--color-surface)] py-1.5 pl-1.5 pr-3 shadow-[var(--shadow-card)] transition-transform duration-[var(--duration-press)] active:scale-[0.97]"
      >
        {/* frame передаємо і тут: куплену рамку власник має бачити в себе,
            а не лише інші в арені */}
        <Avatar
          name={user?.name ?? "?"}
          avatarUrl={user?.avatarUrl}
          size={32}
          frame={user?.frame}
        />
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate text-[16px] font-semibold text-[var(--color-text)]">
            {user?.name ?? "Профіль"}
          </span>
          <span className="block text-[13px] text-[var(--color-muted3)]">
            {user
              ? `Ціль ${user.targetCalories.toLocaleString("uk-UA")} ккал`
              : "Не обрано"}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {days > 0 ? (
          <div
            className="flex items-center gap-1 rounded-[var(--radius-pill)] border border-[var(--color-divider)] bg-[var(--color-tile)] px-2.5 py-1.5"
            title="Дні підряд із записом їжі"
          >
            <Flame size={22} className="flame-anim text-[var(--color-accent)]" />
            <span className="text-[14px] font-semibold tabular-nums text-[var(--color-text)]">
              {days}
            </span>
          </div>
        ) : null}

        <NotificationBell />
        <CoinsPill />
      </div>
    </div>
  );
}
