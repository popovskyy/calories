"use client";

import { Lock, ShieldBan } from "lucide-react";
import { useLogout, useCurrentUser } from "@/hooks/useQueries";

/**
 * Оверлей для сесій без доступу. Випадки два, і плутати їх не можна:
 *
 * - blocked — адмін призупинив доступ уже наявному акаунту (закинув щоденник
 *   тощо). Показуємо причину дослівно: це єдиний канал, де людина її побачить,
 *   і тон тут інший — це не черга, а санкція.
 * - !approved — новий акаунт чекає підтвердження. Пасивне очікування, зникне
 *   саме (useCurrentUser перепитує /me раз на 8 с).
 *
 * Сесія при цьому жива; API відсікає requireSession.
 */
export function AccessGate() {
  const { user, isLoading } = useCurrentUser();
  const logout = useLogout();

  if (isLoading || !user) return null;
  if (!user.blocked && user.approved) return null;

  const blocked = user.blocked;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-[color-mix(in_srgb,var(--color-bg)_92%,black)] px-6 text-center backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-gate-title"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-tile)] shadow-[var(--shadow-card)]"
        style={{ color: blocked ? "var(--color-red)" : "var(--color-accent)" }}
      >
        {blocked ? (
          <ShieldBan size={28} strokeWidth={2} />
        ) : (
          <Lock size={28} strokeWidth={2} />
        )}
      </div>
      <div className="max-w-sm">
        <h2
          id="access-gate-title"
          className="text-[22px] font-semibold text-[var(--color-text)]"
        >
          {blocked ? "Доступ призупинено" : "Очікуйте підтвердження"}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted2)]">
          {blocked
            ? user.blockReason?.trim() ||
              "Адміністратор закрив доступ до акаунта."
            : "Акаунт створено. Адмін має відкрити доступ — після цього замок зникне сам."}
        </p>
        {blocked ? (
          <p className="mt-2 text-[13px] text-[var(--color-muted3)]">
            Записи нікуди не зникли — доступ повернеться, щойно адмін розблокує.
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        Вийти
      </button>
    </div>
  );
}
