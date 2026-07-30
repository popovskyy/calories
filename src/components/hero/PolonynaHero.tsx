"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { HeroProps } from "@/components/hero/CalorieHero";
import { isInTargetFor } from "@/lib/economy";
import { DURATION_SHEET, EASE_OUT } from "@/lib/motion";
import { claimRitualSound, playSheepBell } from "@/lib/sfx";
import { useAppStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/hooks/useQueries";

/**
 * Полонина: сонце сходить над хребтом — висота = прогрес до норми.
 *
 * Єдина світла тема, тож логіка контрасту зворотна до нічних: текст темний
 * по теплому небу, а сцена — силуети хребта знизу. Перебір «пересвічує» небо
 * в спекотний полудень, недобір лишає світанок холоднішим.
 *
 * Ритуал перерахунку (той самий сигнал, що жбурляє дровину в Forest):
 * дзвенить дзвіночок, вівці підводять голови, сонце коротко спалахує.
 */
export function PolonynaHero({ consumed, target, frame, goal = "maintain" }: HeroProps) {
  const reduce = useReducedMotion();
  const neon = frame === "neon";
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(Math.max(consumed / safeTarget, 0), 1);
  const remaining = target - consumed;
  const over = remaining < 0;
  const inTarget = consumed > 0 && isInTargetFor(consumed, safeTarget, goal);

  const recalc = useAppStore((s) => s.recalc);
  const consumeRecalc = useAppStore((s) => s.consumeRecalc);
  const { user } = useCurrentUser();
  const pack = user?.soundpack ?? "default";
  const packRef = useRef(pack);
  packRef.current = pack;

  const ritualActive = recalc !== null;
  const ritualKey = recalc?.id ?? "idle";

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("uk-UA"));
  const rise = useMotionValue(0);
  // Сонце йде з-за хребта (y=196, сховане) вгору. Стеля 158 навмисна:
  // вище воно почало б налазити на смугу прогресу в текстовій зоні.
  const sunY = useTransform(rise, (v) => 196 - v * 38);
  const sunGlow = useTransform(rise, (v) => 0.25 + v * 0.45);
  const barTransform = useTransform(rise, (v) => `scaleX(${v})`);

  useEffect(() => {
    const dur = reduce ? 0 : DURATION_SHEET;
    const a1 = animate(count, consumed, { duration: dur, ease: EASE_OUT });
    const a2 = animate(rise, progress, { duration: dur, ease: EASE_OUT });
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [consumed, progress, count, rise, reduce]);

  useEffect(() => {
    if (!recalc) return;
    if (claimRitualSound(recalc.id)) playSheepBell(packRef.current);
    const t = window.setTimeout(consumeRecalc, 2600);
    return () => window.clearTimeout(t);
  }, [recalc, consumeRecalc]);

  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize = digits >= 5 ? "text-[44px]" : digits >= 4 ? "text-[52px]" : "text-[58px]";

  const sunColor = neon ? "#00f0ff" : over ? "#ff7a45" : "#ffb454";
  const barColor = neon ? "#00f0ff" : over ? "#c8493c" : inTarget ? "#4a8f57" : "#d2622a";

  return (
    <div className="relative my-1 h-[250px] w-full shrink-0 overflow-hidden">
      {/* ── Зона тексту ── */}
      <div className="absolute inset-x-0 top-1 z-[2] flex flex-col items-center">
        <motion.div
          className={`${numSize} font-bold leading-none text-[#33261c]`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {rounded}
        </motion.div>
        <div className="mt-1.5 text-[12px] font-medium text-[#7d6656]">
          із {target.toLocaleString("uk-UA")} ккал
        </div>
        <div
          className="mt-2 rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-bold"
          style={{
            background: over
              ? "color-mix(in srgb, #c8493c 18%, #fffaf3)"
              : inTarget
                ? "color-mix(in srgb, #4a8f57 18%, #fffaf3)"
                : "color-mix(in srgb, #d2622a 16%, #fffaf3)",
            color: over ? "#8e2f24" : inTarget ? "#2f5c39" : "#a34618",
            boxShadow: "inset 0 0 0 1px rgba(51,38,28,.12)",
          }}
        >
          {over
            ? `Перебір ${Math.abs(remaining).toLocaleString("uk-UA")}`
            : inTarget
              ? "У нормі"
              : `Ще ${remaining.toLocaleString("uk-UA")} ккал`}
        </div>

        <div className="relative mt-3.5 h-1.5 w-[76%] overflow-hidden rounded-full bg-[#e2d0bb]">
          <motion.div
            className="h-full w-full origin-left rounded-full"
            style={{
              transform: barTransform,
              background: `linear-gradient(90deg, color-mix(in srgb, ${barColor} 45%, transparent), ${barColor})`,
            }}
          />
        </div>
      </div>

      {/* ── Сцена ── */}
      <svg
        aria-hidden
        viewBox="0 0 320 250"
        preserveAspectRatio="xMidYMax meet"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <radialGradient id="pl-sunglow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={sunColor} stopOpacity=".55" />
            <stop offset="1" stopColor={sunColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pl-ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8f8fae" />
            <stop offset="1" stopColor="#a99ab0" />
          </linearGradient>
          <linearGradient id="pl-ridge-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4c6b4f" />
            <stop offset="1" stopColor="#3b5740" />
          </linearGradient>
          <linearGradient id="pl-meadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7ba05b" />
            <stop offset="1" stopColor="#5f8449" />
          </linearGradient>
        </defs>

        {/* сонце + ореол */}
        <motion.g style={{ y: sunY }}>
          <motion.ellipse cx="212" cy="0" rx="48" ry="44" fill="url(#pl-sunglow)" style={{ opacity: sunGlow }} />
          <circle
            cx="212"
            cy="0"
            r="17"
            fill={sunColor}
            style={{
              animation: reduce
                ? undefined
                : ritualActive
                  ? "plSunFlare 1.8s ease-out"
                  : inTarget
                    ? "plSunPulse 3.2s ease-in-out infinite"
                    : undefined,
            }}
          />
        </motion.g>

        {/* далекий хребет */}
        <path
          d="M0 196 L38 168 L72 184 L108 150 L146 180 L182 158 L220 186 L258 162 L300 188 L320 176 L320 250 L0 250 Z"
          fill="url(#pl-ridge-far)"
          opacity=".7"
        />
        {/* туман у долині */}
        <ellipse className="pl-fog" cx="130" cy="200" rx="150" ry="14" fill="#fdf3e6" opacity=".55" />
        {/* ближній хребет */}
        <path
          d="M0 214 L46 194 L96 210 L142 188 L196 212 L246 192 L292 210 L320 200 L320 250 L0 250 Z"
          fill="url(#pl-ridge-near)"
        />
        {/* полонина */}
        <path d="M0 226 Q80 216 160 226 Q240 236 320 224 L320 250 L0 250 Z" fill="url(#pl-meadow)" />

        {/* смереки */}
        <g fill="#2f4a37">
          <path d="M40 224 l7 -20 l7 20 z" />
          <path d="M42 216 l5 -14 l5 14 z" />
          <path d="M282 222 l6 -17 l6 17 z" />
        </g>

        {/* вівці: на ритуалі підводять голови */}
        <g
          key={`sheep-${ritualKey}`}
          className={ritualActive && !reduce ? "pl-sheep-alert" : undefined}
        >
          <Sheep x={120} y={232} />
          <Sheep x={166} y={238} flip />
        </g>

        {/* ватра — тепла крапка життя на полонині */}
        <ellipse cx="228" cy="234" rx="9" ry="4" fill="#6b4a2a" opacity=".5" />
        <path
          className="pl-fire"
          d="M228 232 q-4 -8 0 -12 q4 4 0 12 z"
          fill="#ff7a45"
        />
      </svg>
    </div>
  );
}

/** Вівця: тіло-хмаринка, темна морда, тонкі ніжки. */
function Sheep({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <path d="M2 6 h3 M8 6 h3" stroke="#4a3a2c" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="7" cy="2" rx="7.5" ry="5" fill="#fdf6ec" />
      <circle cx="2" cy="0" r="3" fill="#fdf6ec" />
      <circle cx="11.5" cy="1" r="3.2" fill="#fdf6ec" />
      <g className="pl-sheep-head">
        <ellipse cx="-1.5" cy="-1" rx="3.4" ry="3" fill="#4a3a2c" />
        <circle cx="-2.8" cy="-1.6" r=".7" fill="#fdf6ec" />
      </g>
    </g>
  );
}
