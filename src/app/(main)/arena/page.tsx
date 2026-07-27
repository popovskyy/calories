"use client";

import { BellRing, Share2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { LoadError } from "@/components/ui/LoadError";
import { useArena, useNudge } from "@/hooks/useQueries";
import { useMounted } from "@/hooks/useMounted";
import { humanDate } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { ArenaEntry } from "@/lib/types";

export default function ArenaPage() {
  const mounted = useMounted();
  const arena = useArena();

  if (mounted && arena.isError) {
    return (
      <LoadError
        message="Не вдалося завантажити арену"
        onRetry={() => void arena.refetch()}
      />
    );
  }
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
  const me = entries.find((e) => e.isMe);
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3).filter((e) => !e.isMe);

  const invite = async () => {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const text = "Хто ближче до своєї норми? Заходь на Арену.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Арена · Калорії", text, url });
        return;
      }
      await navigator.clipboard.writeText(url || text);
      toast.success("Посилання скопійовано");
    } catch {
      /* user cancelled share */
    }
  };

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
        <div className="mcard">
          <EmptyState
            icon={Trophy}
            context="arena"
            action={
              <button type="button" className="btn btn-primary gap-1.5" onClick={() => void invite()}>
                <Share2 size={16} />
                Запросити друга
              </button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {podium.length > 0 ? <Podium entries={podium} /> : null}

          {me && me.rank > 3 ? (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color-mix(in_srgb,var(--color-accent)_35%,transparent)] shadow-[var(--shadow-card)]">
              <div className="bg-[color-mix(in_srgb,var(--color-accent)_10%,var(--color-surface))] px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-accent)]">
                Ви зараз
              </div>
              <ul>
                <ArenaRow entry={me} />
              </ul>
            </div>
          ) : null}

          {rest.length > 0 ? (
            <div className="overflow-hidden rounded-[var(--radius-lg)] shadow-[var(--shadow-card)]">
              <div className="grid grid-cols-[36px_1fr_auto_auto] gap-2 bg-[var(--color-surface)] px-3 py-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--color-muted3)]">
                <span>#</span>
                <span>Далі</span>
                <span className="text-right">Очки</span>
                <span className="w-8" aria-hidden />
              </div>
              <ul className="divide-y divide-[var(--color-divider)] bg-[var(--color-bg)]">
                {rest.map((e) => (
                  <ArenaRow key={e.userId} entry={e} />
                ))}
              </ul>
            </div>
          ) : null}

          {entries.length < 3 ? (
            <button
              type="button"
              onClick={() => void invite()}
              className="btn btn-ghost btn-sm mx-auto gap-1.5"
            >
              <Share2 size={14} />
              Запросити ще друзів
            </button>
          ) : null}
        </div>
      )}
    </>
  );
}

/**
 * Міні-кільце денного прогресу навколо аватара — стан гравця видно
 * без читання цифр: скільки з'їдено до норми, перебір — червоним.
 */
function ProgressHalo({
  entry,
  size,
  children,
}: {
  entry: ArenaEntry;
  size: number;
  children: React.ReactNode;
}) {
  const stroke = 3;
  const s = size + 10;
  const r = (s - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p =
    entry.targetCalories > 0
      ? Math.min(1, entry.todayCalories / entry.targetCalories)
      : 0;
  const over = entry.difference < 0;
  const inTarget =
    entry.hasLog && entry.absError <= entry.targetCalories * 0.05;
  const color = over
    ? "var(--color-red)"
    : inTarget
      ? "var(--color-green)"
      : "var(--color-accent)";

  return (
    <div className="relative shrink-0" style={{ width: s, height: s }}>
      <svg
        aria-hidden
        className="absolute inset-0 -rotate-90"
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
      >
        <circle
          cx={s / 2}
          cy={s / 2}
          r={r}
          fill="none"
          stroke="color-mix(in srgb, var(--color-text) 14%, transparent)"
          strokeWidth={stroke}
        />
        {entry.hasLog && p > 0 ? (
          <circle
            cx={s / 2}
            cy={s / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - p)}
            className="transition-[stroke-dashoffset] duration-500"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/** Дружній штурхан: пуш супернику, сервер лімітує раз на годину на пару. */
function NudgeButton({ entry, size = 32 }: { entry: ArenaEntry; size?: number }) {
  const nudge = useNudge();
  if (entry.isMe) return null;

  const onNudge = () =>
    nudge.mutate(entry.userId, {
      onSuccess: () => toast.success(`Штурхан для ${entry.name} полетів 👉`),
      onError: (e) =>
        toast.error(e instanceof Error ? e.message : "Не вдалося штурхнути"),
    });

  return (
    <button
      type="button"
      className="icon-btn shrink-0"
      style={{ width: size, height: size }}
      aria-label={`Штурхнути ${entry.name}`}
      title="Штурхнути (раз на годину)"
      disabled={nudge.isPending}
      onClick={onNudge}
    >
      <BellRing size={Math.round(size / 2)} />
    </button>
  );
}

function Podium({ entries }: { entries: ArenaEntry[] }) {
  // Візуальний порядок: 2 · 1 · 3
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  const slots: { entry?: ArenaEntry; place: 1 | 2 | 3; h: string }[] = [
    { entry: second, place: 2, h: "h-[72px]" },
    { entry: first, place: 1, h: "h-[92px]" },
    { entry: third, place: 3, h: "h-[60px]" },
  ];

  return (
    <div className="mcard grid grid-cols-3 items-end gap-2 px-3 pb-3 pt-5">
      {slots.map(({ entry, place, h }) => (
        <div key={place} className="flex flex-col items-center gap-2">
          {entry ? (
            <>
              <ProgressHalo entry={entry} size={place === 1 ? 48 : 40}>
                <Avatar
                  name={entry.name}
                  avatarUrl={entry.avatarUrl}
                  size={place === 1 ? 48 : 40}
                  stage={entry.stage}
                  frame={entry.frame}
                />
              </ProgressHalo>
              <div className="flex w-full items-center justify-center gap-1">
                <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--color-text)]">
                  {entry.name}
                </span>
                {entry.isMe ? (
                  <span className="text-[11px] text-[var(--color-accent)]">ви</span>
                ) : (
                  <NudgeButton entry={entry} size={26} />
                )}
              </div>
            </>
          ) : (
            <div className="h-10 w-10 rounded-full bg-[var(--color-tile)]" />
          )}
          <div
            className={cn(
              "flex w-full items-start justify-center rounded-t-[var(--radius-md)] pt-2 text-[18px] font-bold tabular-nums",
              h,
              place === 1
                ? "bg-[color-mix(in_srgb,var(--color-accent)_28%,var(--color-tile))] text-[var(--color-accent)]"
                : "bg-[var(--color-tile)] text-[var(--color-muted2)]",
            )}
          >
            {place}
          </div>
        </div>
      ))}
    </div>
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
        "grid grid-cols-[36px_1fr_auto_auto] items-center gap-2 px-3 py-3",
        entry.isMe && "bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]",
      )}
    >
      <span className="text-[16px] font-semibold tabular-nums text-[var(--color-muted2)]">
        {entry.rank}
      </span>
      <div className="flex min-w-0 items-center gap-2.5">
        <ProgressHalo entry={entry} size={36}>
          <Avatar
            name={entry.name}
            avatarUrl={entry.avatarUrl}
            size={36}
            stage={entry.stage}
            frame={entry.frame}
          />
        </ProgressHalo>
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
          {entry.hasLog ? entry.score : "—"}
        </div>
        <div className="text-[12px] tabular-nums text-[var(--color-muted3)]">
          {!entry.hasLog
            ? "немає логу"
            : exact
              ? "влучно"
              : `${label} · ${over ? "перебір" : "недобір"}`}
        </div>
      </div>
      <NudgeButton entry={entry} />
    </li>
  );
}
