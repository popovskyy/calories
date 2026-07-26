"use client";

import { useEffect, useState } from "react";

/**
 * Прокручує статуси очікування і зупиняється на останньому: повернення до
 * першої фрази читалось би як «зациклилось / зависло», а не як прогрес.
 *
 * `phrases` має бути стабільним посиланням (константа рівня модуля) — інакше
 * ефект перезапускається щорендера і лічильник ніколи не зрушить.
 */
export function useThinkingPhrase(phrases: string[], intervalMs = 1700) {
  const [step, setStep] = useState(0);
  // Лоадер живе рівно стільки, скільки триває запит, тож скидати лічильник
  // не треба — він завжди монтується з нуля.
  const index = Math.min(step, phrases.length - 1);

  useEffect(() => {
    if (phrases.length < 2) return;
    const id = window.setInterval(() => {
      setStep((prev) => (prev >= phrases.length - 1 ? prev : prev + 1));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [phrases, intervalMs]);

  return { phrase: phrases[index] ?? "", index, isLast: index >= phrases.length - 1 };
}
