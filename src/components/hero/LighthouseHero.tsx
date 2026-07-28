"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { HeroProps } from "@/components/hero/CalorieHero";
import { playFoghorn } from "@/lib/sfx";
import { useAppStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/hooks/useQueries";

/**
 * Маяк: цифри зверху, прогрес — смуга світла на воді, сцена — знизу.
 *
 * Попередній варіант ставив промінь і вежу просто за цифрами на темно-синьому:
 * читати було нічого, а статус зеленим текстом зливався з фоном. Тому тепер
 * жорсткий розподіл зон — текст ніколи не перетинається зі сценою, статус
 * винесено в контрастну пігулку, а прогрес читається смугою, а не кутом
 * променя (кут на 250px просто не зчитувався).
 *
 * Ритуал перерахунку (той самий сигнал, що жбурляє дровину в Forest):
 * промінь спалахує через усю воду, лампа розгорається, з темряви виходить
 * корабель, здалеку чути фогхорн. Кіт доглядача проводжає промінь поглядом.
 */
export function LighthouseHero({ consumed, target, frame }: HeroProps) {
  const reduce = useReducedMotion();
  const neon = frame === "neon";
  const safeTarget = target > 0 ? target : 1;
  const progress = Math.min(Math.max(consumed / safeTarget, 0), 1);
  const remaining = target - consumed;
  const over = remaining < 0;
  const inTarget = !over && Math.abs(remaining) <= safeTarget * 0.05 && consumed > 0;

  const recalc = useAppStore((s) => s.recalc);
  const consumeRecalc = useAppStore((s) => s.consumeRecalc);
  const { user } = useCurrentUser();
  const pack = user?.soundpack ?? "default";

  const ritualActive = recalc !== null;
  const ritualKey = recalc?.id ?? "idle";

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("uk-UA"));
  const fill = useMotionValue(0);
  const fillPct = useTransform(fill, (v) => `${v * 100}%`);

  useEffect(() => {
    const a1 = animate(count, consumed, { duration: 1.0, ease: [0.22, 1, 0.36, 1] });
    const a2 = animate(fill, progress, { duration: 1.15, ease: [0.22, 1, 0.36, 1] });
    return () => {
      a1.stop();
      a2.stop();
    };
  }, [consumed, progress, count, fill]);

  useEffect(() => {
    if (!recalc) return;
    playFoghorn(pack);
    const t = window.setTimeout(consumeRecalc, 2600);
    return () => window.clearTimeout(t);
  }, [recalc, consumeRecalc, pack]);

  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize = digits >= 5 ? "text-[44px]" : digits >= 4 ? "text-[52px]" : "text-[58px]";

  // Куплена рамка «Неон» перефарбовує світло маяка — інакше преміум-тема
  // просто з'їдала покупку (рамки не було видно взагалі).
  const barColor = neon
    ? over
      ? "#ff2bd6"
      : "#00f0ff"
    : over
      ? "#ff9a6c"
      : inTarget
        ? "#7fe3bd"
        : "#ffc878";
  const lampColor = neon ? (over ? "#ff2bd6" : "#aefaff") : over ? "#ff9a6c" : "#ffe0a8";
  const beamFrom = neon ? "#8df3ff" : "#ffd9a0";
  const beamTo = neon ? "#00f0ff" : "#ffb35c";

  return (
    <div className="relative my-1 h-[250px] w-full shrink-0 overflow-hidden">
      {/* ── Зона тексту: сцена сюди не заходить ── */}
      <div className="absolute inset-x-0 top-1 z-[2] flex flex-col items-center">
        <motion.div
          className={`${numSize} font-semibold leading-none text-[#fff6e6]`}
          style={{
            fontFamily: "var(--font-display)",
            textShadow: "0 2px 16px rgba(0,0,0,.6)",
          }}
        >
          {rounded}
        </motion.div>
        <div className="mt-1.5 text-[12px] font-medium text-[#a9c0d4]">
          із {target.toLocaleString("uk-UA")} ккал
        </div>
        <div
          className="mt-2 rounded-[var(--radius-pill)] px-3 py-1 text-[13px] font-bold"
          style={{
            background: over
              ? "color-mix(in srgb, #ff7a5c 30%, rgba(7,12,18,.9))"
              : inTarget
                ? "color-mix(in srgb, #5ec8a0 30%, rgba(7,12,18,.9))"
                : "color-mix(in srgb, #ffb35c 26%, rgba(7,12,18,.9))",
            color: over ? "#ffd9cc" : inTarget ? "#c9f5e4" : "#ffe6bd",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,.14)",
          }}
        >
          {over
            ? `Перебір ${Math.abs(remaining).toLocaleString("uk-UA")}`
            : inTarget
              ? "У нормі"
              : `Ще ${remaining.toLocaleString("uk-UA")} ккал`}
        </div>

        {/* Прогрес — смуга світла: читається миттєво, на відміну від кута променя */}
        <div className="relative mt-3.5 h-1.5 w-[76%] overflow-hidden rounded-full bg-[#1b2836]">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: fillPct,
              background: `linear-gradient(90deg, color-mix(in srgb, ${barColor} 45%, transparent), ${barColor})`,
              boxShadow: `0 0 10px ${barColor}80`,
            }}
          />
        </div>
      </div>

      {/* ── Зона сцени: нижні 44% ── */}
      <svg
        aria-hidden
        viewBox="0 0 320 250"
        preserveAspectRatio="xMidYMax meet"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient id="lh-beam" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0" stopColor={beamFrom} stopOpacity=".3" />
            <stop offset=".45" stopColor={beamTo} stopOpacity=".12" />
            <stop offset="1" stopColor={beamTo} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lh-tower" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#16202c" />
            <stop offset=".42" stopColor="#31445a" />
            <stop offset="1" stopColor="#111925" />
          </linearGradient>
          <linearGradient id="lh-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#12202e" />
            <stop offset="1" stopColor="#080e15" />
          </linearGradient>
          <radialGradient id="lh-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={beamTo} stopOpacity=".42" />
            <stop offset="1" stopColor={beamTo} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* зорі — високо, поза текстом */}
        <circle cx="26" cy="150" r="1.4" fill="#dbe8f5" opacity=".45" />
        <circle cx="62" cy="132" r="1" fill="#dbe8f5" opacity=".3" />
        <circle cx="292" cy="140" r="1.2" fill="#dbe8f5" opacity=".35" />

        {/* промінь над водою, від ліхтаря вліво */}
        <polygon points="246,168 252,168 8,224 8,196" fill="url(#lh-beam)" />
        {ritualActive && !reduce ? (
          <polygon
            key={`sweep-${ritualKey}`}
            points="246,168 252,168 8,232 8,188"
            fill="url(#lh-beam)"
            style={{ animation: "lhBeamSweep 1.7s cubic-bezier(.22,1,.36,1) forwards" }}
          />
        ) : null}

        {/* вода */}
        <rect x="0" y="212" width="320" height="38" fill="url(#lh-water)" />
        <g strokeLinecap="round" fill="none">
          <path d="M8 219 h34 M58 219 h22 M96 219 h40 M154 219 h26 M198 219 h34" stroke="#4c6885" strokeWidth="1.1" opacity=".55" />
          <path d="M20 229 h28 M64 229 h34 M116 229 h22 M158 229 h40 M226 229 h34" stroke="#3a5670" strokeWidth="1.1" opacity=".45" />
          <path d="M42 240 h26 M86 240 h32 M138 240 h38 M196 240 h28 M242 240 h36" stroke="#2c4258" strokeWidth="1.1" opacity=".38" />
        </g>
        {/* відблиск ліхтаря на воді */}
        <ellipse cx="249" cy="224" rx="9" ry="18" fill={beamTo} opacity=".2" />

        {/* скеля з підсвіченим гребенем — інакше зливається з водою */}
        <path d="M218 214 L228 200 L272 200 L282 214 Z" fill="#0e1721" />
        <path d="M228 200 L272 200" stroke="#3c5063" strokeWidth="1.2" opacity=".8" />

        {/* вежа: струнка, з двома тонкими смугами */}
        <path d="M239 200 L241.5 172 L258.5 172 L261 200 Z" fill="url(#lh-tower)" stroke={neon ? "#00f0ff" : "#3d5169"} strokeWidth="1.2" />
        <path d="M240.2 192 L259.8 192 L259.4 187 L240.6 187 Z" fill="#c9435a" opacity=".55" />
        <path d="M241 181 L259 181 L258.7 177 L241.3 177 Z" fill="#c9435a" opacity=".4" />

        {/* галерея + ліхтарна кімната */}
        <ellipse cx="250" cy="162" rx="36" ry="28" fill="url(#lh-halo)" />
        <rect x="236" y="168" width="28" height="4" rx="1.5" fill="#2a3848" />
        {/* скло ліхтаря: тепле ядро + ребра рами, а не білий брусок */}
        <rect
          x="242"
          y="155"
          width="16"
          height="13"
          rx="2.5"
          fill={lampColor}
          style={{
            animation: reduce
              ? undefined
              : ritualActive
                ? "lhLampFlare 1.7s ease-out"
                : inTarget
                  ? "lighthousePulse 2.4s ease-in-out infinite"
                  : undefined,
          }}
        />
        <g opacity=".5" stroke="#8a5a22" strokeWidth=".9">
          <path d="M246.5 155 v13 M253.5 155 v13" />
        </g>
        <path d="M241 155 L250 146 L259 155 Z" fill="#31445a" stroke="#3d5169" strokeWidth="1" />
        <circle cx="250" cy="146" r="1.6" fill="#ffd58a" />

        {/* кіт доглядача на скелі біля вежі */}
        <g
          key={`cat-${ritualKey}`}
          className="lh-cat"
          transform="translate(219 186)"
          style={{
            animation:
              ritualActive && !reduce ? "lhCatWatch 2.4s ease-in-out forwards" : undefined,
          }}
        >
          {/* Тепла обвідка з боку ліхтаря — без неї силует тоне в темряві */}
          <g stroke="#c99a5c" strokeWidth=".9" strokeOpacity=".85">
            <ellipse cx="8" cy="12" rx="8" ry="3.4" fill="#0a0f16" />
            <circle cx="4" cy="7.6" r="4.4" fill="#0a0f16" />
            <path d="M0.8 5 L1.6 1 L4.2 4 Z" fill="#0a0f16" />
            <path d="M7.2 5 L6.4 1 L3.8 4 Z" fill="#0a0f16" />
          </g>
          <path className="lh-cat-tail" d="M15 12 q4.5 -1 4 -6.5" stroke="#8a6a40" strokeWidth="2.1" strokeLinecap="round" fill="none" />
          <circle className="lh-cat-eye" cx="2.4" cy="7.4" r=".95" fill="#ffd58a" />
          <circle className="lh-cat-eye" cx="5.6" cy="7.4" r=".95" fill="#ffd58a" />
        </g>

        {/* корабель, який промінь вихоплює з темряви на ритуалі */}
        {ritualActive && !reduce ? (
          <g
            key={`ship-${ritualKey}`}
            opacity="0"
            style={{ animation: "lhShipReveal 2.2s ease-out forwards" }}
          >
            <path d="M52 214 L88 214 L82 221 L58 221 Z" fill="#0a0f16" />
            <rect x="68" y="203" width="1.8" height="11" fill="#0a0f16" />
            <circle cx="62" cy="209" r="1.7" fill="#ffd58a" />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
