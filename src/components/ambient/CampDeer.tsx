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
import { EASE_OUT } from "@/lib/motion";
import { playDeerStartle } from "@/lib/sfx";

const EASE_SOFT = [0.22, 1, 0.36, 1] as const;
const EASE_LEAVE = [0.45, 0.05, 0.55, 0.95] as const;

/** Зони (px відносно left-10). */
const FOREST_MIN = -40;
const FOREST_MAX = 35;
const PATH_MIN = 40;
const PATH_MAX = 85;
const CLEARING_MIN = 85;
const CLEARING_MAX = 135;
const FIRE_CENTER = 112;

const SCALE_FOREST = [0.72, 0.82] as const;
const SCALE_PATH = [0.88, 1.0] as const;
const SCALE_FIRE = [1.08, 1.18] as const;

type PatrolBit = "watch" | "graze" | "approach" | "retreat" | "patrol";

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
  return clamp(Math.abs(to - from) * secPerPx, 1.6, 5.0);
}

function scaleForX(px: number) {
  if (px <= FOREST_MAX) return rand(SCALE_FOREST[0], SCALE_FOREST[1]);
  if (px < CLEARING_MIN) {
    const t = (px - PATH_MIN) / (CLEARING_MIN - PATH_MIN);
    return SCALE_PATH[0] + clamp(t, 0, 1) * (SCALE_PATH[1] - SCALE_PATH[0]);
  }
  return rand(SCALE_FIRE[0], SCALE_FIRE[1]);
}

/**
 * Олень-NPC біля вогнища: живе в лісі зліва, виходить з-під ялинок,
 * патрулює / дивиться / пасеться / підходить ближче (scale↑), іде назад у ліс.
 * Interruptible flee від дровини або тапу — з будь-якого стану.
 */
export function CampDeer({ ritualActive }: { ritualActive: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(rand(FOREST_MIN, FOREST_MAX));
  const scale = useMotionValue(rand(SCALE_FOREST[0], SCALE_FOREST[1]));
  const scaleX = useMotionValue(1);
  const opacity = useMotionValue(0);
  const [gait, setGait] = useState<DeerGait>("idle");
  const [curious, setCurious] = useState(false);
  const [scared, setScared] = useState(false);
  const [startled, setStartled] = useState(false);
  /** Після втечі — довше сидить у лісі. */
  const postFleeForest = useRef(false);
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

  // Патруль NPC, поки немає flee
  useEffect(() => {
    if (reduce) return;
    if (fleeing) return;

    const my = ++gen.current;
    let cancelled = false;
    const alive = () => !cancelled && gen.current === my;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms);
        ctrls.current.push({
          stop: () => window.clearTimeout(t),
        } as AnimationPlaybackControls);
      });

    const faceToward = (target: number) => {
      const cur = x.get();
      scaleX.set(target >= cur ? 1 : -1);
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
          animate(scale, opts.targetScale, {
            duration: dur * 0.9,
            ease: [...ease],
          }),
        );
      }
      if (opts?.targetOpacity != null) {
        track(
          animate(opacity, opts.targetOpacity, {
            duration: Math.min(dur, 0.8),
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

    /** Стоїть/дихає серед ялинок; інколи мікро-зсув. */
    const inForest = async (longStay = false) => {
      setScared(false);
      const spot = rand(FOREST_MIN + 4, FOREST_MAX - 2);
      const s = rand(SCALE_FOREST[0], SCALE_FOREST[1]);
      // Якщо вже в лісі — тихий дрейф; інакше підійти
      if (x.get() > FOREST_MAX + 8) {
        await moveTo(spot, {
          targetScale: s,
          targetOpacity: rand(0.55, 0.75),
          ease: EASE_LEAVE,
        });
      } else {
        x.set(spot);
        scale.set(s);
        if (opacity.get() < 0.4) opacity.set(rand(0.55, 0.72));
        else {
          track(
            animate(opacity, rand(0.55, 0.75), {
              duration: 0.5,
              ease: [...EASE_SOFT],
            }),
          );
        }
      }
      if (!alive()) return;

      const stay = longStay ? rand(5000, 11000) : rand(2000, 7000);
      const end = performance.now() + stay;
      while (alive() && performance.now() < end) {
        await idlePose(rand(900, 2200), Math.random() < 0.25);
        if (!alive()) return;
        // мікро-зсув у лісі
        if (Math.random() < 0.45) {
          const nudge = clamp(
            x.get() + rand(6, 14) * (Math.random() < 0.5 ? -1 : 1),
            FOREST_MIN,
            FOREST_MAX,
          );
          await moveTo(nudge, {
            duration: rand(0.7, 1.2),
            targetScale: rand(SCALE_FOREST[0], SCALE_FOREST[1]),
            targetOpacity: rand(0.55, 0.78),
          });
        }
        if (!alive()) return;
      }
    };

    /** Повільно виходить на стежку. */
    const emerge = async () => {
      scaleX.set(1);
      const pathX = rand(PATH_MIN + 6, PATH_MAX - 4);
      await moveTo(pathX, {
        duration: rand(2.0, 3.5),
        targetScale: rand(SCALE_PATH[0], SCALE_PATH[1]),
        targetOpacity: 0.95,
        ease: EASE_SOFT,
      });
      if (!alive()) return;
      await idlePose(rand(600, 1400), Math.random() < 0.5);
    };

    /** 1–3 кроки PATH / CLEARING. */
    const patrol = async () => {
      const steps = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < steps; i++) {
        if (!alive()) return;
        const cur = x.get();
        const bandLo = Math.random() < 0.55 ? PATH_MIN : CLEARING_MIN;
        const bandHi = bandLo === PATH_MIN ? PATH_MAX : CLEARING_MAX;
        const target = clamp(cur + rand(14, 28) * (Math.random() < 0.55 ? 1 : -1), bandLo, bandHi);
        await moveTo(target, {
          duration: rand(0.7, 1.35),
          targetScale: scaleForX(target),
          targetOpacity: 0.95,
        });
        if (!alive()) return;
        await idlePose(rand(500, 1400), Math.random() < 0.35);
      }
    };

    /** Дивиться на вогонь або «в кадр» без ходьби. */
    const watch = async () => {
      setGait("idle");
      // Обличчям до вогню або розворот «дивиться на глядача»
      if (Math.random() < 0.55) {
        scaleX.set(x.get() < FIRE_CENTER ? 1 : -1);
      } else {
        scaleX.set(scaleX.get() >= 0 ? -1 : 1);
        await sleep(rand(200, 450));
        if (!alive()) return;
      }
      setCurious(true);
      await sleep(rand(1500, 4000));
      if (!alive()) return;
      setCurious(false);
    };

    /** Короткі кроки «пасіння». */
    const graze = async () => {
      const n = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < n; i++) {
        if (!alive()) return;
        const cur = x.get();
        const target = clamp(
          cur + rand(5, 11) * (Math.random() < 0.5 ? -1 : 1),
          PATH_MIN,
          Math.min(CLEARING_MAX - 10, cur + 20),
        );
        await moveTo(target, {
          duration: rand(0.4, 0.7),
          targetScale: scaleForX(target) * 0.97,
          targetOpacity: 0.95,
        });
        if (!alive()) return;
        await idlePose(rand(700, 1400), false);
      }
    };

    /** Ближче до жару + більший scale. */
    const approach = async () => {
      const closer = clamp(
        FIRE_CENTER + rand(-10, 14),
        CLEARING_MIN,
        CLEARING_MAX,
      );
      scaleX.set(1);
      await moveTo(closer, {
        duration: rand(1.0, 2.0),
        targetScale: rand(SCALE_FIRE[0], SCALE_FIRE[1]),
        targetOpacity: 1,
      });
      if (!alive()) return;
      setGait("idle");
      setCurious(true);
      await sleep(rand(800, 1600));
      setCurious(false);
    };

    /** Біля вогню: насторожено, інколи крок назад або сам тікає в ліс. */
    const wary = async (): Promise<"retreat" | "patrol"> => {
      setGait("idle");
      setCurious(true);
      await sleep(rand(700, 1600));
      if (!alive()) return "patrol";

      if (Math.random() < 0.22) {
        setCurious(false);
        return "retreat";
      }

      // Крок назад від жару
      const cur = x.get();
      const back = clamp(cur - rand(12, 22), PATH_MIN, CLEARING_MAX);
      scaleX.set(-1);
      await moveTo(back, {
        duration: rand(0.55, 0.95),
        targetScale: scaleForX(back),
      });
      if (!alive()) return "patrol";
      setGait("idle");
      setCurious(false);
      await sleep(rand(500, 1200));
      return Math.random() < 0.35 ? "retreat" : "patrol";
    };

    /** Walk назад у ліс (не run). */
    const retreatForest = async () => {
      setCurious(false);
      setGait("idle");
      await sleep(rand(120, 350));
      if (!alive()) return;
      scaleX.set(-1);
      await sleep(rand(400, 1100));
      if (!alive()) return;
      const spot = rand(FOREST_MIN + 2, FOREST_MAX - 4);
      await moveTo(spot, {
        duration: walkDuration(x.get(), spot, 0.042),
        targetScale: rand(SCALE_FOREST[0], SCALE_FOREST[1]),
        targetOpacity: rand(0.55, 0.72),
        ease: EASE_LEAVE,
      });
      if (!alive()) return;
      setGait("idle");
    };

    /** З лісу — півкроку в кадр і назад. */
    const peek = async () => {
      scaleX.set(1);
      const edge = rand(PATH_MIN - 4, PATH_MIN + 12);
      await moveTo(edge, {
        duration: rand(1.1, 1.8),
        targetScale: rand(0.84, 0.95),
        targetOpacity: 0.88,
      });
      if (!alive()) return;
      await idlePose(rand(800, 1800), true);
      if (!alive()) return;
      scaleX.set(-1);
      const back = rand(FOREST_MIN + 4, FOREST_MAX - 2);
      await moveTo(back, {
        duration: rand(1.0, 1.7),
        targetScale: rand(SCALE_FOREST[0], SCALE_FOREST[1]),
        targetOpacity: rand(0.55, 0.7),
        ease: EASE_LEAVE,
      });
    };

    const run = async () => {
      setScared(false);
      setCurious(false);

      // Старт: уже в лісі, не з дірки екрана
      if (opacity.get() < 0.3) {
        x.set(rand(FOREST_MIN + 6, FOREST_MAX - 4));
        scale.set(rand(SCALE_FOREST[0], SCALE_FOREST[1]));
        scaleX.set(1);
        opacity.set(0);
        track(
          animate(opacity, rand(0.55, 0.72), {
            duration: 0.55,
            ease: [...EASE_SOFT],
          }),
        );
      }

      while (alive()) {
        const longForest = postFleeForest.current;
        postFleeForest.current = false;
        await inForest(longForest);
        if (!alive()) break;

        // ~15%: лише виглянув і сховався
        if (Math.random() < 0.15) {
          await peek();
          if (!alive()) break;
          continue;
        }

        await emerge();
        if (!alive()) break;

        // Цикл біля галявини: кілька бітів, потім часто назад у ліс
        let loops = 0;
        while (alive() && loops < 5) {
          loops += 1;
          await patrol();
          if (!alive()) break;

          const bit: PatrolBit = pickWeighted({
            watch: 25,
            graze: 15,
            approach: 25,
            retreat: 20,
            patrol: 15,
          });

          if (bit === "patrol") {
            continue;
          }
          if (bit === "watch") {
            await watch();
            if (!alive()) break;
            continue;
          }
          if (bit === "graze") {
            await graze();
            if (!alive()) break;
            continue;
          }
          if (bit === "approach") {
            await approach();
            if (!alive()) break;
            const next = await wary();
            if (!alive()) break;
            if (next === "retreat") {
              await retreatForest();
              break;
            }
            continue;
          }
          // retreat
          await retreatForest();
          break;
        }

        if (!alive()) break;
        // Якщо вийшли з циклу без retreat — все одно йдемо в ліс
        if (x.get() > FOREST_MAX) {
          await retreatForest();
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopCtrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- motion values stable
  }, [fleeing, reduce]);

  // Втеча: alert → run у ліс з поточної позиції
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

      scaleX.set(-1);
      setGait("run");
      const forestX = rand(FOREST_MIN - 8, FOREST_MIN + 6);
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
        animate(opacity, 0.35, {
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
      // Ритуал: fleeing лишається true доки Campfire не зніме ritualActive;
      // після цього patrol effect знову стартує з InForest (longStay).
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
      {/* scaleX окремо, щоб flip не конфліктував із розміром NPC */}
      <motion.div style={{ scaleX }}>
        <Deer
          variant="camp"
          width={58}
          height={82}
          scared={scared}
          gait={gait}
          curious={curious}
        />
      </motion.div>
    </motion.div>
  );
}
