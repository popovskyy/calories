"use client";

import { toast } from "sonner";
import { useClaimRelief, useRelief } from "@/hooks/useQueries";

/**
 * Фонд підйомних.
 *
 * Гравець із порожнім гаманцем упирається в глухий кут: ані щит купити, ані
 * дуель прийняти, ані скриньку відкрити. Далі він просто перестає відкривати
 * ці екрани. Підйомні розблоковують гру, лишаючись обмеженими — раз на
 * тиждень і лише коли монет справді мало, тож заробляти чесно вигідніше.
 *
 * Картка сама зникає, коли підйомні недоступні, тому її можна вставляти
 * будь-де без зовнішніх умов.
 */
export function ReliefCard() {
  const q = useRelief();
  const claim = useClaimRelief();

  const status = q.data;
  if (!status?.available) return null;

  const onClaim = () =>
    claim.mutate(undefined, {
      onSuccess: (res) => toast.success(`Підйомні: +${res.status.amount} монет`),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Помилка"),
    });

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--color-accent)] p-3">
      <span className="text-[20px]">🪙</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-[var(--color-text)]">
          Підйомні з фонду
        </div>
        <p className="text-[11px] leading-tight text-[var(--color-muted3)]">
          Монет менше ніж {status.threshold} — візьми {status.amount}, щоб
          продовжити гру. Раз на тиждень.
        </p>
      </div>
      <button
        className="btn btn-primary btn-sm shrink-0"
        disabled={claim.isPending}
        onClick={onClaim}
      >
        Взяти
      </button>
    </div>
  );
}
