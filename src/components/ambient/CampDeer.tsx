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

/**
 * Олень біля вогнища: патруль із паузами (не марширує стоячи) і
 * interruptible втеча з поточної позиції — без remount на `key`.
 */
export function CampDeer({ ritualActive }: { ritualActive: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(-70);
  const scaleX = useMotionValue(1);
  const opacity = useMotionValue(0);
  const [gait, setGait] = useState<DeerGait>("idle");
  const [scared, setScared] = useState(false);
  const ctrls = useRef<AnimationPlaybackControls[]>([]);
  const gen = useRef(0);

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
      setGait("idle");
      setScared(false);
      return;
    }
    if (ritualActive) return;

    const my = ++gen.current;
    let cancelled = false;
    setScared(false);

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms);
        ctrls.current.push({ stop: () => window.clearTimeout(t) } as AnimationPlaybackControls);
      });

    const run = async () => {
      while (!cancelled && gen.current === my) {
        stopCtrls();
        x.set(-70);
        scaleX.set(1);
        opacity.set(0);
        setGait("walk");
        track(animate(opacity, 0.95, { duration: 0.45, ease: [0.22, 1, 0.36, 1] }));
        await track(
          animate(x, 112, { duration: 3.6, ease: [0.22, 1, 0.36, 1] }),
        );
        if (cancelled || gen.current !== my) break;

        // Стоїть біля вогню — дихає, не тупає
        setGait("idle");
        await sleep(3400);
        if (cancelled || gen.current !== my) break;

        // Перевертається з паузою (вага, не sprite-flip)
        await sleep(160);
        scaleX.set(-1);
        await sleep(3000);
        if (cancelled || gen.current !== my) break;

        setGait("walk");
        await track(
          animate(x, -70, {
            duration: 4.4,
            ease: [0.45, 0.05, 0.55, 0.95],
          }),
        );
        await track(animate(opacity, 0, { duration: 0.45, ease: "easeIn" }));
        setGait("idle");
        await sleep(2800);
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopCtrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- motion values stable
  }, [ritualActive, reduce]);

  // Втеча: alert → flee з поточної x/scaleX
  useEffect(() => {
    if (!ritualActive || reduce) return;

    const my = ++gen.current;
    stopCtrls();
    setGait("idle");
    setScared(true);

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

    const flee = async () => {
      // Чекаємо дровину (~.56s), як раніше в CSS — не тікає одразу
      await sleep(480);
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
    };

    void flee();
    return () => {
      /* gen bump cancels */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ritualActive, reduce]);

  if (reduce) return null;

  return (
    <motion.div
      className="ambient-mob pointer-events-none absolute bottom-[26px] left-10 z-[1]"
      style={{ x, scaleX, opacity }}
    >
      <Deer variant="camp" width={58} height={82} scared={scared} gait={gait} />
    </motion.div>
  );
}
