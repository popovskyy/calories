"use client";

import { Check, Lock } from "lucide-react";
import { PresetMascot } from "@/components/avatars/PresetMascot";
import { EVOLUTION_STAGES } from "@/lib/economy";
import { parsePresetId } from "@/lib/avatar-presets";
import type { ShopResponse, UserDTO } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Еволюція маскота — єдина «покупка», яку неможливо купити.
 *
 * Саме тому вона й найцінніша: маскот IV стадії доводить 250 днів дисципліни,
 * і в компанії з кількох друзів це читається з одного погляду. Для економіки
 * це нескінченна ціль, яка нічого не коштує.
 */
export function EvolutionSection({
  shop,
  user,
}: {
  shop: ShopResponse;
  user: UserDTO | null;
}) {
  const skinId = parsePresetId(user?.avatarUrl) ?? "kiwi";
  const stage = shop.evolutionStage;

  return (
    <section className="flex flex-col gap-3">
      <span className="lbl">Еволюція</span>
      <p className="text-[12px] text-[var(--color-muted3)]">
        Не продається. Стадії відкриває тільки дисципліна.
      </p>

      <div className="mcard flex items-center gap-4 p-4">
        <PresetMascot id={skinId} size={72} animated stage={stage} />
        <div className="min-w-0">
          <div className="text-[17px] font-semibold text-[var(--color-text)]">
            {EVOLUTION_STAGES[stage - 1]?.nameUk ?? "Новачок"}
          </div>
          <div className="mt-0.5 text-[12px] text-[var(--color-muted3)]">
            Стадія {stage} з {EVOLUTION_STAGES.length}
          </div>
          <div className="mt-1.5 flex gap-3 text-[12px] tabular-nums text-[var(--color-muted3)]">
            <span>Рекорд серії: {shop.maxStreak}</span>
            <span>Точних днів: {shop.inTargetDays}</span>
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {EVOLUTION_STAGES.map((s) => {
          const reached = stage >= s.stage;
          const isNext = stage + 1 === s.stage;
          return (
            <li
              key={s.stage}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] border p-3",
                reached
                  ? "border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]"
                  : "border-[var(--color-divider)]",
              )}
            >
              {reached ? (
                <Check size={16} className="shrink-0 text-[var(--color-accent)]" />
              ) : (
                <Lock size={14} className="shrink-0 text-[var(--color-muted3)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-[var(--color-text)]">
                  {s.nameUk}
                </div>
                <p className="text-[11px] text-[var(--color-muted3)]">
                  {s.stage === 1
                    ? "Стартова форма"
                    : `${s.inTargetDays} точних днів або серія ${s.streak}`}
                </p>
              </div>
              {/* Показуємо, скільки лишилось саме до НАСТУПНОЇ стадії */}
              {isNext ? (
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--color-accent)]">
                  ще{" "}
                  {Math.max(
                    0,
                    Math.min(
                      s.inTargetDays - shop.inTargetDays,
                      s.streak - shop.maxStreak,
                    ),
                  )}
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
