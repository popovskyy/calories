"use client";

import { useEffect, useState } from "react";
import { Check, Lock, MapPin } from "lucide-react";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import type { EpicStatusDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Картка хроніки з вузлами на шляху.
 *
 * Показуємо саме те, скільки ЛИШИЛОСЬ (ефект градієнта цілі): «12 км до
 * Канева» тягне вперед сильніше, ніж «пройдено 93 км».
 */
export function EpicCard({
  epic,
  compact = false,
  onStart,
  starting = false,
}: {
  epic: EpicStatusDTO;
  compact?: boolean;
  onStart?: (id: string) => void;
  starting?: boolean;
}) {
  const pct = epic.total > 0 ? Math.min(1, epic.progress / epic.total) : 0;
  const nearEnd = pct >= 0.8 && !epic.completed;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-md)] border p-3.5",
        epic.completed
          ? "border-[var(--color-accent)]"
          : "border-[var(--color-divider)]",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-[26px] leading-none">{epic.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-[var(--color-text)]">
            {epic.nameUk}
          </div>
          <p className="mt-0.5 text-[12px] leading-tight text-[var(--color-muted3)]">
            {epic.tagline}
          </p>
        </div>
        {epic.started ? (
          <span
            className={cn(
              "shrink-0 text-[12px] font-semibold tabular-nums",
              nearEnd ? "text-[var(--color-accent)]" : "text-[var(--color-muted3)]",
            )}
          >
            {epic.completed
              ? "Пройдено"
              : `${epic.remaining} ${epic.unit} лишилось`}
          </span>
        ) : null}
      </div>

      {epic.started ? (
        <>
          {/* Шкала з позначками вузлів */}
          <div className="relative h-2 rounded-full bg-[var(--color-tile)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500"
              style={{ width: `${pct * 100}%` }}
            />
            {epic.nodes.map((n) => (
              <span
                key={n.at}
                title={n.nameUk}
                className={cn(
                  "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2",
                  n.claimed
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
                    : "border-[var(--color-divider)] bg-[var(--color-surface)]",
                )}
                style={{ left: `${(n.at / epic.total) * 100}%` }}
              />
            ))}
          </div>

          <div className="flex items-baseline justify-between text-[11px] text-[var(--color-muted3)]">
            <span className="tabular-nums">
              {epic.progress} / {epic.total} {epic.unit}
            </span>
            {nearEnd ? (
              <span className="font-semibold text-[var(--color-accent)]">
                Фінішна пряма
              </span>
            ) : null}
          </div>

          {!compact ? <JourneyPath epic={epic} /> : null}
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-sm self-start"
          disabled={starting}
          onClick={() => onStart?.(epic.epicId)}
        >
          Вирушити
        </button>
      )}
    </div>
  );
}

/**
 * Вертикальний шлях замість плоского списку: рейка зліва, пройдені вузли
 * зафарбовані, маркер «ти тут» стоїть між останнім пройденим і наступним,
 * лор відкривається лише пройденим — це і є нагорода за вузол.
 */
function JourneyPath({ epic }: { epic: EpicStatusDTO }) {
  // «+N з минулого візиту» — endowed-ефект, який інакше пропадає між сесіями.
  // Читаємо на монтуванні (ініціалізатор), а запис нової позначки — в ефекті.
  const [delta] = useState<number | null>(() => {
    try {
      const prev = Number(localStorage.getItem(`epic-seen:${epic.epicId}`));
      if (Number.isFinite(prev) && prev > 0 && epic.progress > prev + 0.05) {
        return Math.round((epic.progress - prev) * 10) / 10;
      }
    } catch {
      /* private mode */
    }
    return null;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`epic-seen:${epic.epicId}`, String(epic.progress));
    } catch {
      /* private mode */
    }
  }, [epic.epicId, epic.progress]);

  const nextIdx = epic.nodes.findIndex((n) => !n.claimed);

  return (
    <div className="flex flex-col">
      {delta !== null ? (
        <span className="mb-2 self-start rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--color-accent)]">
          +{delta} {epic.unit} з минулого візиту
        </span>
      ) : null}

      <ul className="flex flex-col">
        {epic.nodes.map((n, i) => {
          const isNext = i === nextIdx;
          const isLast = i === epic.nodes.length - 1;
          const toNode = Math.max(0, Math.round((n.at - epic.progress) * 10) / 10);
          return (
            <li key={n.at} className="grid grid-cols-[22px_1fr] gap-x-2.5">
              {/* Рейка: точка вузла + сегмент до наступного */}
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
                    n.claimed
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)]"
                      : isNext
                        ? "epic-next-dot border-[var(--color-accent)] bg-[var(--color-surface)]"
                        : "border-[var(--color-divider)] bg-[var(--color-tile)]",
                  )}
                >
                  {n.claimed ? (
                    <Check size={11} strokeWidth={3} />
                  ) : isNext ? (
                    <MapPin size={9} className="text-[var(--color-accent)]" />
                  ) : (
                    <Lock size={8} className="text-[var(--color-muted3)]" />
                  )}
                </span>
                {!isLast ? (
                  <span
                    className={cn(
                      "w-[2px] flex-1",
                      n.claimed
                        ? "bg-[var(--color-accent)]"
                        : "bg-[var(--color-divider)]",
                    )}
                  />
                ) : null}
              </div>

              <div className={cn("min-w-0 pb-3", isLast && "pb-0")}>
                <div
                  className={cn(
                    "text-[13px] font-semibold",
                    n.claimed || isNext
                      ? "text-[var(--color-text)]"
                      : "text-[var(--color-muted3)]",
                  )}
                >
                  {n.nameUk}
                  <span className="ml-1 font-normal text-[var(--color-muted3)]">
                    · {n.at} {epic.unit}
                  </span>
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-muted2)]">
                    <CoinIcon size={11} />
                    {n.coins}
                  </span>
                </div>

                {n.claimed ? (
                  <p className="mt-0.5 text-[12px] italic leading-snug text-[var(--color-muted3)]">
                    {n.loreUk}
                  </p>
                ) : isNext && !epic.completed ? (
                  <p className="mt-0.5 text-[12px] text-[var(--color-accent)]">
                    ще {toNode} {epic.unit} — і дізнаєшся, що тут
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
