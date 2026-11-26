"use client";

import { Lightbulb, LightbulbOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLights, useSetLights } from "@/hooks/queries";

/**
 * Світло вдома (LED-стрічка). Натискання виконує ПК за ~10 с, тож кнопка пульсує, поки той не відзвітує.
 * Без налаштованого ключа (LIGHTS_TOKEN) або без відповіді дошки кнопки просто нема.
 */
export function LightButton() {
  const lights = useLights();
  const set = useSetLights();
  const l = lights.data;

  if (lights.isPending) return <div className="skeleton h-11 w-11 shrink-0 rounded-xl" />;
  if (!l?.configured) return null;

  const warn = l.stale || (!l.pending && !!l.error);
  const on = !l.pending && l.on === true;
  const Icon = on || l.pending ? Lightbulb : LightbulbOff;
  // Під час очікування «поточним» вважаємо замовлене, інакше повторне натискання скасувало б нічого
  const current = l.pending ? l.want : l.on !== false;
  const hint = l.stale
    ? "ПК не відповідає — світло виконається, коли він повернеться"
    : l.error
      ? `Світло: ${l.error}`
      : l.pending
        ? "Чекаю, поки ПК перемкне світло"
        : on
          ? "Світло ввімкнене — натисни, щоб вимкнути"
          : "Світло вимкнене — натисни, щоб ввімкнути";

  return (
    <button
      type="button"
      onClick={() => set.mutate(!current)}
      disabled={set.isPending}
      aria-pressed={on}
      aria-label={hint}
      title={hint}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-surface-2 shadow-sm transition active:scale-95 disabled:opacity-60",
        warn ? "border-amber-400/50 text-amber-300" : on ? "border-volt/40 text-volt" : "border-white/10 text-gray-400",
        l.pending && !l.stale && "animate-pulse",
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={2.1} />
    </button>
  );
}
