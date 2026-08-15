"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PresetMascot } from "@/components/avatars/PresetMascot";
import {
  DEFAULT_SKINS,
  parsePresetId,
  toPresetUrl,
  type SkinArtKind,
} from "@/lib/avatar-presets";
import { cn } from "@/lib/cn";

const PICKABLE = DEFAULT_SKINS.filter((s) => s.enabled !== false);

export function AvatarPicker({
  value,
  onChange,
  className,
  disabled = false,
}: {
  value: string | null;
  onChange: (presetUrl: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  const selected = parsePresetId(value);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="lbl">Оберіть персонажа</span>
      <div className="grid grid-cols-5 gap-2">
        {PICKABLE.map((p, i) => {
          const active = selected === p.id;
          return (
            <motion.button
              key={p.id}
              type="button"
              aria-label={p.nameUk}
              aria-pressed={active}
              disabled={disabled}
              onClick={disabled ? undefined : () => onChange(toPresetUrl(p.id))}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: "spring",
                duration: 0.4,
                bounce: 0,
                delay: reduce ? 0 : Math.min(i * 0.03, 0.24),
              }}
              whileTap={disabled || reduce ? undefined : { scale: 0.94 }}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-[var(--radius-md)] p-1 outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]",
                active
                  ? "bg-[color-mix(in_srgb,var(--color-accent)_28%,transparent)] ring-2 ring-[var(--color-accent)]"
                  : "bg-[var(--color-tile)] hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)]",
                disabled ? "opacity-60 cursor-not-allowed" : undefined,
              )}
            >
              <PresetMascot
                id={p.id}
                size={48}
                animated={active}
                artKind={p.artKind as SkinArtKind}
                nameUk={p.nameUk}
                bg={p.bg}
              />
            </motion.button>
          );
        })}
      </div>
      <p className="text-center text-[13px] text-[var(--color-muted3)]">
        {PICKABLE.find((p) => p.id === selected)?.nameUk ?? "Тапніть, щоб обрати"}
      </p>
    </div>
  );
}
