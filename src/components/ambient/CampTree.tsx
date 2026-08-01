"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { playWoodChop } from "@/lib/sfx";

const CHOPS_NEEDED = 10;
const FALL_MS = 480;
const RESPAWN_MS = 3500;

type Phase = "ready" | "chopping" | "falling" | "logs";

interface CampTreeProps {
  /** Колоду кинули у вогонь — Campfire збільшує полум'я й грає toss. */
  onLogToss: () => void;
}

/**
 * Сосна біля вогнища: одразу готова → рубається тапами → колоди → респавн.
 * Локальний ambient-стейт, без armRecalc / meal-ритуалу.
 */
export function CampTree({ onLogToss }: CampTreeProps) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("ready");
  const [chops, setChops] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [logs, setLogs] = useState<number[]>([]);
  const chopsRef = useRef(0);
  const logSeq = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  phaseRef.current = phase;

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

  const leanDeg = chops * 1.2;
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
      className="absolute bottom-[14px] right-0 z-[3] w-[110px] touch-manipulation select-none"
      aria-hidden
    >
      {showTree ? (
        <button
          type="button"
          className={`relative mx-auto block h-[150px] w-[100px] border-0 bg-transparent p-0 ${
            canChop ? "cursor-pointer" : "cursor-default"
          }`}
          style={{
            transformOrigin: "50% 100%",
            ["--lean" as string]: `${leanDeg}deg`,
            // Розтягує хіт-зону під палець; без візуального фону
            WebkitTapHighlightColor: "transparent",
          }}
          disabled={!canChop}
          onPointerDown={(e) => {
            // pointerdown надійніший за click на мобілці; stop щоб не
            // з’їдав GlobalClickFx / інші шари
            e.preventDefault();
            e.stopPropagation();
            onChop();
          }}
        >
          {/* Невидима хіт-площа на весь прямокутник кнопки */}
          <span className="absolute inset-0 z-[2]" />

          <div
            className="pointer-events-none absolute inset-x-2 bottom-2 top-1"
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

          {/* Прогрес завжди видно, коли можна рубати */}
          {canChop ? (
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-1.5 w-14 -translate-x-1/2 overflow-hidden rounded-full bg-black/40">
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
        <div className="relative mx-auto flex h-12 w-[100px] items-end justify-center gap-2 pb-1">
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
              className="relative z-[1] h-7 w-11 cursor-pointer rounded-[8px] border-0 p-0"
              style={{
                background: "linear-gradient(#b5844f,#6b4626)",
                boxShadow: "inset 0 -3px 0 rgba(0,0,0,.28)",
                transform: `rotate(${i === 0 ? -12 : 14}deg)`,
                WebkitTapHighlightColor: "transparent",
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                haptic("click");
                onTossLog(id);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PineVisual({ chops }: { chops: number }) {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute left-1/2 top-[4px] h-0 w-0 -translate-x-1/2"
        style={{
          borderLeft: "20px solid transparent",
          borderRight: "20px solid transparent",
          borderBottom: "32px solid #1a2e1a",
        }}
      />
      <div
        className="absolute left-1/2 top-[28px] h-0 w-0 -translate-x-1/2"
        style={{
          borderLeft: "28px solid transparent",
          borderRight: "28px solid transparent",
          borderBottom: "38px solid #243d24",
        }}
      />
      <div
        className="absolute left-1/2 top-[52px] h-0 w-0 -translate-x-1/2"
        style={{
          borderLeft: "32px solid transparent",
          borderRight: "32px solid transparent",
          borderBottom: "42px solid #2d4a28",
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[40px] w-[14px] -translate-x-1/2 rounded-sm"
        style={{
          background: "linear-gradient(90deg,#5c3a1e,#3d2612 55%,#2a1a0c)",
        }}
      />
      {chops >= 2 ? (
        <div
          className="absolute bottom-[22px] left-[28px] h-[2px] w-[16px] rounded-full bg-[#1a1008]/85"
          style={{ transform: "rotate(-18deg)" }}
        />
      ) : null}
      {chops >= 5 ? (
        <div
          className="absolute bottom-[16px] left-[26px] h-[2.5px] w-[18px] rounded-full bg-[#1a1008]/90"
          style={{ transform: "rotate(-12deg)" }}
        />
      ) : null}
      {chops >= 8 ? (
        <div
          className="absolute bottom-[26px] right-[26px] h-[2px] w-3.5 rounded-full bg-[#1a1008]/75"
          style={{ transform: "rotate(22deg)" }}
        />
      ) : null}
    </div>
  );
}
