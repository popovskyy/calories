"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PresetMascot } from "@/components/avatars/PresetMascot";
import {
  AVATAR_PRESETS,
  parsePresetId,
  toPresetUrl,
  type AvatarPresetId,
} from "@/lib/avatar-presets";
import { cn } from "@/lib/cn";

interface AvatarPickerProps {
  value: string | null;
  onChange: (presetUrl: string) => void;
  className?: string;
}

/** Сітка локальних анімованих аватарів — користувач обирає і зберігає. */
export function AvatarPicker({ value, onChange, className }: AvatarPickerProps) {
  const reduce = useReducedMotion();
  const selected = parsePresetId(value);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="lbl">Оберіть персонажа</span>
      <div className="grid grid-cols-5 gap-2">
        {AVATAR_PRESETS.map((p, i) => {
          const active = selected === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              aria-label={p.nameUk}
              aria-pressed={active}
              onClick={() => onChange(toPresetUrl(p.id as AvatarPresetId))}
              initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                type: "spring",
                duration: 0.4,
                bounce: 0,
                delay: reduce ? 0 : Math.min(i * 0.03, 0.24),
              }}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-[var(--radius-md)] p-1 outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                active
                  ? "bg-[color-mix(in_srgb,var(--color-accent)_28%,transparent)] ring-2 ring-[var(--color-accent)]"
                  : "bg-[var(--color-tile)] hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]",
              )}
            >
              <motion.div
                animate={
                  reduce
                    ? undefined
                    : active
                      ? { scale: 1.06 }
                      : { scale: 1 }
                }
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              >
                <PresetMascot id={p.id} size={48} animated={active} />
              </motion.div>
            </motion.button>
          );
        })}
      </div>
      {selected ? (
        <p className="text-center text-[13px] text-[var(--color-muted3)]">
          {AVATAR_PRESETS.find((p) => p.id === selected)?.nameUk}
        </p>
      ) : (
        <p className="text-center text-[13px] text-[var(--color-muted3)]">
          Тапніть, щоб обрати
        </p>
      )}
    </div>
  );
}
