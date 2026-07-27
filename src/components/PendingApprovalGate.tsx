"use client";

import { Lock } from "lucide-react";
import { useLogout, useCurrentUser } from "@/hooks/useQueries";

/**
 * Залогінений, але ще не підтверджений адміном — повний оверлей.
 * Сесія жива; API (крім auth) відсікає requireSession.
 */
export function PendingApprovalGate() {
  const { user, isLoading } = useCurrentUser();
  const logout = useLogout();

  if (isLoading || !user || user.approved) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-5 bg-[color-mix(in_srgb,var(--color-bg)_92%,black)] px-6 text-center backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-approval-title"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-tile)] text-[var(--color-accent)] shadow-[var(--shadow-card)]">
        <Lock size={28} strokeWidth={2} />
      </div>
      <div className="max-w-sm">
        <h2
          id="pending-approval-title"
          className="text-[22px] font-semibold text-[var(--color-text)]"
        >
          Очікуйте підтвердження
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-muted2)]">
          Акаунт створено. Адмін має відкрити доступ — після цього замок зникне
          сам.
        </p>
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
