"use client";

import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWallet } from "@/hooks/useQueries";
import { cn } from "@/lib/cn";

const KIND_LABEL: Record<string, string> = {
  reward: "Ритуал",
  quest: "Квест",
  arena: "Арена",
  streak: "Серія",
  daily_card: "Картка дня",
  epic: "Хроніка",
  duel: "Дуель",
  skin: "Скін",
  theme: "Тема",
  item: "Спорядження",
  box: "Скринька",
  cosmetic: "Вигляд",
  admin: "Адмін",
};

/** Історія руху монет. До появи CoinTxn витрати не було видно взагалі. */
export function WalletSection() {
  const q = useWallet();

  if (q.isLoading) {
    return (
      <section className="flex flex-col gap-2">
        <span className="lbl">Гаманець</span>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </section>
    );
  }

  const txns = q.data?.txns ?? [];

  return (
    <section className="flex flex-col gap-2">
      <span className="lbl">Гаманець</span>

      {txns.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-[var(--color-muted3)]">
          Ще порожньо. Запиши їжу — і тут з&apos;явиться перший рядок.
        </p>
      ) : (
        <ul className="flex flex-col">
          {txns.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 border-b border-[var(--color-divider)] py-2.5 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] text-[var(--color-text)]">
                  {t.label}
                </div>
                <div className="text-[11px] text-[var(--color-muted3)]">
                  {KIND_LABEL[t.kind] ?? t.kind} ·{" "}
                  {new Date(t.createdAt).toLocaleDateString("uk-UA", {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 text-[14px] font-semibold tabular-nums",
                  t.delta >= 0 ? "text-[var(--color-accent)]" : "text-[var(--color-muted3)]",
                )}
              >
                {t.delta >= 0 ? "+" : "−"}
                {Math.abs(t.delta)}
                <CoinIcon size={13} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
