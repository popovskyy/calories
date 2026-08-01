"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { playWoodChop } from "@/lib/sfx";
import { CampLogVisual } from "@/components/ambient/CampLogVisual";

const CHOPS_NEEDED = 10;
const FALL_MS = 480;
const RESPAWN_MS = 3500;

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
  const [logs, setLogs] = useState<number[]>([]);
  const chopsRef = useRef(0);
  const logSeq = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Падіння → дві колоди
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

  // Усі колоди згоріли → пауза → знову готове дерево (без росту)
  useEffect(() => {
    if (phase !== "logs" || logs.length > 0) return;
    const t = window.setTimeout(() => {
      chopsRef.current = 0;
      setChops(0);
      setPhase("ready");
    }, RESPAWN_MS);
    return () => window.clearTimeout(t);
  }, [phase, logs.length]);

  const leanSign = side === "left" ? -1 : 1;
  const leanDeg = chops * 1.2 * leanSign;
  const canChop = phase === "ready" || phase === "chopping";
  const progress = chops / CHOPS_NEEDED;

  const onChop = () => {
    const p = phaseRef.current;
    if (p !== "ready" && p !== "chopping") return;

    // Звук/хаптик одразу — навіть якщо стейт ще не встиг оновитись
    playWoodChop();
    haptic("click");

    const next = chopsRef.current + 1;
    chopsRef.current = next;
    setChops(next);
    setShakeKey((k) => k + 1);
    if (p === "ready") setPhase("chopping");
    if (next >= CHOPS_NEEDED) setPhase("falling");
  };

  const onTossLog = (id: number) => {
    setLogs((prev) => prev.filter((x) => x !== id));
    onLogToss();
  };

  const showTree =
    phase === "ready" || phase === "chopping" || phase === "falling";

  return (
    <div
      className={`absolute bottom-[14px] z-[3] w-[100px] touch-manipulation select-none ${
        side === "left" ? "-left-3" : "-right-3"
      }`}
      aria-hidden
    >
      {showTree ? (
        <button
          type="button"
          className={`relative mx-auto block h-[150px] w-[92px] border-0 bg-transparent p-0 ${
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

          <div
            className="pointer-events-none absolute inset-x-1 bottom-3 top-0"
            style={
              phase === "falling" && !reduce
                ? {
                    transformOrigin: "50% 100%",
                    animation: `treeFall ${FALL_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`,
                  }
                : {
                    transformOrigin: "50% 100%",
                    transform: `rotate(${leanDeg}deg)`,
                  }
            }
          >
            <div
              key={shakeKey}
              className={
                (phase === "chopping" || phase === "ready") &&
                shakeKey > 0 &&
                !reduce
                  ? "camp-tree-shake absolute inset-0"
                  : "absolute inset-0"
              }
              style={
                (phase === "chopping" || phase === "ready") &&
                shakeKey > 0 &&
                !reduce
                  ? { animation: "treeChopShake 0.2s ease-out" }
                  : undefined
              }
            >
              <PineVisual chops={chops} />
            </div>
          </div>

          {/* Індикатор ударів — з зовнішнього боку, не на вогонь */}
          {canChop ? (
            <div
              className={`pointer-events-none absolute bottom-0 h-1.5 w-12 overflow-hidden rounded-full bg-black/40 ${
                side === "left" ? "left-1" : "right-1"
              }`}
            >
              <div
                className="h-full rounded-full bg-[#d4b07a]"
                style={{
                  width: `${Math.max(progress * 100, chops > 0 ? 6 : 0)}%`,
                  transition: reduce ? undefined : "width 100ms ease-out",
                }}
              />
            </div>
          ) : null}
        </button>
      ) : null}

      {phase === "logs" ? (
        <div className="relative mx-auto flex h-12 w-[100px] items-end justify-center gap-1.5 pb-1">
          <div
            className="pointer-events-none absolute bottom-1 left-1/2 h-3.5 w-4 -translate-x-1/2 rounded-sm"
            style={{
              background: "linear-gradient(#6b4626,#3d2814)",
              boxShadow: "inset 0 1px 0 #a97a4c",
            }}
          />
          {logs.map((id, i) => (
            <button
              key={id}
              type="button"
              className="relative z-[1] h-[15px] w-[42px] cursor-pointer border-0 bg-transparent p-0"
              style={{
                transform: `rotate(${i === 0 ? -14 : 12}deg)`,
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

function PineVisual({ chops }: { chops: number }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-0.5">
      <svg
        width="88"
        height="132"
        viewBox="0 0 88 132"
        fill="none"
        aria-hidden
        className="overflow-visible"
      >
        {/* м’яка тінь під кроною */}
        <ellipse cx="44" cy="126" rx="22" ry="4" fill="#000" opacity="0.22" />

        {/* стовбур */}
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

        {/* нижній ярус крони — зубчастий */}
        <path
          d="M44 48
             L72 92
             L60 86 L54 96 L44 88 L34 96 L28 86 L16 92
             Z"
          fill="#1c331c"
        />
        <path
          d="M44 52
             L64 86
             L56 82 L50 90 L44 84 L38 90 L32 82 L24 86
             Z"
          fill="#2a4a28"
          opacity="0.9"
        />

        {/* середній ярус */}
        <path
          d="M44 28
             L66 68
             L56 62 L50 72 L44 64 L38 72 L32 62 L22 68
             Z"
          fill="#243f22"
        />
        <path
          d="M44 32
             L58 64
             L52 60 L47 68 L44 62 L41 68 L36 60 L30 64
             Z"
          fill="#355c32"
          opacity="0.85"
        />

        {/* верхній ярус */}
        <path
          d="M44 8
             L60 46
             L52 42 L47 50 L44 44 L41 50 L36 42 L28 46
             Z"
          fill="#2d4d2a"
        />
        <path
          d="M44 12
             L54 42
             L49 39 L46 45 L44 40 L42 45 L39 39 L34 42
             Z"
          fill="#3f6a3a"
          opacity="0.9"
        />

        {/* світлий блік зліва на кроні */}
        <path
          d="M40 18 L36 40 L42 36 L40 50 L44 30 Z"
          fill="#7aab6a"
          opacity="0.18"
        />
        <path
          d="M38 40 L32 62 L40 56 L38 74 L44 52 Z"
          fill="#7aab6a"
          opacity="0.12"
        />

        {/* верхівка */}
        <path d="M44 4 L48 16 L44 14 L40 16 Z" fill="#4a7a42" />

        {/* зарубки від сокири */}
        {chops >= 2 ? (
          <path
            d="M30 104 L46 100"
            stroke="#1a1008"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.85"
          />
        ) : null}
        {chops >= 5 ? (
          <path
            d="M28 110 L48 106"
            stroke="#1a1008"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.9"
          />
        ) : null}
        {chops >= 8 ? (
          <path
            d="M42 100 L56 106"
            stroke="#1a1008"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
        ) : null}
      </svg>
    </div>
  );
}
