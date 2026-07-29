"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { PresetMascot } from "@/components/avatars/PresetMascot";
import {
  FREE_SKINS,
  parsePresetId,
  RARITY,
  toPresetUrl,
  type AvatarPreset,
  type SkinArtKind,
} from "@/lib/avatar-presets";
import { cn } from "@/lib/cn";

interface AvatarPickerProps {
  value: string | null;
  onChange: (presetUrl: string) => void;
  className?: string;
  disabled?: boolean;
  /** id куплених преміум-скінів */
  ownedIds?: string[];
  /** якщо передано — не фетчимо каталог */
  skins?: AvatarPreset[];
  /** лише free (реєстрація) */
  freeOnly?: boolean;
}

/** Сітка аватарів: free — обираються, premium — із замком, поки не куплені. */
export function AvatarPicker({
  value,
  onChange,
  className,
  disabled = false,
  ownedIds = [],
  skins: skinsProp,
  freeOnly = false,
}: AvatarPickerProps) {
  const reduce = useReducedMotion();
  const selected = parsePresetId(value);
  const owned = new Set(ownedIds);
  const [skins, setSkins] = useState<AvatarPreset[]>(
    skinsProp ?? (freeOnly ? FREE_SKINS : FREE_SKINS),
  );

  useEffect(() => {
    if (skinsProp) {
      setSkins(skinsProp);
      return;
    }
    let cancelled = false;
    void fetch("/api/skins/catalog")
      .then((r) => r.json())
      .then((data: AvatarPreset[]) => {
        if (cancelled || !Array.isArray(data)) return;
        setSkins(freeOnly ? data.filter((s) => s.tier === "free") : data);
      })
      .catch(() => {
        if (!cancelled) setSkins(freeOnly ? FREE_SKINS : FREE_SKINS);
      });
    return () => {
      cancelled = true;
    };
  }, [skinsProp, freeOnly]);

  const list = freeOnly ? skins.filter((s) => s.tier === "free") : skins;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="lbl">Оберіть персонажа</span>
      <div className="grid grid-cols-5 gap-2">
        {list.map((p, i) => {
          const active = selected === p.id;
          const locked = p.tier === "premium" && !owned.has(p.id);
          const r = RARITY[p.rarity];
          return (
            <motion.button
              key={p.id}
              type="button"
              aria-label={p.nameUk}
              aria-pressed={active}
              disabled={disabled}
              onClick={
                disabled
                  ? undefined
                  : () =>
                      locked
                        ? toast.message(`«${p.nameUk}» — у Магазині за монети`)
                        : onChange(toPresetUrl(p.id))
              }
              initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
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
                disabled ? "opacity-60 cursor-not-allowed hover:bg-[var(--color-tile)]" : undefined,
              )}
              style={
                p.tier === "premium"
                  ? { boxShadow: `inset 0 0 0 1.5px ${r.color}` }
                  : undefined
              }
            >
              <motion.div
                animate={
                  reduce ? undefined : active ? { scale: 1.06 } : { scale: 1 }
                }
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              >
                <PresetMascot
                  id={p.id}
                  size={48}
                  animated={active}
                  artKind={p.artKind as SkinArtKind}
                  nameUk={p.nameUk}
                  bg={p.bg}
                />
              </motion.div>
              {locked ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)] bg-black/45">
                  <Lock size={16} className="text-white" />
                </div>
              ) : null}
            </motion.button>
          );
        })}
      </div>
      {selected ? (
        <p className="text-center text-[13px] text-[var(--color-muted3)]">
          {list.find((p) => p.id === selected)?.nameUk}
        </p>
      ) : (
        <p className="text-center text-[13px] text-[var(--color-muted3)]">
          Тапніть, щоб обрати
        </p>
      )}
    </div>
  );
}
