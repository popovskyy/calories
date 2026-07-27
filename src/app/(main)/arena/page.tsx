"use client";

import { Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useArena } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { humanDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { ArenaEntry } from "@/lib/types";

export default function ArenaPage() {
  const mounted = useMounted();
  const arena = useArena();

  if (!mounted || arena.isLoading) {
    return (
      <>
        <Skeleton className="h-8 w-36" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-lg)]" />
        ))}
      </>
    );
  }

  const entries = arena.data?.entries ?? [];
  const date = arena.data?.date;

  return (
    <>
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Trophy size={22} className="text-[var(--color-accent)]" />
            Арена
          </h1>
          <p className="mt-1 text-[15px] text-[var(--color-muted3)]">
            Хто ближче до своєї норми
            {date ? ` · ${humanDate(date)}` : ""}
          </p>
        </div>
        {entries.length > 0 ? (
          <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-tile)] px-2.5 py-1 text-[13px] font-semibold tabular-nums text-[var(--color-muted2)]">
            {entries.length}{" "}
            {entries.length === 1
              ? "учасник"
              : entries.length < 5
                ? "учасники"
                : "учасників"}
          </span>
        ) : null}
      </header>

      {entries.length === 0 ? (
        <div className="mcard p-6 text-center text-[16px] text-[var(--color-muted3)]">
          Поки немає гравців. Запросіть друзів зареєструватись.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-[36px_1fr_auto] gap-2 bg-[var(--color-surface)] px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted3)]">
            <span>#</span>
            <span>Усі гравці</span>
            <span className="text-right">До цілі</span>
          </div>
          <ul className="divide-y divide-[var(--color-divider)] bg-[var(--color-bg)]">
            {entries.map((e) => (
              <ArenaRow key={e.userId} entry={e} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ArenaRow({ entry }: { entry: ArenaEntry }) {
  const over = entry.difference < 0;
  const exact = entry.hasLog && entry.absError === 0;
  const label = !entry.hasLog
    ? "—"
    : exact
      ? "0"
      : over
        ? `+${entry.absError.toLocaleString("uk-UA")}`
        : `−${entry.absError.toLocaleString("uk-UA")}`;

  return (
    <li
      className={cn(
        "grid grid-cols-[36px_1fr_auto] items-center gap-2 px-3 py-3",
        entry.isMe && "bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]",
      )}
    >
      <span className="text-[16px] font-semibold tabular-nums text-[var(--color-muted2)]">
        {entry.rank}
      </span>
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar
          name={entry.name}
          avatarUrl={entry.avatarUrl}
          size={36}
          stage={entry.stage}
          frame={entry.frame}
        />
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold text-[var(--color-text)]">
            {entry.name}
            {entry.isMe ? (
              <span className="ml-1.5 text-[13px] font-semibold text-[var(--color-accent)]">
                ви
              </span>
            ) : null}
          </div>
          {entry.title ? (
            <div className="truncate text-[12px] font-semibold text-[var(--color-accent)]">
              {entry.title}
            </div>
          ) : null}
          <div className="truncate text-[12px] text-[var(--color-muted3)] opacity-80">
            {entry.goalLabel} · {entry.todayCalories.toLocaleString("uk-UA")} /{" "}
            {entry.targetCalories.toLocaleString("uk-UA")} ккал
          </div>
        </div>
      </div>
      <div className="text-right">
        <div
          className={cn(
            "text-[17px] font-semibold tabular-nums",
            !entry.hasLog
              ? "text-[var(--color-muted3)]"
              : exact
                ? "text-[var(--color-green)]"
                : over
                  ? "text-[var(--color-red)]"
                  : "text-[var(--color-accent-300)]",
          )}
        >
          {label}
        </div>
        <div className="text-[12px] text-[var(--color-muted3)]">
          {!entry.hasLog ? "немає логу" : exact ? "влучно" : over ? "перебір" : "недобір"}
        </div>
      </div>
    </li>
  );
}
