"use client";

import { useState } from "react";
import { Swords } from "lucide-react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { ReliefCard } from "@/components/ReliefCard";
import {
  useChallengeDuel,
  useCurrentUser,
  useDuels,
  useRespondDuel,
} from "@/hooks/useQueries";
import { DUEL_STAKE, DUEL_STAKE_PRESETS } from "@/lib/economy";
import type { DuelDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Дуель тижня — хто більше днів у ±5%.
 * UI свідомо простий: ставка → друг → виклик. Без кастомних інпутів.
 */
export function DuelCard() {
  const { user } = useCurrentUser();
  const q = useDuels();
  const challenge = useChallengeDuel();
  const respond = useRespondDuel();
  const [stake, setStake] = useState<number>(DUEL_STAKE);

  const onChallenge = (opponentId: string) =>
    challenge.mutate(
      { opponentId, stake },
      {
        onSuccess: () =>
          toast.success(
            stake > 0 ? `Виклик кинуто · ставка ${stake}` : "Виклик кинуто · на інтерес",
          ),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  const onRespond = (duelId: string, accept: boolean) =>
    respond.mutate(
      { duelId, accept },
      {
        onSuccess: () => toast.success(accept ? "Дуель прийнято!" : "Виклик відхилено"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
      },
    );

  if (q.isLoading) {
    return (
      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl">Дуель</span>
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  const duels = q.data?.duels ?? [];
  const rivals = q.data?.rivals ?? [];
  const myCoins = user?.coins ?? 0;
  const active = duels.filter((d) => d.status === "pending" || d.status === "accepted");
  const settled = duels.filter((d) => d.status === "settled");

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-center gap-2">
        <Swords size={16} className="text-[var(--color-accent)]" />
        <span className="lbl">Дуель</span>
      </div>

      <p className="text-[13px] leading-snug text-[var(--color-muted2)]">
        Хто за тиждень набере <strong className="text-[var(--color-text)]">більше днів у ±5%</strong>{" "}
        — перемагає. Ставки знімаються при прийнятті; переможець забирає банк.
      </p>

      {active.map((d) => (
        <DuelRow
          key={d.id}
          duel={d}
          onRespond={onRespond}
          pending={respond.isPending}
        />
      ))}

      {active.length === 0 ? (
        rivals.length === 0 ? (
          <p className="text-[13px] text-[var(--color-muted3)]">
            Немає кого викликати — запроси друга в гру.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--color-muted3)]">
                1. Ставка
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DUEL_STAKE_PRESETS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setStake(v)}
                    className={cn(
                      "rounded-[var(--radius-pill)] border px-3 py-1.5 text-[13px] font-semibold tabular-nums transition-colors",
                      stake === v
                        ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-text)]"
                        : "border-[var(--color-divider)] text-[var(--color-muted3)]",
                    )}
                  >
                    {v === 0 ? (
                      "без монет"
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <CoinIcon size={12} />
                        {v}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {stake > 0 ? (
                <span className="text-[11px] text-[var(--color-muted3)]">
                  Кожен вносить {stake} · банк {stake * 2} · у тебе {myCoins}
                </span>
              ) : (
                <span className="text-[11px] text-[var(--color-muted3)]">
                  Граємо на інтерес — монети не чіпаємо
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-[var(--color-muted3)]">
                2. Кого викликати
              </span>
              <div className="flex flex-col gap-2">
                {rivals.map((r) => {
                  const tooPoor = stake > 0 && r.coins < stake;
                  const meBroke = stake > 0 && myCoins < stake;
                  const disabled = challenge.isPending || tooPoor || meBroke;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={cn(
                        "btn btn-ghost flex w-full items-center justify-between py-2.5 text-[14px]",
                        disabled && "opacity-50",
                      )}
                      disabled={disabled}
                      onClick={() => onChallenge(r.id)}
                    >
                      <span className="font-semibold text-[var(--color-text)]">
                        {r.name}
                      </span>
                      <span className="text-[12px] text-[var(--color-muted3)]">
                        {meBroke
                          ? "немає монет"
                          : tooPoor
                            ? `у нього ${r.coins}`
                            : "кинути виклик →"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )
      ) : null}

      <ReliefCard />

      {settled.length > 0 ? (
        <div className="flex flex-col gap-1 border-t border-[var(--color-divider)] pt-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted3)]">
            Минулі
          </span>
          {settled.slice(0, 3).map((d) => {
            const iWon = d.winnerId === user?.id;
            return (
              <div
                key={d.id}
                className="flex items-center justify-between text-[12px] text-[var(--color-muted3)]"
              >
                <span>
                  {d.challengerName} {d.challengerScore}:{d.opponentScore}{" "}
                  {d.opponentName}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    !d.winnerId
                      ? "text-[var(--color-muted3)]"
                      : iWon
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-red)]",
                  )}
                >
                  {!d.winnerId ? "нічия" : iWon ? "перемога" : "поразка"}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function DuelRow({
  duel,
  onRespond,
  pending,
}: {
  duel: DuelDTO;
  onRespond: (id: string, accept: boolean) => void;
  pending: boolean;
}) {
  const myScore = duel.isMine ? duel.challengerScore : duel.opponentScore;
  const theirScore = duel.isMine ? duel.opponentScore : duel.challengerScore;
  const rival = duel.isMine ? duel.opponentName : duel.challengerName;
  const leading = myScore > theirScore;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-divider)] p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-[var(--color-text)]">
          vs {rival}
        </span>
        {duel.stake > 0 ? (
          <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums">
            <CoinIcon size={13} />
            банк {duel.stake * 2}
          </span>
        ) : (
          <span className="text-[12px] font-semibold text-[var(--color-muted3)]">
            без монет
          </span>
        )}
      </div>

      {duel.status === "accepted" ? (
        <>
          <div className="mt-2 flex items-center justify-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-[11px] text-[var(--color-muted3)]">ти</span>
              <span
                className={cn(
                  "text-[28px] font-bold tabular-nums leading-none",
                  leading ? "text-[var(--color-accent)]" : "text-[var(--color-text)]",
                )}
              >
                {myScore}
              </span>
            </div>
            <span className="pt-3 text-[13px] text-[var(--color-muted3)]">:</span>
            <div className="flex flex-col items-center">
              <span className="text-[11px] text-[var(--color-muted3)]">{rival}</span>
              <span className="text-[28px] font-bold tabular-nums leading-none text-[var(--color-text)]">
                {theirScore}
              </span>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-[var(--color-muted3)]">
            Днів у ±5% цього тижня · оновлюється щодня
          </p>
        </>
      ) : duel.awaitingMe ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm flex-1"
            disabled={pending}
            onClick={() => onRespond(duel.id, true)}
          >
            Прийняти
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={pending}
            onClick={() => onRespond(duel.id, false)}
          >
            Відхилити
          </button>
        </div>
      ) : (
        <p className="mt-1.5 text-[12px] text-[var(--color-muted3)]">
          Чекаємо відповіді від {rival}
        </p>
      )}
    </div>
  );
}
