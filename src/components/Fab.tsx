"use client";

import Link, { useLinkStatus } from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { DURATION_UI, EASE_OUT } from "@/lib/motion";

/**
 * Плаваюча кнопка «+». Видима на всіх табах — записати їжу можна з арени чи
 * профілю без навігації назад. Без pathname-гейта кнопка не перемонтовується
 * на кожен перехід, тож поява анімується один раз за сесію.
 */
export function Fab({ href = "/add" }: { href?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-label="Додати їжу або калорії"
      className="fab-wrap right-4 z-20"
    >
      <FabButton />
    </Link>
  );
}

/**
 * Кнопка + індикатор очікування переходу.
 *
 * `useLinkStatus` працює лише всередині `<Link>`, тому це окремий компонент.
 * Без нього повільний перехід (маршрут ще не прогрітий, кілька навігацій у
 * черзі після швидкого перемикання табів) виглядає так, ніби тап не
 * зарахувався — і користувач тисне вдруге. Кільце з'являється із затримкою,
 * тож миттєві переходи лишаються без зайвого блимання.
 */
function FabButton() {
  const { pending } = useLinkStatus();
  const reduce = useReducedMotion();

  return (
    <motion.span
      data-pending={pending || undefined}
      initial={reduce ? { opacity: 0 } : { scale: 0.92, opacity: 0 }}
      animate={
        reduce
          ? { opacity: 1 }
          : { scale: pending ? 0.94 : 1, opacity: 1 }
      }
      whileTap={reduce ? undefined : { scale: 0.94 }}
      transition={
        reduce
          ? { opacity: { duration: DURATION_UI, ease: EASE_OUT } }
          : {
              // Спрінг лише на scale: спрінг по opacity осцилює навколо 1 і
              // читається як блимання (найпомітніше на пласкій minecraft-кнопці).
              scale: { type: "spring", stiffness: 500, damping: 26, delay: 0.05 },
              opacity: { duration: DURATION_UI, delay: 0.05, ease: EASE_OUT },
            }
      }
      className="fab-btn flex items-center justify-center text-[#f5f4ff]"
    >
      <Plus className="fab-btn-icon" strokeWidth={2.6} />
      {pending ? <span aria-hidden className="fab-ring" /> : null}
    </motion.span>
  );
}
