"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Deer } from "@/components/ambient/Deer";
import { MoonCritter } from "@/components/pet/MoonCritter";
import { useThemeId } from "@/hooks/useThemeId";
import {
  computePetBody,
  petIdForTheme,
  petTriggerFromRecalc,
  type PetBody,
  type PetTrigger,
} from "@/lib/pet";
import { cn } from "@/lib/cn";
import { useAppStore } from "@/store/useAppStore";
import { haptic } from "@/lib/haptics";

interface ThemePetProps {
  consumed: number;
  target: number;
  className?: string;
}

/**
 * Компаньйон під героєм калорій: тема → персонаж, день → body, сейв → react.
 * Не споживає recalc (вогнище forest лишає собі ритуал).
 */
export function ThemePet({ consumed, target, className }: ThemePetProps) {
  const themeId = useThemeId();
  const petId = petIdForTheme(themeId);
  const body = computePetBody(consumed, target);
  const reduce = useReducedMotion();

  const recalc = useAppStore((s) => s.recalc);
  const [trigger, setTrigger] = useState<PetTrigger | null>(null);

  useEffect(() => {
    if (!recalc || recalc.delta <= 0) return;
    const next = petTriggerFromRecalc(recalc.delta, body);
    if (!next) return;
    setTrigger(next);
    const t = window.setTimeout(() => setTrigger(null), reduce ? 400 : 1600);
    return () => window.clearTimeout(t);
  }, [recalc?.id, recalc?.delta, body, reduce]);

  const onTap = () => {
    if (trigger) return;
    setTrigger("tap");
    haptic("click");
    window.setTimeout(() => setTrigger(null), reduce ? 300 : 700);
  };

  const label = bodyLabel(body, petId);

  return (
    <button
      type="button"
      onClick={onTap}
      className={cn(
        "flex w-full flex-col items-center gap-1.5 rounded-[var(--radius-md)] py-1 outline-none transition-opacity active:opacity-90",
        className,
      )}
      aria-label={label}
    >
      <motion.div
        className="relative flex h-[120px] w-full items-end justify-center"
        initial={false}
        animate={
          reduce
            ? undefined
            : trigger === "eat" || trigger === "over"
              ? { scale: [1, 1.06, 1] }
              : { scale: 1 }
        }
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        {petId === "deer" ? (
          <DeerPetView body={body} trigger={trigger} />
        ) : (
          <MoonCritter body={body} trigger={trigger} size={112} />
        )}
      </motion.div>
      <span className="text-[12px] font-medium text-[var(--color-muted3)]">
        {label}
      </span>
    </button>
  );
}

function DeerPetView({
  body,
  trigger,
}: {
  body: PetBody;
  trigger: PetTrigger | null;
}) {
  const reduce = useReducedMotion();
  const scared = body === "ache" || trigger === "over";

  return (
    <motion.div
      initial={false}
      animate={
        reduce
          ? undefined
          : trigger === "over"
            ? { x: [0, -4, 4, -3, 0] }
            : trigger === "eat"
              ? { y: [0, -5, 0] }
              : trigger === "tap"
                ? { rotate: [0, -6, 5, 0] }
                : { y: 0 }
      }
      transition={{ duration: trigger ? 0.9 : 0.3 }}
    >
      <Deer
        variant="camp"
        width={72}
        height={102}
        gait="idle"
        body={body}
        scared={scared}
      />
    </motion.div>
  );
}

function bodyLabel(body: PetBody, petId: string): string {
  const who = petId === "deer" ? "Олень" : "Місячний звір";
  if (body === "lean") return `${who} · голодний`;
  if (body === "plump") return `${who} · ситий`;
  if (body === "ache") return `${who} · болить живіт`;
  return `${who} · у формі`;
}
