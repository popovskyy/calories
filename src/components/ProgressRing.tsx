"use client";

import { isInTargetFor } from "@/lib/economy";
import type { Goal } from "@/lib/calories";
import { useEffect, useId } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/cn";
import { DURATION_SHEET, EASE_OUT } from "@/lib/motion";

const R = 108;
const C = 2 * Math.PI * R;
const SIZE = 248;
const CX = SIZE / 2;

export type RingMotion = "flare" | "none";

export type OverTone = "crimson" | "amber" | "magenta";

export const OVER_TONES: {
  id: OverTone;
  label: string;
  from: string;
  to: string;
  rgb: string;
  glow: string;
}[] = [
  { id: "crimson", label: "Crimson", from: "#ff6b6b", to: "#e03e3e", rgb: "224,100,100", glow: "rgba(224,100,100,0.6)" },
  { id: "amber", label: "Amber", from: "#ffb347", to: "#e08a1e", rgb: "224,138,30", glow: "rgba(224,138,30,0.55)" },
  { id: "magenta", label: "Magenta", from: "#e879a8", to: "#c2385a", rgb: "194,56,90", glow: "rgba(194,56,90,0.6)" },
];

/** Прод-дефолт: magenta + flare. */
const DEFAULT_OVER = OVER_TONES.find((t) => t.id === "magenta")!;

interface ProgressRingProps {
  consumed: number;
  target: number;
  frame?: string | null;
  goal?: Goal;
  /** Playground override; у проді flare завжди увімкнений. */
  motion?: RingMotion;
  /** Колір дуги перебору; дефолт — magenta. */
  overTone?: OverTone;
}

type RingStatus = "under" | "inTarget" | "over";

function statusOf(consumed: number, target: number, goal: Goal): RingStatus {
  const remaining = target - consumed;
  if (remaining < 0) return "over";
  if (consumed > 0 && isInTargetFor(consumed, target > 0 ? target : 1, goal)) {
    return "inTarget";
  }
  return "under";
}

const STATUS_COLOR: Record<Exclude<RingStatus, "over">, string> = {
  under: "var(--color-green)",
  inTarget: "var(--color-accent)",
};

const STATUS_RGB: Record<Exclude<RingStatus, "over">, string> = {
  under: "107, 191, 138",
  inTarget: "145, 132, 217",
};

export function ProgressRing({
  consumed,
  target,
  frame,
  goal = "maintain",
  motion: ringMotion = "flare",
  overTone = "magenta",
}: ProgressRingProps) {
  const reduce = useReducedMotion();
  const neon = frame === "neon";
  const uid = useId().replace(/:/g, "");
  const safeTarget = target > 0 ? target : 1;
  const rawProgress = consumed / safeTarget;
  const progress = Math.min(Math.max(rawProgress, 0), 1);
  const remaining = target - consumed;
  const over = remaining < 0;
  const overProgress = over ? Math.min(rawProgress - 1, 1) : 0;
  const status = statusOf(consumed, safeTarget, goal);
  const nearTarget = status === "inTarget";
  const ot = OVER_TONES.find((t) => t.id === overTone) ?? DEFAULT_OVER;
  const flare = ringMotion === "flare" && !neon;
  const statusColor =
    status === "over" ? ot.to : STATUS_COLOR[status];
  const statusRgb =
    status === "over" ? ot.rgb : STATUS_RGB[status];

  const themeGradId = `ring-theme-${uid}`;
  const statusGradId = `ring-status-${uid}`;
  const overGradId = `ring-over-${uid}`;

  const offset = useMotionValue(C);
  const overOffset = useMotionValue(C);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    Math.round(v).toLocaleString("uk-UA"),
  );

  useEffect(() => {
    const dur = reduce ? 0 : DURATION_SHEET;
    const a1 = animate(offset, C - C * progress, {
      duration: dur,
      ease: EASE_OUT,
    });
    const a2 = animate(count, consumed, {
      duration: dur,
      ease: EASE_OUT,
    });
    const a3 = animate(overOffset, C - C * overProgress, {
      duration: dur,
      delay: reduce || !over ? 0 : 0.08,
      ease: EASE_OUT,
    });
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [progress, consumed, overProgress, over, offset, overOffset, count, reduce]);

  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize =
    digits >= 5 ? "text-[42px]" : digits >= 4 ? "text-[56px]" : "text-[64px]";

  return (
    <div
      className={cn(
        "relative my-1.5 h-[248px] w-[248px] shrink-0",
        flare && "ring-play ring-play--flare",
      )}
    >
      {/* Halo: у нормі завжди; при flare — також за статусом */}
      {((nearTarget && !neon) || (flare && !nearTarget)) && !reduce ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: flare ? -8 : -4,
            boxShadow: flare
              ? `0 0 20px rgba(${statusRgb},0.4), inset 0 0 14px rgba(${statusRgb},0.14)`
              : "0 0 18px rgba(145,132,217,0.35), inset 0 0 12px rgba(145,132,217,0.12)",
            border: flare
              ? `1px solid rgba(${statusRgb},0.45)`
              : "1px solid rgba(145,132,217,0.35)",
          }}
          animate={{
            opacity: status === "over" ? [0.55, 1, 0.55] : [0.4, 0.88, 0.4],
          }}
          transition={{
            duration: status === "over" ? 1.6 : 2.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ) : null}

      {neon ? (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            inset: -6,
            boxShadow:
              "0 0 18px rgba(0,240,255,0.55), 0 0 36px rgba(255,43,214,0.35), inset 0 0 18px rgba(0,240,255,0.15)",
            border: "1.5px solid rgba(0,240,255,0.65)",
          }}
          animate={reduce ? undefined : { opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="relative z-[1] block overflow-hidden"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={CX}
          cy={CX}
          r={R}
          fill="none"
          stroke={
            neon
              ? "rgba(0,240,255,0.18)"
              : flare
                ? `rgba(${statusRgb},0.18)`
                : "var(--color-track)"
          }
          strokeWidth="20"
        />
        <motion.circle
          cx={CX}
          cy={CX}
          r={R}
          fill="none"
          stroke={flare ? `url(#${statusGradId})` : `url(#${themeGradId})`}
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray={C}
          style={{
            strokeDashoffset: offset,
            filter: neon
              ? "drop-shadow(0 0 6px rgba(0,240,255,0.85)) drop-shadow(0 0 12px rgba(255,43,214,0.45))"
              : flare
                ? `drop-shadow(0 0 8px rgba(${statusRgb},0.55))`
                : undefined,
          }}
          animate={
            flare && status === "over" && !reduce
              ? { opacity: [0.75, 1, 0.75] }
              : undefined
          }
          transition={{
            duration: status === "over" ? 1.5 : 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {over ? (
          <motion.circle
            cx={CX}
            cy={CX}
            r={R}
            fill="none"
            stroke={`url(#${overGradId})`}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={C}
            style={{
              strokeDashoffset: overOffset,
              filter: `drop-shadow(0 0 6px ${ot.glow})`,
            }}
            animate={reduce ? undefined : { opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        {flare && (over ? overProgress : progress) > 0.02 ? (
          <g
            transform={`rotate(${(over ? overProgress : progress) * 360} ${CX} ${CX})`}
          >
            <motion.circle
              cx={CX + R}
              cy={CX}
              r={7}
              fill={statusColor}
              style={{
                filter: `drop-shadow(0 0 6px rgba(${statusRgb},0.9))`,
              }}
              animate={
                reduce
                  ? undefined
                  : { opacity: [0.55, 1, 0.55] }
              }
              transition={{
                duration: status === "over" ? 1.2 : 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>
        ) : null}

        <defs>
          <linearGradient id={themeGradId} x1="0" y1="0" x2="1" y2="1">
            {neon ? (
              <>
                <stop offset="0" stopColor="#00F0FF" />
                <stop offset="0.55" stopColor="#7B61FF" />
                <stop offset="1" stopColor="#FF2BD6" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="var(--color-ring-from)" />
                <stop offset="1" stopColor="var(--color-ring-to)" />
              </>
            )}
          </linearGradient>
          <linearGradient id={overGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={ot.from} />
            <stop offset="1" stopColor={ot.to} />
          </linearGradient>
          <linearGradient id={statusGradId} x1="0" y1="0" x2="1" y2="1">
            <stop
              offset="0"
              stopColor={
                status === "over"
                  ? ot.from
                  : status === "under"
                    ? "#8fd4a8"
                    : "var(--color-ring-from)"
              }
            />
            <stop offset="1" stopColor={statusColor} />
          </linearGradient>
        </defs>
      </svg>

      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
        <div className="flex w-[176px] flex-col items-center justify-center overflow-hidden text-center">
          <motion.div
            className={`${numSize} font-semibold leading-[0.95] tracking-[-0.02em] text-[var(--color-text)]`}
            style={
              neon
                ? {
                    textShadow:
                      "0 0 12px rgba(0,240,255,0.35), 0 0 24px rgba(255,43,214,0.2)",
                  }
                : undefined
            }
          >
            {rounded}
          </motion.div>
          <div className="mt-1 max-w-full truncate text-[14px] leading-tight text-[var(--color-muted3)]">
            із {target.toLocaleString("uk-UA")} ккал
          </div>
          <div
            className="mt-1 max-w-full truncate text-[15px] font-semibold leading-tight"
            style={{
              color: over
                ? ot.to
                : neon
                  ? "#00F0FF"
                  : flare
                    ? statusColor
                    : "var(--color-green)",
              textShadow:
                neon && !over
                  ? "0 0 10px rgba(0,240,255,0.55)"
                  : flare
                    ? `0 0 10px rgba(${statusRgb},0.35)`
                    : undefined,
            }}
          >
            {over
              ? `Перебір ${Math.abs(remaining).toLocaleString("uk-UA")}`
              : nearTarget
                ? `У нормі · ще ${remaining.toLocaleString("uk-UA")}`
                : `Ще ${remaining.toLocaleString("uk-UA")}`}
          </div>
        </div>
      </div>
    </div>
  );
}
