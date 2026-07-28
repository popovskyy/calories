"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUser, useShop, useStreak } from "@/hooks/useQueries";

/**
 * Один ненав’язливий hint після віхи стріку — без модалки на логін.
 * Показується раз на профіль (localStorage), поки є непреміум-тема для цілі.
 */
export function ThemeAspirationHint() {
  const { user } = useCurrentUser();
  const streak = useStreak();
  const shop = useShop();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || !shop.data) return;
    const days = streak.data?.streak ?? 0;
    if (days < 7) return;
    const key = `theme-hint:${user.id}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      return;
    }
    const premium = shop.data.themes.filter(
      (t) => t.tier === "premium" && !t.comingSoon && !t.owned,
    );
    if (premium.length === 0) return;
    setShow(true);
  }, [user, shop.data, streak.data?.streak]);

  if (!show || !shop.data) return null;

  // Показуємо найновішу неволодіну тему (останню в каталозі), а не прибиту
  // цвяхами конкретну: інакше кожен реліз теми вимагав би правки тут.
  const buyable = shop.data.themes.filter(
    (t) => t.tier === "premium" && !t.comingSoon && !t.owned,
  );
  const target = buyable[buyable.length - 1] ?? null;

  if (!target) return null;

  const dismiss = () => {
    try {
      if (user) localStorage.setItem(`theme-hint:${user.id}`, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="mcard flex items-center justify-between gap-3 border border-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] px-[16px] py-3">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[var(--color-text)]">
          У крамниці чекає «{target.nameUk}»
        </p>
        <p className="mt-0.5 text-[12px] text-[var(--color-muted3)]">
          {target.vibe} · {target.price} монет
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>
          Ок
        </button>
        <Link href="/shop" className="btn btn-primary btn-sm" onClick={dismiss}>
          Дивитись
        </Link>
      </div>
    </div>
  );
}
