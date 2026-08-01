"use client";

/**
 * Декоративні ялинки біля оленя: 4–6 одночасно ростуть у випадкових
 * місцях лівого коридору (шлях оленя). Центр вогнища (~35–65%) і
 * рубабельні CampTree (~5% / ~95%) не чіпаємо — pointer-events-none.
 */

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

const LIVE_MIN = 4;
const LIVE_MAX = 6;
/** Мін. горизонтальний рознос між стовбурами (% ширини героя). */
const MIN_GAP_PCT = 4.2;
/** Лівий коридор біля оленя — чітко лівіше вогню. */
const BAND: [number, number] = [10, 29];

type Fir = {
  id: number;
  leftPct: number;
  bottomPx: number;
  scale: number;
  growMs: number;
  holdMs: number;
  fadeMs: number;
  phase: "growing" | "holding" | "fading";
};

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function pickSpot(existing: Fir[]): number | null {
  for (let i = 0; i < 28; i++) {
    const left = rand(BAND[0], BAND[1]);
    if (existing.every((f) => Math.abs(f.leftPct - left) >= MIN_GAP_PCT)) {
      return left;
    }
  }
  return null;
}

function spawnFir(id: number, existing: Fir[]): Fir | null {
  const leftPct = pickSpot(existing);
  if (leftPct == null) return null;
  const back = Math.random() < 0.42;
  return {
    id,
    leftPct,
    bottomPx: back ? rand(15, 22) : rand(5, 12),
    scale: back ? rand(0.42, 0.58) : rand(0.55, 0.78),
    growMs: rand(2400, 4800),
    holdMs: rand(8000, 17000),
    fadeMs: rand(800, 1500),
    phase: "growing",
  };
}

function seedGrove(): Fir[] {
  const out: Fir[] = [];
  const n = LIVE_MIN + Math.floor(Math.random() * (LIVE_MAX - LIVE_MIN + 1));
  let id = 1;
  for (let i = 0; i < n; i++) {
    const f = spawnFir(id++, out);
    if (f) out.push(f);
  }
  return out;
}

export function CampFirGrove() {
  const reduce = useReducedMotion();
  const [firs, setFirs] = useState<Fir[]>([]);
  const seq = useRef(0);
  const timers = useRef<Map<number, number>>(new Map());

  // SSR-safe seed після mount
  useEffect(() => {
    const initial = seedGrove();
    seq.current = initial.reduce((m, f) => Math.max(m, f.id), 0);
    setFirs(initial);
  }, []);

  useEffect(() => {
    const map = timers.current;
    const alive = new Set(firs.map((f) => f.id));

    // Прибрати таймери зниклих ялинок
    for (const [id, t] of map) {
      if (!alive.has(id)) {
        window.clearTimeout(t);
        map.delete(id);
      }
    }

    for (const fir of firs) {
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
          }, reduce ? 4000 : fir.holdMs),
        );
      } else if (fir.phase === "fading") {
        const ms = reduce ? 40 : fir.fadeMs;
        map.set(
          fir.id,
          window.setTimeout(() => {
            map.delete(fir.id);
            setFirs((prev) => {
              const without = prev.filter((f) => f.id !== fir.id);
              const target =
                without.length < LIVE_MIN
                  ? LIVE_MIN
                  : without.length < LIVE_MAX && Math.random() < 0.55
                    ? without.length + 1
                    : Math.max(LIVE_MIN, without.length);
              const next = [...without];
              while (next.length < target) {
                const spawned = spawnFir(++seq.current, next);
                if (!spawned) break;
                next.push(spawned);
              }
              return next;
            });
          }, ms),
        );
      }
    }
  }, [firs, reduce]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const t of map.values()) window.clearTimeout(t);
      map.clear();
    };
  }, []);

  if (firs.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden>
      {firs.map((fir) => (
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
            <FirSapling />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Компактна ялинка — той самий лісовий силует, без слідів сокири. */
function FirSapling() {
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
      <path d="M44 48 L70 92 L58 86 L52 96 L44 88 L36 96 L30 86 L18 92 Z" fill="#1a2e1a" />
      <path
        d="M44 52 L62 86 L54 82 L49 90 L44 84 L39 90 L34 82 L26 86 Z"
        fill="#2a4a28"
        opacity="0.9"
      />
      <path d="M44 28 L64 68 L54 62 L49 72 L44 64 L39 72 L34 62 L24 68 Z" fill="#243f22" />
      <path
        d="M44 32 L56 64 L51 60 L47 68 L44 62 L41 68 L37 60 L32 64 Z"
        fill="#355c32"
        opacity="0.85"
      />
      <path d="M44 8 L58 46 L51 42 L47 50 L44 44 L41 50 L37 42 L30 46 Z" fill="#2d4d2a" />
      <path
        d="M44 12 L52 42 L48 39 L46 45 L44 40 L42 45 L40 39 L36 42 Z"
        fill="#3f6a3a"
        opacity="0.9"
      />
      <path d="M44 4 L48 16 L44 14 L40 16 Z" fill="#4a7a42" />
    </svg>
  );
}
