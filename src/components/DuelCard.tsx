"use client";

import { Swords } from "lucide-react";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useChallengeDuel,
  useCurrentUser,
  useDuels,
  useRespondDuel,
} from "@/hooks/useQueries";
import type { DuelDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Дуель тижня — соціальний важіль, який працює навіть удвох.
 *
 * Лідерборд на 2–5 гравців нічого не дає: місця й так очевидні. А прямий
 * виклик конкретній людині створює підзвітність — злити його перед другом
 * незручно, і саме це тримає дисципліну сильніше за будь-яку монету.
 */
export function DuelCard() {
  const { user } = useCurrentUser();
  const q = useDuels();
  const challenge = useChallengeDuel();
  const respond = useRespondDuel();

  const onChallenge = (id: string) =>
    challenge.mutate(id, {
      onSuccess: () => toast.success("Виклик кинуто!"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
    });

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
        <span className="lbl">Дуель тижня</span>
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  const duels = q.data?.duels ?? [];
  const rivals = q.data?.rivals ?? [];
  const active = duels.filter((d) => d.status === "pending" || d.status === "accepted");
  const settled = duels.filter((d) => d.status === "settled");

  return (
    <section className="mcard flex flex-col gap-3 p-[18px]">
      <div className="flex items-center gap-2">
        <Swords size={16} className="text-[var(--color-accent)]" />
        <span className="lbl">Дуель тижня</span>
      </div>
      <p className="text-[12px] text-[var(--color-muted3)]">
        Хто набере більше днів у ±5%. Обидва ставлять монети — переможець
        забирає банк.
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
          <div className="flex flex-col gap-2">
            <span className="text-[12px] text-[var(--color-muted3)]">
              Кинути виклик:
            </span>
            <div className="flex flex-wrap gap-2">
              {rivals.map((r) => (
                <button
                  key={r.id}
                  className="btn btn-ghost btn-sm"
                  disabled={challenge.isPending}
                  onClick={() => onChallenge(r.id)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )
      ) : null}

      {settled.length > 0 ? (
        <div className="flex flex-col gap-1 border-t border-[var(--color-divider)] pt-2">
          {settled.slice(0, 2).map((d) => {
            const iWon = d.winnerId === user?.id;
            return (
              <div
                key={d.id}
                className="flex items-center justify-between text-[12px] text-[var(--color-muted3)]"
              >
                <span>
                  {d.challengerName} {d.challengerScore} : {d.opponentScore}{" "}
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
          проти {rival}
        </span>
        <span className="flex items-center gap-1 text-[13px] font-semibold tabular-nums">
          <CoinIcon size={13} />
          {duel.stake * 2}
        </span>
      </div>

      {duel.status === "accepted" ? (
        <div className="mt-2 flex items-center justify-center gap-3">
          <span
            className={cn(
              "text-[24px] font-bold tabular-nums",
              leading ? "text-[var(--color-accent)]" : "text-[var(--color-text)]",
            )}
          >
            {myScore}
          </span>
          <span className="text-[13px] text-[var(--color-muted3)]">:</span>
          <span className="text-[24px] font-bold tabular-nums text-[var(--color-text)]">
            {theirScore}
          </span>
        </div>
      ) : duel.awaitingMe ? (
        <div className="mt-2 flex gap-2">
          <button
            className="btn btn-primary btn-sm flex-1"
            disabled={pending}
            onClick={() => onRespond(duel.id, true)}
          >
            Прийняти
          </button>
          <button
            className="btn btn-ghost btn-sm"
            disabled={pending}
            onClick={() => onRespond(duel.id, false)}
          >
            Ні
          </button>
        </div>
      ) : (
        <p className="mt-1.5 text-[12px] text-[var(--color-muted3)]">
          Чекаємо на відповідь суперника
        </p>
      )}
    </div>
  );
}
