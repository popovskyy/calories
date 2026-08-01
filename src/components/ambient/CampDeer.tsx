"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import { Deer, type DeerGait } from "@/components/ambient/Deer";
import { playDeerStartle } from "@/lib/sfx";

const EASE_SOFT = [0.22, 1, 0.36, 1] as const;
const EASE_LEAVE = [0.45, 0.05, 0.55, 0.95] as const;

/** Зони (px відносно left-10). Ліс з обох боків вогнища. */
const L_FOREST: [number, number] = [-30, 48];
const L_PATH: [number, number] = [50, 100];
const L_CLEAR: [number, number] = [95, 128];
const R_CLEAR: [number, number] = [175, 215];
const R_PATH: [number, number] = [205, 255];
const R_FOREST: [number, number] = [250, 315];
const FIRE_CENTER = 152;

const SCALE_FOREST = [0.7, 0.84] as const;
const SCALE_PATH = [0.9, 1.02] as const;
const SCALE_FIRE = [1.1, 1.22] as const;

type Side = "left" | "right";

type AfterPatrol =
  | "watch"
  | "graze"
  | "approach"
  | "retreat"
  | "sniff"
  | "lookAround"
  | "morePatrol"
  | "crossBehind";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickWeighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1]![0];
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function walkDuration(from: number, to: number, secPerPx = 0.038) {
  return clamp(Math.abs(to - from) * secPerPx, 1.4, 6.2);
}

function forestBand(side: Side): [number, number] {
  return side === "left" ? L_FOREST : R_FOREST;
}

function pathBand(side: Side): [number, number] {
  return side === "left" ? L_PATH : R_PATH;
}

function clearBand(side: Side): [number, number] {
  return side === "left" ? L_CLEAR : R_CLEAR;
}

function scaleForX(px: number) {
  const inLeftForest = px <= L_FOREST[1];
  const inRightForest = px >= R_FOREST[0];
  if (inLeftForest || inRightForest) return rand(SCALE_FOREST[0], SCALE_FOREST[1]);
  const nearFire =
    (px >= L_CLEAR[0] && px <= L_CLEAR[1]) || (px >= R_CLEAR[0] && px <= R_CLEAR[1]);
  if (nearFire) return rand(SCALE_FIRE[0], SCALE_FIRE[1]);
  return rand(SCALE_PATH[0], SCALE_PATH[1]);
}

function sideFromX(px: number): Side {
  return px < FIRE_CENTER ? "left" : "right";
}

/**
 * Олень-NPC: живе в лісі, приймає рішення бітами (огляд / нюх / підхід /
 * відступ), а не «край → вогонь → край». При згаслому вогні (+300 ккал) —
 * хаос: бігає й росте.
 */
export function CampDeer({
  ritualActive,
  calorieChaos = false,
}: {
  ritualActive: boolean;
  /** Вогонь згас від перебору — олень у паніці. */
  calorieChaos?: boolean;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(rand(L_FOREST[0], L_FOREST[1]));
  const scale = useMotionValue(rand(SCALE_FOREST[0], SCALE_FOREST[1]));
  const scaleX = useMotionValue(1);
  const opacity = useMotionValue(0);
  const [gait, setGait] = useState<DeerGait>("idle");
  const [curious, setCurious] = useState(false);
  const [scared, setScared] = useState(false);
  const [startled, setStartled] = useState(false);
  const postFleeForest = useRef(false);
  const homeSide = useRef<Side>("left");
  const ctrls = useRef<AnimationPlaybackControls[]>([]);
  const gen = useRef(0);

  const fleeing = ritualActive || startled;

  const stopCtrls = () => {
    for (const c of ctrls.current) c.stop();
    ctrls.current = [];
  };

  const track = (c: AnimationPlaybackControls) => {
    ctrls.current.push(c);
    return c;
  };

  // Хаос при згаслому вогні: біг туди-сюди + ріст
  useEffect(() => {
    if (reduce || !calorieChaos || fleeing) return;

    const my = ++gen.current;
    let cancelled = false;
    const alive = () => !cancelled && gen.current === my;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms);
        ctrls.current.push({ stop: () => window.clearTimeout(t) } as AnimationPlaybackControls);
      });

    const run = async () => {
      setScared(true);
      setCurious(false);
      opacity.set(1);
      let grow = 1.2;
      while (alive()) {
        grow = Math.min(1.65, grow + rand(0.04, 0.1));
        const dest =
          Math.random() < 0.5
            ? rand(L_FOREST[0], L_CLEAR[1])
            : rand(R_CLEAR[0], R_FOREST[1]);
        scaleX.set(dest >= x.get() ? 1 : -1);
        setGait("run");
        track(animate(scale, grow, { duration: 0.6, ease: [...EASE_SOFT] }));
        await track(
          animate(x, dest, {
            duration: rand(0.55, 0.95),
            ease: [0.2, 0.8, 0.2, 1],
          }),
        );
        if (!alive()) break;
        if (Math.random() < 0.35) {
          setGait("idle");
          await sleep(rand(180, 420));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopCtrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calorieChaos, fleeing, reduce]);

  // Звичайний NPC-патруль
  useEffect(() => {
    if (reduce) return;
    if (fleeing || calorieChaos) return;

    const my = ++gen.current;
    let cancelled = false;
    const alive = () => !cancelled && gen.current === my;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms);
        ctrls.current.push({ stop: () => window.clearTimeout(t) } as AnimationPlaybackControls);
      });

    const faceToward = (target: number) => {
      scaleX.set(target >= x.get() ? 1 : -1);
    };

    const moveTo = async (
      targetX: number,
      opts?: {
        duration?: number;
        ease?: readonly [number, number, number, number];
        targetScale?: number;
        targetOpacity?: number;
        gait?: DeerGait;
      },
    ) => {
      const from = x.get();
      const dur = opts?.duration ?? walkDuration(from, targetX);
      const ease = opts?.ease ?? EASE_SOFT;
      faceToward(targetX);
      setCurious(false);
      setGait(opts?.gait ?? "walk");
      if (opts?.targetScale != null) {
        track(
          animate(scale, opts.targetScale, { duration: dur * 0.9, ease: [...ease] }),
        );
      }
      if (opts?.targetOpacity != null) {
        track(
          animate(opacity, opts.targetOpacity, {
            duration: Math.min(dur, 0.85),
            ease: [...EASE_SOFT],
          }),
        );
      }
      await track(animate(x, targetX, { duration: dur, ease: [...ease] }));
    };

    const idlePose = async (ms: number, makeCurious = false) => {
      setGait("idle");
      setCurious(makeCurious);
      await sleep(ms);
      setCurious(false);
    };

    const inForest = async (longStay = false, side: Side = homeSide.current) => {
      setScared(false);
      homeSide.current = side;
      const [fLo, fHi] = forestBand(side);
      const spot = rand(fLo + 4, fHi - 2);
      const s = rand(SCALE_FOREST[0], SCALE_FOREST[1]);
      const cur = x.get();
      const alreadyThere =
        (side === "left" && cur <= L_FOREST[1] + 12) ||
        (side === "right" && cur >= R_FOREST[0] - 12);

      if (!alreadyThere) {
        await moveTo(spot, {
          targetScale: s,
          targetOpacity: rand(0.58, 0.78),
          ease: EASE_LEAVE,
        });
      } else {
        x.set(spot);
        scale.set(s);
        if (opacity.get() < 0.35) {
          track(
            animate(opacity, rand(0.58, 0.78), { duration: 0.5, ease: [...EASE_SOFT] }),
          );
        }
      }
      if (!alive()) return;

      const stay = longStay ? rand(5000, 12000) : rand(2400, 8000);
      const end = performance.now() + stay;
      while (alive() && performance.now() < end) {
        if (Math.random() < 0.4) {
          scaleX.set(Math.random() < 0.55 ? 1 : -1);
          await idlePose(rand(1100, 2800), Math.random() < 0.45);
        } else {
          await idlePose(rand(800, 2000), Math.random() < 0.2);
        }
        if (!alive()) return;
        if (Math.random() < 0.5) {
          const nudge = clamp(
            x.get() + rand(8, 18) * (Math.random() < 0.5 ? -1 : 1),
            fLo,
            fHi,
          );
          await moveTo(nudge, {
            duration: rand(0.85, 1.5),
            targetScale: rand(SCALE_FOREST[0], SCALE_FOREST[1]),
            targetOpacity: rand(0.58, 0.8),
          });
        }
      }
    };

    const emerge = async (side: Side = homeSide.current) => {
      const [pLo, pHi] = pathBand(side);
      const [fLo, fHi] = forestBand(side);
      const towardFire = side === "left" ? 1 : -1;

      if (Math.random() < 0.35) {
        scaleX.set(towardFire);
        const edge = side === "left" ? rand(pLo - 2, pLo + 12) : rand(pHi - 12, pHi + 2);
        await moveTo(edge, {
          duration: rand(1.2, 2.0),
          targetScale: rand(0.86, 0.96),
          targetOpacity: 0.9,
        });
        if (!alive()) return;
        await idlePose(rand(700, 1600), true);
        if (!alive()) return;
        if (Math.random() < 0.4) {
          scaleX.set(-towardFire);
          await moveTo(rand(fLo + 4, fHi), {
            duration: rand(1.0, 1.6),
            targetScale: rand(SCALE_FOREST[0], SCALE_FOREST[1]),
            targetOpacity: rand(0.55, 0.72),
            ease: EASE_LEAVE,
          });
          if (!alive()) return;
          await sleep(rand(800, 2200));
          if (!alive()) return;
        }
      }

      scaleX.set(towardFire);
      const pathX = rand(pLo + 4, pHi - 2);
      await moveTo(pathX, {
        duration: rand(2.2, 4.0),
        targetScale: rand(SCALE_PATH[0], SCALE_PATH[1]),
        targetOpacity: 0.96,
      });
      if (!alive()) return;
      await idlePose(rand(700, 1800), Math.random() < 0.6);
    };

    const patrol = async (side: Side = homeSide.current) => {
      const [pLo, pHi] = pathBand(side);
      const [cLo, cHi] = clearBand(side);
      const steps = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < steps; i++) {
        if (!alive()) return;
        const preferPath = Math.random() < 0.55;
        const lo = preferPath ? pLo : cLo;
        const hi = preferPath ? pHi : cHi;
        const target = clamp(
          x.get() + rand(14, 36) * (Math.random() < 0.55 ? 1 : -1),
          lo,
          hi,
        );
        await moveTo(target, {
          duration: rand(0.85, 1.8),
          targetScale: scaleForX(target),
          targetOpacity: 0.96,
        });
        if (!alive()) return;
        if (Math.random() < 0.55) {
          await idlePose(rand(600, 2000), Math.random() < 0.4);
        }
      }
    };

    /** Швидко пробігти «за» вогнем на інший бік (малий scale / нижча opacity). */
    const crossBehind = async () => {
      const from = homeSide.current;
      const to: Side = from === "left" ? "right" : "left";
      const mid = FIRE_CENTER + (from === "left" ? 10 : -10);
      await moveTo(mid, {
        duration: rand(1.1, 1.8),
        targetScale: 0.72,
        targetOpacity: 0.45,
        gait: "walk",
      });
      if (!alive()) return;
      homeSide.current = to;
      const [pLo, pHi] = pathBand(to);
      await moveTo(rand(pLo, pHi), {
        duration: rand(1.2, 2.0),
        targetScale: rand(SCALE_PATH[0], SCALE_PATH[1]),
        targetOpacity: 0.95,
      });
    };

    const watch = async () => {
      setGait("idle");
      if (Math.random() < 0.65) scaleX.set(x.get() < FIRE_CENTER ? 1 : -1);
      else {
        scaleX.set(scaleX.get() >= 0 ? -1 : 1);
        await sleep(rand(250, 500));
      }
      if (!alive()) return;
      setCurious(true);
      await sleep(rand(1800, 5200));
      setCurious(false);
    };

    const lookAround = async () => {
      setGait("idle");
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        if (!alive()) return;
        scaleX.set(scaleX.get() >= 0 ? -1 : 1);
        setCurious(Math.random() < 0.5);
        await sleep(rand(700, 1400));
      }
      setCurious(false);
    };

    const sniff = async () => {
      const side = homeSide.current;
      const [pLo, pHi] = pathBand(side);
      const [cLo, cHi] = clearBand(side);
      const cur = x.get();
      const target = clamp(
        cur + rand(4, 10) * (Math.random() < 0.5 ? -1 : 1),
        Math.min(pLo, cLo),
        Math.max(pHi, cHi),
      );
      await moveTo(target, {
        duration: rand(0.45, 0.75),
        targetScale: scaleForX(target) * 0.96,
      });
      if (!alive()) return;
      await idlePose(rand(1400, 2800), true);
    };

    const graze = async () => {
      const side = homeSide.current;
      const [pLo, pHi] = pathBand(side);
      const [cLo, cHi] = clearBand(side);
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        if (!alive()) return;
        const cur = x.get();
        const target = clamp(
          cur + rand(5, 12) * (Math.random() < 0.5 ? -1 : 1),
          Math.min(pLo, cLo),
          Math.max(pHi, cHi),
        );
        await moveTo(target, {
          duration: rand(0.45, 0.8),
          targetScale: scaleForX(target) * 0.97,
        });
        if (!alive()) return;
        await idlePose(rand(800, 1600), false);
      }
    };

    const approach = async () => {
      const side = homeSide.current;
      const [cLo, cHi] = clearBand(side);
      const closer = rand(cLo, cHi);
      scaleX.set(side === "left" ? 1 : -1);
      await moveTo(closer, {
        duration: rand(1.2, 2.4),
        targetScale: rand(SCALE_FIRE[0], SCALE_FIRE[1]),
        targetOpacity: 1,
      });
      if (!alive()) return;
      setGait("idle");
      setCurious(true);
      await sleep(rand(1000, 2200));
      setCurious(false);

      if (Math.random() < 0.55) {
        await sleep(rand(400, 900));
        if (!alive()) return;
        const [pLo, pHi] = pathBand(side);
        const back =
          side === "left"
            ? clamp(closer - rand(14, 26), pLo, cHi)
            : clamp(closer + rand(14, 26), cLo, pHi);
        scaleX.set(side === "left" ? -1 : 1);
        await moveTo(back, {
          duration: rand(0.55, 1.0),
          targetScale: scaleForX(back),
        });
        if (!alive()) return;
        await idlePose(rand(600, 1400), true);
      }
    };

    const retreatForest = async (side?: Side) => {
      const to = side ?? (Math.random() < 0.35 ? (homeSide.current === "left" ? "right" : "left") : homeSide.current);
      homeSide.current = to;
      const [fLo, fHi] = forestBand(to);
      setCurious(false);
      setGait("idle");
      await sleep(rand(200, 600));
      if (!alive()) return;
      scaleX.set(to === "left" ? -1 : 1);
      await idlePose(rand(400, 1000), true);
      if (!alive()) return;
      const spot = rand(fLo + 2, fHi - 2);
      await moveTo(spot, {
        duration: walkDuration(x.get(), spot, 0.042),
        targetScale: rand(SCALE_FOREST[0], SCALE_FOREST[1]),
        targetOpacity: rand(0.55, 0.74),
        ease: EASE_LEAVE,
      });
      setGait("idle");
    };

    const peekOnly = async (side: Side = homeSide.current) => {
      const [pLo, pHi] = pathBand(side);
      const [fLo, fHi] = forestBand(side);
      const toward = side === "left" ? 1 : -1;
      scaleX.set(toward);
      await moveTo(side === "left" ? rand(pLo - 4, pLo + 14) : rand(pHi - 14, pHi + 4), {
        duration: rand(1.2, 2.0),
        targetScale: rand(0.84, 0.96),
        targetOpacity: 0.9,
      });
      if (!alive()) return;
      await lookAround();
      if (!alive()) return;
      scaleX.set(-toward);
      await moveTo(rand(fLo + 4, fHi), {
        duration: rand(1.1, 1.9),
        targetScale: rand(SCALE_FOREST[0], SCALE_FOREST[1]),
        targetOpacity: rand(0.55, 0.72),
        ease: EASE_LEAVE,
      });
    };

    const run = async () => {
      setScared(false);
      setCurious(false);
      homeSide.current = Math.random() < 0.5 ? "left" : "right";

      if (opacity.get() < 0.3) {
        const [fLo, fHi] = forestBand(homeSide.current);
        x.set(rand(fLo + 6, fHi - 4));
        scale.set(rand(SCALE_FOREST[0], SCALE_FOREST[1]));
        scaleX.set(homeSide.current === "left" ? 1 : -1);
        opacity.set(0);
        track(
          animate(opacity, rand(0.58, 0.76), { duration: 0.6, ease: [...EASE_SOFT] }),
        );
      }

      while (alive()) {
        const longForest = postFleeForest.current;
        postFleeForest.current = false;

        // Інколи змінює «дім» ще в лісі
        if (Math.random() < 0.2) {
          homeSide.current = homeSide.current === "left" ? "right" : "left";
        }

        await inForest(longForest, homeSide.current);
        if (!alive()) break;

        const forestChoice = pickWeighted({
          peek: 20,
          emerge: 55,
          stay: 15,
          switchSide: 10,
        } as const);
        if (forestChoice === "stay") continue;
        if (forestChoice === "switchSide") {
          await retreatForest(homeSide.current === "left" ? "right" : "left");
          continue;
        }
        if (forestChoice === "peek") {
          await peekOnly(homeSide.current);
          continue;
        }

        await emerge(homeSide.current);
        if (!alive()) break;

        let thoughts = 0;
        const maxThoughts = 3 + Math.floor(Math.random() * 4);
        while (alive() && thoughts < maxThoughts) {
          thoughts += 1;
          await patrol(homeSide.current);
          if (!alive()) break;

          const bit: AfterPatrol = pickWeighted({
            watch: 18,
            graze: 12,
            approach: 18,
            retreat: 14,
            sniff: 10,
            lookAround: 10,
            morePatrol: 6,
            crossBehind: 12,
          });

          if (bit === "morePatrol") continue;
          if (bit === "watch") {
            await watch();
            continue;
          }
          if (bit === "lookAround") {
            await lookAround();
            continue;
          }
          if (bit === "sniff") {
            await sniff();
            continue;
          }
          if (bit === "graze") {
            await graze();
            continue;
          }
          if (bit === "crossBehind") {
            await crossBehind();
            continue;
          }
          if (bit === "approach") {
            await approach();
            if (Math.random() < 0.45) {
              await retreatForest();
              break;
            }
            continue;
          }
          await retreatForest();
          break;
        }

        if (!alive()) break;
        const [fLo, fHi] = forestBand(homeSide.current);
        if (x.get() < fLo - 5 || x.get() > fHi + 5) {
          // не в своєму лісі — повертаємось
          if (x.get() > L_FOREST[1] && x.get() < R_FOREST[0]) {
            await retreatForest();
          }
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopCtrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleeing, calorieChaos, reduce]);

  // Втеча від ритуалу / тапу
  useEffect(() => {
    if (!fleeing || reduce) return;

    const my = ++gen.current;
    stopCtrls();

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

    const flee = async () => {
      setGait("idle");
      setCurious(false);
      setScared(true);
      await sleep(startled ? 0 : 480);
      if (gen.current !== my) return;

      const cur = x.get();
      const facing = scaleX.get();
      track(
        animate(x, cur + (facing > 0 ? -10 : 10), {
          duration: 0.14,
          ease: [...EASE_SOFT],
        }),
      );
      await sleep(160);
      if (gen.current !== my) return;

      scaleX.set(sideFromX(cur) === "left" ? -1 : 1);
      setGait("run");
      const fleeSide: Side = Math.random() < 0.55 ? sideFromX(cur) : homeSide.current;
      homeSide.current = fleeSide;
      const [fLo, fHi] = forestBand(fleeSide);
      const forestX = rand(fLo, fHi);
      track(
        animate(x, forestX, {
          duration: 0.95,
          ease: [0.2, 0.8, 0.2, 1],
        }),
      );
      track(
        animate(scale, rand(SCALE_FOREST[0], SCALE_FOREST[1]), {
          duration: 0.85,
          ease: [0.2, 0.8, 0.2, 1],
        }),
      );
      track(
        animate(opacity, calorieChaos ? 0.7 : 0.4, {
          duration: 0.7,
          delay: 0.22,
          ease: [0.4, 0, 1, 1],
        }),
      );

      postFleeForest.current = true;

      if (startled) {
        await sleep(1400);
        if (gen.current === my) setStartled(false);
      }
    };

    void flee();
    return () => {
      /* gen bump cancels */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleeing, reduce]);

  if (reduce) return null;

  return (
    <motion.div
      className="ambient-mob absolute bottom-[26px] left-10 z-[1] cursor-pointer touch-manipulation"
      style={{ x, scale, opacity }}
      aria-hidden
      onPointerDown={() => {
        if (!fleeing) {
          setStartled(true);
          playDeerStartle();
        }
      }}
    >
      <motion.div style={{ scaleX }}>
        <Deer
          variant="camp"
          width={58}
          height={82}
          scared={scared || calorieChaos}
          gait={gait}
          curious={curious}
        />
      </motion.div>
    </motion.div>
  );
}
