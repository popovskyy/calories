"use client";

/**
 * Густий декоративний ліс позаду вогнища: багато ялинок зліва й справа
 * (+ далекий ряд за спиною вогню). Центр полум'я не затуляємо.
 * pointer-events-none, під оленем / вогнем.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Скільки «живих» (ротація росту) тримаємо поверх статичного фону. */
const LIVE_MIN = 8;
const LIVE_MAX = 12;
const MIN_GAP_PCT = 2.8;

/** Зони посадки — вогонь ~35–65% лишаємо майже вільним спереду. */
const LEFT_BAND: [number, number] = [1, 34];
const RIGHT_BAND: [number, number] = [66, 99];
/** Далекий ряд трохи заходить за вогонь, але вище / дрібніше. */
const BACK_BAND: [number, number] = [28, 72];

type Fir = {
  id: number;
  leftPct: number;
  bottomPx: number;
  scale: number;
  growMs: number;
  holdMs: number;
  fadeMs: number;
  phase: "growing" | "holding" | "fading";
  /** Статичний фон — не зникає. */
  permanent: boolean;
  tint: number;
};

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function pickBand(): { band: [number, number]; kind: "left" | "right" | "back" } {
  const r = Math.random();
  if (r < 0.42) return { band: LEFT_BAND, kind: "left" };
  if (r < 0.84) return { band: RIGHT_BAND, kind: "right" };
  return { band: BACK_BAND, kind: "back" };
}

function pickSpot(
  existing: Fir[],
  band: [number, number],
  kind: "left" | "right" | "back",
): number | null {
  for (let i = 0; i < 36; i++) {
    const left = rand(band[0], band[1]);
    // Не садити в «дірку» полум'я спереду
    if (kind !== "back" && left > 38 && left < 62) continue;
    if (existing.every((f) => Math.abs(f.leftPct - left) >= MIN_GAP_PCT)) {
      return left;
    }
  }
  return null;
}

function makeFir(id: number, existing: Fir[], permanent: boolean): Fir | null {
  const { band, kind } = pickBand();
  const leftPct = pickSpot(existing, band, kind);
  if (leftPct == null) return null;

  const isBack = kind === "back" || Math.random() < 0.35;
  const isFar = isBack || Math.random() < 0.25;

  return {
    id,
    leftPct,
    bottomPx: isFar ? rand(28, 52) : isBack ? rand(18, 32) : rand(4, 16),
    scale: isFar
      ? rand(0.22, 0.4)
      : isBack
        ? rand(0.38, 0.58)
        : rand(0.52, 0.82),
    growMs: permanent ? 0 : rand(2200, 5000),
    holdMs: permanent ? 1e9 : rand(14000, 32000),
    fadeMs: rand(900, 1800),
    phase: permanent || Math.random() < 0.55 ? "holding" : "growing",
    permanent,
    tint: rand(0.75, 1),
  };
}

function seedForest(): Fir[] {
  const out: Fir[] = [];
  let id = 1;
  // Густий статичний фон
  for (let i = 0; i < 18; i++) {
    const f = makeFir(id++, out, true);
    if (f) out.push(f);
  }
  // Живі саджанці
  const live = LIVE_MIN + Math.floor(Math.random() * (LIVE_MAX - LIVE_MIN + 1));
  for (let i = 0; i < live; i++) {
    const f = makeFir(id++, out, false);
    if (f) out.push(f);
  }
  return out;
}

export function CampFirGrove() {
  const reduce = useReducedMotion();
  const [firs, setFirs] = useState<Fir[]>([]);
  const seq = useRef(0);
  const timers = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const initial = seedForest();
    seq.current = initial.reduce((m, f) => Math.max(m, f.id), 0);
    setFirs(initial);
  }, []);

  const liveFirs = useMemo(() => firs.filter((f) => !f.permanent), [firs]);

  useEffect(() => {
    const map = timers.current;
    const rotating = liveFirs;
    const alive = new Set(rotating.map((f) => f.id));

    for (const [id, t] of map) {
      if (!alive.has(id)) {
        window.clearTimeout(t);
        map.delete(id);
      }
    }

    for (const fir of rotating) {
      if (map.has(fir.id)) continue;

      if (fir.phase === "growing") {
        const ms = reduce ? 40 : fir.growMs;
        map.set(
          fir.id,
          window.setTimeout(() => {
            map.delete(fir.id);
            setFirs((prev) =>
              prev.map((f) => (f.id === fir.id ? { ...f, phase: "holding" } : f)),
            );
          }, ms),
        );
      } else if (fir.phase === "holding") {
        map.set(
          fir.id,
          window.setTimeout(() => {
            map.delete(fir.id);
            setFirs((prev) =>
              prev.map((f) => (f.id === fir.id ? { ...f, phase: "fading" } : f)),
            );
          }, reduce ? 8000 : fir.holdMs),
        );
      } else if (fir.phase === "fading") {
        const ms = reduce ? 40 : fir.fadeMs;
        map.set(
          fir.id,
          window.setTimeout(() => {
            map.delete(fir.id);
            setFirs((prev) => {
              const without = prev.filter((f) => f.id !== fir.id);
              const liveCount = without.filter((f) => !f.permanent).length;
              const target =
                liveCount < LIVE_MIN
                  ? LIVE_MIN
                  : liveCount < LIVE_MAX && Math.random() < 0.5
                    ? liveCount + 1
                    : Math.max(LIVE_MIN, liveCount);
              const next = [...without];
              while (next.filter((f) => !f.permanent).length < target) {
                const spawned = makeFir(++seq.current, next, false);
                if (!spawned) break;
                next.push(spawned);
              }
              return next;
            });
          }, ms),
        );
      }
    }
  }, [liveFirs, reduce]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) window.clearTimeout(t);
      map.clear();
    };
  }, []);

  if (firs.length === 0) return null;

  // Дальні спочатку, ближні зверху (за bottom+scale)
  const sorted = [...firs].sort(
    (a, b) => b.bottomPx + b.scale * 20 - (a.bottomPx + a.scale * 20),
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden>
      {sorted.map((fir) => (
        <div
          key={fir.id}
          className="absolute"
          style={{
            left: `${fir.leftPct}%`,
            bottom: fir.bottomPx,
            width: 72,
            height: 110,
            marginLeft: -36,
            transform: `scale(${fir.scale})`,
            transformOrigin: "50% 100%",
            opacity: 0.55 + fir.tint * 0.45,
            zIndex: Math.round(fir.bottomPx),
          }}
        >
          <div
            className={
              fir.phase === "fading"
                ? "camp-fir-fade absolute inset-0"
                : fir.phase === "growing" && !reduce
                  ? "camp-tree-grow absolute inset-0"
                  : "absolute inset-0"
            }
            style={
              fir.phase === "growing" && !reduce
                ? {
                    transformOrigin: "50% 100%",
                    animation: `treeGrow ${fir.growMs}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                  }
                : fir.phase === "fading" && !reduce
                  ? {
                      transformOrigin: "50% 100%",
                      animation: `firFadeOut ${fir.fadeMs}ms ease-in forwards`,
                    }
                  : { transformOrigin: "50% 100%" }
            }
          >
            <FirSapling dark={fir.tint < 0.88} />
          </div>
        </div>
      ))}
    </div>
  );
}

function FirSapling({ dark = false }: { dark?: boolean }) {
  const canopy = dark ? "#152414" : "#1a2e1a";
  const mid = dark ? "#1e361c" : "#2a4a28";
  const tip = dark ? "#243f22" : "#3f6a3a";
  return (
    <svg
      width="72"
      height="110"
      viewBox="0 0 88 132"
      fill="none"
      className="overflow-visible"
      aria-hidden
    >
      <ellipse cx="44" cy="126" rx="16" ry="3" fill="#000" opacity="0.16" />
      <path
        d="M38 88c1 8 1.5 18 1.5 30h9c0-12 .5-22 1.5-30c-2-1-5-2-6-2s-4 1-6 2Z"
        fill="#4a3018"
      />
      <path
        d="M41 90c.6 8 .8 16 .9 28h5.2c0-12 .2-20 .8-28c-1.2-.6-2.8-1-3.45-1-.7 0-2.2.4-3.45 1Z"
        fill="#6b4524"
      />
      <path d="M44 48 L70 92 L58 86 L52 96 L44 88 L36 96 L30 86 L18 92 Z" fill={canopy} />
      <path
        d="M44 52 L62 86 L54 82 L49 90 L44 84 L39 90 L34 82 L26 86 Z"
        fill={mid}
        opacity="0.9"
      />
      <path d="M44 28 L64 68 L54 62 L49 72 L44 64 L39 72 L34 62 L24 68 Z" fill="#243f22" />
      <path
        d="M44 32 L56 64 L51 60 L47 68 L44 62 L41 68 L37 60 L32 64 Z"
        fill="#355c32"
        opacity="0.85"
      />
      <path d="M44 8 L58 46 L51 42 L47 50 L44 44 L41 50 L37 42 L30 46 Z" fill="#2d4d2a" />
      <path d="M44 12 L52 42 L48 39 L46 45 L44 40 L42 45 L40 39 L36 42 Z" fill={tip} opacity="0.9" />
      <path d="M44 4 L48 16 L44 14 L40 16 Z" fill="#4a7a42" />
    </svg>
  );
}
