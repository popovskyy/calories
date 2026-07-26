"use client";

import { Check, Lock } from "lucide-react";
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
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                nearEnd ? "bg-[var(--color-accent)]" : "bg-[var(--color-accent)]",
              )}
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

          {!compact ? (
            <ul className="flex flex-col gap-1.5">
              {epic.nodes.map((n) => (
                <li
                  key={n.at}
                  className={cn(
                    "flex items-start gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[12px]",
                    n.claimed
                      ? "bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                      : "bg-[var(--color-tile)]",
                  )}
                >
                  {n.claimed ? (
                    <Check size={13} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                  ) : (
                    <Lock size={12} className="mt-0.5 shrink-0 text-[var(--color-muted3)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[var(--color-text)]">
                      {n.nameUk}
                      <span className="ml-1 font-normal text-[var(--color-muted3)]">
                        · {n.at} {epic.unit}
                      </span>
                    </div>
                    {/* Лор відкривається лише пройденим — це і є нагорода за вузол */}
                    {n.claimed ? (
                      <p className="mt-0.5 italic text-[var(--color-muted3)]">
                        {n.loreUk}
                      </p>
                    ) : null}
                  </div>
                  <span className="flex shrink-0 items-center gap-0.5 font-semibold tabular-nums">
                    <CoinIcon size={12} />
                    {n.coins}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
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
