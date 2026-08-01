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

const EASE_ENTER = [0.22, 1, 0.36, 1] as const;
const EASE_EXIT = [0.45, 0.05, 0.55, 0.95] as const;

const FIRE_MIN = 85;
const FIRE_MAX = 135;
const OFFSCREEN_X = -70;

type AtFireBit = "microWander" | "curiousStep" | "turnLeave";

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

function walkDuration(from: number, to: number, secPerPx = 0.035) {
  return clamp(Math.abs(to - from) * secPerPx, 3.2, 5.2);
}

/**
 * Олень біля вогнища: зважений патруль із різними бітами біля вогню і
 * interruptible втеча з поточної позиції — без remount на `key`.
 *
 * Тікає з двох причин: у вогонь підкинули дровину (ritualActive) або по ньому
 * тицьнули пальцем. Обидві йдуть через один і той самий сценарій втечі, тож
 * олень ніколи не опиняється у двох станах водночас.
 */
export function CampDeer({ ritualActive }: { ritualActive: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(OFFSCREEN_X);
  const scaleX = useMotionValue(1);
  const opacity = useMotionValue(0);
  const [gait, setGait] = useState<DeerGait>("idle");
  const [curious, setCurious] = useState(false);
  const [scared, setScared] = useState(false);
  const [startled, setStartled] = useState(false);
  const ctrls = useRef<AnimationPlaybackControls[]>([]);
  const gen = useRef(0);

  // Спільний тригер: дровина або тик по оленю.
  const fleeing = ritualActive || startled;

  const stopCtrls = () => {
    for (const c of ctrls.current) c.stop();
    ctrls.current = [];
  };

  const track = (c: AnimationPlaybackControls) => {
    ctrls.current.push(c);
    return c;
  };

  // Патруль, поки немає ритуалу
  useEffect(() => {
    if (reduce) {
      x.set(48);
      scaleX.set(1);
      opacity.set(0.92);
      return;
    }
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

    const idleAtFire = async () => {
      setGait("idle");
      setCurious(Math.random() < 0.4);
      await sleep(rand(1800, 5200));
      setCurious(false);
    };

    const walkTo = async (target: number, duration: number, ease: readonly [number, number, number, number]) => {
      setCurious(false);
      setGait("walk");
      await track(animate(x, target, { duration, ease: [...ease] }));
    };

    const enter = async (fromNear = false) => {
      stopCtrls();
      const startX = fromNear ? clamp(x.get(), OFFSCREEN_X, FIRE_MIN) : OFFSCREEN_X;
      if (!fromNear) {
        x.set(OFFSCREEN_X);
        opacity.set(0);
      }
      scaleX.set(1);
      const fireX = rand(98, 128);
      const dur = fromNear
        ? clamp(Math.abs(fireX - startX) * 0.04, 1.4, 3.2)
        : rand(3.0, 4.4);
      if (!fromNear) {
        track(animate(opacity, 0.95, { duration: 0.45, ease: [...EASE_ENTER] }));
      } else if (opacity.get() < 0.9) {
        track(animate(opacity, 0.95, { duration: 0.3, ease: [...EASE_ENTER] }));
      }
      await walkTo(fireX, dur, EASE_ENTER);
    };

    const microWander = async () => {
      const steps = Math.random() < 0.45 ? 2 : 1;
      for (let i = 0; i < steps; i++) {
        if (!alive()) return;
        const cur = x.get();
        const delta = rand(12, 22) * (Math.random() < 0.5 ? -1 : 1);
        const target = clamp(cur + delta, FIRE_MIN, FIRE_MAX);
        // Обличчям у бік кроку
        scaleX.set(target >= cur ? 1 : -1);
        await walkTo(target, rand(0.55, 0.95), EASE_ENTER);
        if (!alive()) return;
        setGait("idle");
        setCurious(Math.random() < 0.35);
        await sleep(rand(700, 1600));
        setCurious(false);
      }
    };

    const curiousStep = async () => {
      const cur = x.get();
      const facing = scaleX.get() >= 0 ? 1 : -1;
      // Ближче до центру вогню (~112) — крок «вперед» відносно обличчя
      const towardFire = cur < 112 ? 1 : cur > 118 ? -1 : facing;
      scaleX.set(towardFire);
      const closer = clamp(cur + towardFire * rand(8, 14), FIRE_MIN, FIRE_MAX);
      await walkTo(closer, rand(0.45, 0.7), EASE_ENTER);
      if (!alive()) return;
      setGait("idle");
      setCurious(true);
      await sleep(rand(900, 1400));
      if (!alive()) return;
      // Крок назад від жару
      const backDir = -towardFire;
      scaleX.set(backDir);
      const back = clamp(closer + backDir * rand(10, 18), FIRE_MIN, FIRE_MAX);
      await walkTo(back, rand(0.5, 0.8), EASE_ENTER);
      if (!alive()) return;
      setGait("idle");
      setCurious(false);
      await sleep(rand(600, 1200));
    };

    const turnLeave = async () => {
      setCurious(false);
      setGait("idle");
      await sleep(rand(120, 280));
      if (!alive()) return;
      scaleX.set(-1);
      await sleep(rand(900, 2800));
      if (!alive()) return;
      const cur = x.get();
      await walkTo(OFFSCREEN_X, walkDuration(cur, OFFSCREEN_X), EASE_EXIT);
      if (!alive()) return;
      await track(animate(opacity, 0, { duration: 0.45, ease: EASE_OUT }));
      setGait("idle");
    };

    const run = async () => {
      setScared(false);
      setCurious(false);
      let peekReturn = false;
      while (alive()) {
        await enter(peekReturn);
        if (!alive()) break;

        await idleAtFire();
        if (!alive()) break;

        // Після idle — зважений вибір біта біля вогню
        let bit: AtFireBit = pickWeighted({
          microWander: 35,
          curiousStep: 25,
          turnLeave: 40,
        });

        if (bit === "microWander") {
          await microWander();
          if (!alive()) break;
          await idleAtFire();
          if (!alive()) break;
          // Після wander — або ще curious, або одразу leave
          bit =
            Math.random() < 0.3
              ? "curiousStep"
              : "turnLeave";
        }

        if (bit === "curiousStep") {
          await curiousStep();
          if (!alive()) break;
        }

        await turnLeave();
        if (!alive()) break;

        // ~15%: швидко повернувся подивитись, без повної offscreen-паузи
        peekReturn = Math.random() < 0.15;
        if (!peekReturn) {
          await sleep(rand(1600, 4800));
        } else {
          await sleep(rand(400, 900));
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

  // Втеча: alert → flee з поточної x/scaleX
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
      // На дровину олень реагує з затримкою (~.56s, поки вона летить), а на
      // дотик — миттєво: інакше тап відчувається як «не спрацював».
      await sleep(startled ? 0 : 480);
      if (gen.current !== my) return;
      // Anticipation: крок назад, розворот, потім біг
      const cur = x.get();
      const facing = scaleX.get();
      track(
        animate(x, cur + (facing > 0 ? -10 : 10), {
          duration: 0.14,
          ease: [0.22, 1, 0.36, 1],
        }),
      );
      await sleep(160);
      if (gen.current !== my) return;
      if (facing > 0) scaleX.set(-1);
      setGait("run");
      track(
        animate(x, -110, {
          duration: 0.95,
          ease: [0.2, 0.8, 0.2, 1],
        }),
      );
      track(
        animate(opacity, 0, {
          duration: 0.7,
          delay: 0.28,
          ease: [0.4, 0, 1, 1],
        }),
      );

      // Втечу від дотику знімаємо самі — ритуал гасить свій сигнал у Campfire.
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
      // pointer-events-auto лише тут: решта ambient-шару лишається наскрізною
      className="ambient-mob absolute bottom-[26px] left-10 z-[1] cursor-pointer touch-manipulation"
      style={{ x, scaleX, opacity }}
      aria-hidden
      onPointerDown={() => {
        if (!fleeing) {
          setStartled(true);
          playDeerStartle();
        }
      }}
    >
      <Deer
        variant="camp"
        width={58}
        height={82}
        scared={scared}
        gait={gait}
        curious={curious}
      />
    </motion.div>
  );
}
