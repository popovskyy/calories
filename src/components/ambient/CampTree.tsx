"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { playWoodChop } from "@/lib/sfx";
import { CampLogVisual } from "@/components/ambient/CampLogVisual";

const CHOPS_NEEDED = 10;
const FALL_MS = 560;
const RESPAWN_MS = 3500;
const AXE_SWING_MS = 420;

type Phase = "ready" | "chopping" | "falling" | "logs";

interface CampTreeProps {
  /** Колоду кинули у вогонь — Campfire збільшує полум'я й грає toss. */
  onLogToss: () => void;
  /** Бік вогнища: ліве дерево падає вліво, праве — вправо. */
  side?: "left" | "right";
}

/**
 * Сосна біля вогнища: одразу готова → рубається тапами → колоди → респавн.
 * Локальний ambient-стейт, без armRecalc / meal-ритуалу.
 */
export function CampTree({ onLogToss, side = "right" }: CampTreeProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("ready");
  const [chops, setChops] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  /** Сокира лише на час свінгу — інакше після респавну «сама» з’являється. */
  const [axeKey, setAxeKey] = useState(0);
  const [logs, setLogs] = useState<number[]>([]);
  const chopsRef = useRef(0);
  const logSeq = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  const axeClearRef = useRef<number | null>(null);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    return () => {
      if (axeClearRef.current != null) window.clearTimeout(axeClearRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "falling") return;
    const delay = reduce ? 0 : FALL_MS;
    const t = window.setTimeout(() => {
      const a = ++logSeq.current;
      const b = ++logSeq.current;
      setLogs([a, b]);
      setPhase("logs");
    }, delay);
    return () => window.clearTimeout(t);
  }, [phase, reduce]);

  useEffect(() => {
    if (phase !== "logs" || logs.length > 0) return;
    const t = window.setTimeout(() => {
      chopsRef.current = 0;
      setChops(0);
      setShakeKey(0);
      setAxeKey(0);
      setPhase("ready");
    }, RESPAWN_MS);
    return () => window.clearTimeout(t);
  }, [phase, logs.length]);

  const leanSign = side === "left" ? -1 : 1;
  // Нахил наростає сильніше ближче до кінця
  const leanDeg = Math.pow(chops / CHOPS_NEEDED, 1.15) * 22 * leanSign;
  const canChop = phase === "ready" || phase === "chopping";

  const onChop = () => {
    const p = phaseRef.current;
    if (p !== "ready" && p !== "chopping") return;

    playWoodChop();
    haptic("click");

    const next = chopsRef.current + 1;
    chopsRef.current = next;
    setChops(next);
    setShakeKey((k) => k + 1);
    if (!reduce) {
      setAxeKey((k) => k + 1);
      if (axeClearRef.current != null) window.clearTimeout(axeClearRef.current);
      axeClearRef.current = window.setTimeout(() => {
        setAxeKey(0);
        axeClearRef.current = null;
      }, AXE_SWING_MS);
    }
    if (p === "ready") setPhase("chopping");
    if (next >= CHOPS_NEEDED) {
      if (axeClearRef.current != null) {
        window.clearTimeout(axeClearRef.current);
        axeClearRef.current = null;
      }
      setAxeKey(0);
      setPhase("falling");
    }
  };

  const onTossLog = (id: number) => {
    setLogs((prev) => prev.filter((x) => x !== id));
    onLogToss();
  };

  const showTree =
    phase === "ready" || phase === "chopping" || phase === "falling";

  return (
    <div
      /* Ближче до вогню, щоб не вилазити за край екрана */
      className={`absolute bottom-[16px] z-[3] w-[100px] touch-manipulation select-none overflow-visible ${
        side === "left" ? "left-[5%]" : "right-[5%]"
      }`}
      aria-hidden
    >
      {showTree ? (
        <button
          type="button"
          className={`relative mx-auto block h-[140px] w-[92px] overflow-visible border-0 bg-transparent p-0 ${
            canChop ? "cursor-pointer" : "cursor-default"
          }`}
          style={{
            transformOrigin: "50% 100%",
            ["--lean" as string]: `${leanDeg}deg`,
            WebkitTapHighlightColor: "transparent",
          }}
          disabled={!canChop}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChop();
          }}
        >
          <span className="absolute inset-0 z-[2]" />

          {/* Сокира лише під час свінгу після тапу */}
          {canChop && axeKey > 0 && !reduce ? (
            <div
              key={`axe-${axeKey}`}
              className="camp-axe"
              style={{
                animation: `${
                  side === "left" ? "axeSwingLeft" : "axeSwingRight"
                } 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
              }}
            >
              <AxeVisual />
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute inset-0 overflow-visible"
            style={
              phase === "falling" && !reduce
                ? {
                    transformOrigin: side === "left" ? "20% 100%" : "80% 100%",
                    animation: `treeFall ${FALL_MS}ms cubic-bezier(0.45, 0.05, 0.55, 0.95) forwards`,
                  }
                : {
                    transformOrigin: "50% 100%",
                    transform: `rotate(${leanDeg}deg)`,
                    transition: reduce ? undefined : "transform 160ms ease-out",
                  }
            }
          >
            <div
              key={shakeKey}
              className={
                canChop && shakeKey > 0 && !reduce
                  ? "camp-tree-shake absolute inset-0"
                  : "absolute inset-0"
              }
              style={
                canChop && shakeKey > 0 && !reduce
                  ? {
                      /* удар синхронно з моментом контакту сокири (~52%) */
                      animation:
                        "treeChopHit 0.28s 0.18s cubic-bezier(0.22, 1, 0.36, 1) both",
                      ["--hit-dir" as string]: String(leanSign),
                    }
                  : undefined
              }
            >
              <PineVisual chops={chops} />
              {canChop && shakeKey > 0 && !reduce ? (
                <span
                  key={`chip-${shakeKey}`}
                  className="tree-chips"
                  style={{ animation: "treeChipFly 0.35s ease-out 0.18s both forwards" }}
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        </button>
      ) : null}

      {phase === "logs" ? (
        <div
          className={`relative flex h-11 w-[86px] items-end gap-1 pb-0.5 ${
            side === "left" ? "justify-end pr-0.5" : "justify-start pl-0.5"
          }`}
        >
          <div
            className={`pointer-events-none absolute bottom-0.5 h-3 w-3.5 rounded-sm ${
              side === "left" ? "right-3" : "left-3"
            }`}
            style={{
              background: "linear-gradient(#6b4626,#3d2814)",
              boxShadow: "inset 0 1px 0 #a97a4c",
            }}
          />
          {logs.map((id, i) => (
            <button
              key={id}
              type="button"
              className="relative z-[1] h-[14px] w-[38px] cursor-pointer border-0 bg-transparent p-0"
              style={{
                transform: `rotate(${i === 0 ? -10 : 9}deg)`,
                WebkitTapHighlightColor: "transparent",
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                haptic("click");
                onTossLog(id);
              }}
            >
              <CampLogVisual className="h-full w-full" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AxeVisual() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden>
      {/* держак */}
      <path
        d="M22 8 L12 30"
        stroke="#6b4424"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M21.2 9.2 L12.8 28.5"
        stroke="#a67a42"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* обух / лезо */}
      <path
        d="M18 6.5
           C22 4.5 28 5 30.5 8.5
           C31.5 10 31 12 29 13.2
           L20 17.5
           L17.5 12.5
           Z"
        fill="#8a96a3"
      />
      <path
        d="M19.5 8
           C23 6.5 27.5 7 29.2 9.5
           C29.8 10.5 29.4 11.6 28 12.4
           L21 15.5
           L19 11.2
           Z"
        fill="#c5d0db"
        opacity="0.85"
      />
      {/* кріплення */}
      <circle cx="20.5" fill="#3d2814" cy="13.5" r="1.6" />
    </svg>
  );
}

function PineVisual({ chops }: { chops: number }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-0.5">
      <svg
        width="78"
        height="120"
        viewBox="0 0 88 132"
        fill="none"
        aria-hidden
        className="overflow-visible"
      >
        <ellipse cx="44" cy="126" rx="20" ry="3.5" fill="#000" opacity="0.2" />

        <path
          d="M38 88c1 8 1.5 18 1.5 30h9c0-12 .5-22 1.5-30
             c-2-1-5-2-6-2s-4 1-6 2Z"
          fill="#4a3018"
        />
        <path
          d="M41 90c.6 8 .8 16 .9 28h5.2c0-12 .2-20 .8-28
             c-1.2-.6-2.8-1-3.45-1-.7 0-2.2.4-3.45 1Z"
          fill="#6b4524"
        />
        <path
          d="M43.2 92v26"
          stroke="#2a180c"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.45"
        />

        <path
          d="M44 48 L72 92 L60 86 L54 96 L44 88 L34 96 L28 86 L16 92 Z"
          fill="#1c331c"
        />
        <path
          d="M44 52 L64 86 L56 82 L50 90 L44 84 L38 90 L32 82 L24 86 Z"
          fill="#2a4a28"
          opacity="0.9"
        />
        <path
          d="M44 28 L66 68 L56 62 L50 72 L44 64 L38 72 L32 62 L22 68 Z"
          fill="#243f22"
        />
        <path
          d="M44 32 L58 64 L52 60 L47 68 L44 62 L41 68 L36 60 L30 64 Z"
          fill="#355c32"
          opacity="0.85"
        />
        <path
          d="M44 8 L60 46 L52 42 L47 50 L44 44 L41 50 L36 42 L28 46 Z"
          fill="#2d4d2a"
        />
        <path
          d="M44 12 L54 42 L49 39 L46 45 L44 40 L42 45 L39 39 L34 42 Z"
          fill="#3f6a3a"
          opacity="0.9"
        />
        <path d="M40 18 L36 40 L42 36 L40 50 L44 30 Z" fill="#7aab6a" opacity="0.18" />
        <path d="M44 4 L48 16 L44 14 L40 16 Z" fill="#4a7a42" />

        {chops >= 2 ? (
          <path d="M30 104 L46 100" stroke="#1a1008" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        ) : null}
        {chops >= 4 ? (
          <path d="M29 107 L47 103" stroke="#1a1008" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
        ) : null}
        {chops >= 6 ? (
          <path d="M28 110 L48 106" stroke="#1a1008" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
        ) : null}
        {chops >= 8 ? (
          <path d="M42 100 L56 106" stroke="#1a1008" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
        ) : null}
        {chops >= 9 ? (
          <path d="M31 112 L50 108" stroke="#1a1008" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
        ) : null}
      </svg>
    </div>
  );
}
