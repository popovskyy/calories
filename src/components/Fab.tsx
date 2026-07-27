"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

/**
 * Плаваюча кнопка «+». Видима на всіх табах — записати їжу можна з арени чи
 * профілю без навігації назад. Без pathname-гейта кнопка не перемонтовується
 * на кожен перехід, тож поява анімується один раз за сесію.
 */
export function Fab({ href = "/add" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="Додати їжу або калорії"
      className="fab-wrap absolute right-4 z-20"
    >
      <motion.span
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          // Спрінг лише на scale: спрінг по opacity осцилює навколо 1 і
          // читається як блимання (найпомітніше на пласкій minecraft-кнопці).
          scale: { type: "spring", stiffness: 500, damping: 26, delay: 0.05 },
          opacity: { duration: 0.2, delay: 0.05, ease: "easeOut" },
        }}
        className="fab-btn flex items-center justify-center text-[#f5f4ff]"
      >
        <Plus className="fab-btn-icon" strokeWidth={2.6} />
      </motion.span>
    </Link>
  );
}
