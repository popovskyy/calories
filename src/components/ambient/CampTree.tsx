"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { playWoodChop } from "@/lib/sfx";

const CHOPS_NEEDED = 5;
const GROW_MS = 21000;
const FALL_MS = 480;
const RESPAWN_MS = 4000;

type Phase = "growing" | "ready" | "chopping" | "falling" | "logs";

interface CampTreeProps {
  /** Колоду кинули у вогонь — Campfire збільшує полум'я й грає toss. */
  onLogToss: () => void;
}

/**
 * Сосна біля вогнища: росте → рубається тапами → стає колодами → респавн.
 * Локальний ambient-стейт, без armRecalc / meal-ритуалу.
 */
export function CampTree({ onLogToss }: CampTreeProps) {
  const reduce = useReducedMotion();
  const uid = useId();
  const [phase, setPhase] = useState<Phase>(reduce ? "ready" : "growing");
  const [chops, setChops] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [logs, setLogs] = useState<number[]>([]);
  const logSeq = useRef(0);

  // Ріст → ready
  useEffect(() => {
    if (phase !== "growing") return;
    const delay = reduce ? 0 : GROW_MS;
    const t = window.setTimeout(() => setPhase("ready"), delay);
    return () => window.clearTimeout(t);
  }, [phase, reduce]);

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

  // Усі колоди згоріли → пауза → знову росте
  useEffect(() => {
    if (phase !== "logs" || logs.length > 0) return;
    const t = window.setTimeout(() => {
      setChops(0);
      setPhase(reduce ? "ready" : "growing");
    }, RESPAWN_MS);
    return () => window.clearTimeout(t);
  }, [phase, logs.length, reduce]);

  const leanDeg = chops * 2.4;
  const canChop = phase === "ready" || phase === "chopping";

  const onChop = () => {
    if (!canChop) return;
    playWoodChop();
    haptic("click");
    setShakeKey((k) => k + 1);
    const next = chops + 1;
    setChops(next);
    if (phase === "ready") setPhase("chopping");
    if (next >= CHOPS_NEEDED) setPhase("falling");
  };

  const onTossLog = (id: number) => {
    setLogs((prev) => prev.filter((x) => x !== id));
    onLogToss();
  };

  const showTree =
    phase === "growing" ||
    phase === "ready" ||
    phase === "chopping" ||
    phase === "falling";

  return (
    <div
      className="absolute bottom-[22px] right-1 z-[1] w-[72px] touch-manipulation"
      aria-hidden
    >
      {showTree ? (
        <button
          type="button"
          className={`relative mx-auto block h-[118px] w-[64px] border-0 bg-transparent p-0 ${
            canChop ? "cursor-pointer" : "cursor-default"
          }`}
          style={{
            transformOrigin: "50% 100%",
            ["--lean" as string]: `${leanDeg}deg`,
          }}
          disabled={!canChop}
          onPointerDown={(e) => {
            e.preventDefault();
            onChop();
          }}
        >
          <div
            key={phase === "growing" ? `${uid}-grow` : "grown"}
            className={
              phase === "growing"
                ? "camp-tree-grow absolute inset-0"
                : "absolute inset-0"
            }
            style={
              phase === "growing" && !reduce
                ? {
                    transformOrigin: "50% 100%",
                    animation: `treeGrow ${GROW_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                  }
                : phase === "falling" && !reduce
                  ? {
                      transformOrigin: "50% 100%",
                      animation: `treeFall ${FALL_MS}ms cubic-bezier(0.4, 0, 1, 1) forwards`,
                    }
                  : {
                      transformOrigin: "50% 100%",
                      transform:
                        phase === "chopping" || phase === "ready"
                          ? `rotate(${leanDeg}deg)`
                          : undefined,
                    }
            }
          >
            <div
              key={shakeKey}
              className={
                phase === "chopping" && shakeKey > 0 && !reduce
                  ? "camp-tree-shake absolute inset-0"
                  : "absolute inset-0"
              }
              style={
                phase === "chopping" && shakeKey > 0 && !reduce
                  ? { animation: "treeChopShake 0.22s ease-out" }
                  : undefined
              }
            >
              <PineVisual chops={chops} />
            </div>
          </div>

          {phase === "chopping" ? (
            <div className="pointer-events-none absolute -bottom-1 left-1/2 h-1 w-10 -translate-x-1/2 overflow-hidden rounded-full bg-black/35">
              <div
                className="h-full rounded-full bg-[#c4a574]"
                style={{
                  width: `${(chops / CHOPS_NEEDED) * 100}%`,
                  transition: reduce ? undefined : "width 120ms ease-out",
                }}
              />
            </div>
          ) : null}
        </button>
      ) : null}

      {phase === "logs" ? (
        <div className="relative mx-auto mt-1 flex h-8 w-[68px] items-end justify-center gap-1.5">
          {/* пень */}
          <div
            className="pointer-events-none absolute bottom-0 left-1/2 h-3 w-3.5 -translate-x-1/2 rounded-sm"
            style={{
              background: "linear-gradient(#6b4626,#3d2814)",
              boxShadow: "inset 0 1px 0 #a97a4c",
            }}
          />
          {logs.map((id, i) => (
            <button
              key={id}
              type="button"
              className="relative z-[1] h-[14px] w-[30px] cursor-pointer rounded-[7px] border-0 p-0"
              style={{
                background: "linear-gradient(#b5844f,#6b4626)",
                boxShadow: "inset 0 -3px 0 rgba(0,0,0,.28)",
                transform: `rotate(${i === 0 ? -12 : 14}deg)`,
              }}
              onPointerDown={(e) => {
                e.preventDefault();
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
      {/* крона — 3 яруси */}
      <div
        className="absolute left-1/2 top-[6px] h-0 w-0 -translate-x-1/2"
        style={{
          borderLeft: "18px solid transparent",
          borderRight: "18px solid transparent",
          borderBottom: "28px solid #1a2e1a",
        }}
      />
      <div
        className="absolute left-1/2 top-[26px] h-0 w-0 -translate-x-1/2"
        style={{
          borderLeft: "24px solid transparent",
          borderRight: "24px solid transparent",
          borderBottom: "34px solid #243d24",
        }}
      />
      <div
        className="absolute left-1/2 top-[48px] h-0 w-0 -translate-x-1/2"
        style={{
          borderLeft: "28px solid transparent",
          borderRight: "28px solid transparent",
          borderBottom: "38px solid #2d4a28",
        }}
      />
      {/* стовбур */}
      <div
        className="absolute bottom-0 left-1/2 h-[34px] w-[11px] -translate-x-1/2 rounded-sm"
        style={{
          background: "linear-gradient(90deg,#5c3a1e,#3d2612 55%,#2a1a0c)",
        }}
      />
      {/* зарубки */}
      {chops >= 1 ? (
        <div
          className="absolute bottom-[18px] left-[18px] h-[2px] w-[14px] rounded-full bg-[#1a1008]/80"
          style={{ transform: "rotate(-18deg)" }}
        />
      ) : null}
      {chops >= 3 ? (
        <div
          className="absolute bottom-[12px] left-[16px] h-[2px] w-[16px] rounded-full bg-[#1a1008]/90"
          style={{ transform: "rotate(-12deg)" }}
        />
      ) : null}
      {chops >= 4 ? (
        <div
          className="absolute bottom-[22px] right-[16px] h-[2px] w-3 rounded-full bg-[#1a1008]/70"
          style={{ transform: "rotate(22deg)" }}
        />
      ) : null}
    </div>
  );
}
