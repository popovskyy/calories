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

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/**
 * Другий олень при переборі калорій: час від часу виринає з самого краю
 * екрана — дуже великий (~пів героя), наляканий, пробігає/виглядає і йде.
 */
export function CampOverageGiantDeer({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const opacity = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const [gait, setGait] = useState<DeerGait>("idle");
  const [visible, setVisible] = useState(false);
  const ctrls = useRef<AnimationPlaybackControls[]>([]);
  const gen = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopCtrls = () => {
    for (const c of ctrls.current) c.stop();
    ctrls.current = [];
  };

  const track = (c: AnimationPlaybackControls) => {
    ctrls.current.push(c);
    return c;
  };

  useEffect(() => {
    if (reduce || !active) {
      stopCtrls();
      opacity.set(0);
      setVisible(false);
      setGait("idle");
      return;
    }

    const my = ++gen.current;
    let cancelled = false;
    const alive = () => !cancelled && gen.current === my;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms);
        ctrls.current.push({ stop: () => window.clearTimeout(t) } as AnimationPlaybackControls);
      });

    const widthOf = () => containerRef.current?.offsetWidth ?? 320;

    const run = async () => {
      // Перша поява не миттєва — хай перебір «повисить» кілька секунд
      await sleep(rand(2800, 5200));

      while (alive()) {
        const w = widthOf();
        const fromLeft = Math.random() < 0.5;
        // За краєм екрана → трохи в кадр, потім назад
        const off = fromLeft ? -Math.round(w * 0.42) : Math.round(w * 0.72);
        const peek = fromLeft ? Math.round(w * 0.02) : Math.round(w * 0.38);
        const exit = off;

        scaleX.set(fromLeft ? 1 : -1);
        x.set(off);
        opacity.set(0);
        setVisible(true);
        setGait("run");
        playDeerStartle();

        track(animate(opacity, 1, { duration: 0.35, ease: [...EASE_SOFT] }));
        await track(
          animate(x, peek, {
            duration: rand(1.1, 1.7),
            ease: [0.2, 0.85, 0.25, 1],
          }),
        );
        if (!alive()) break;

        // Коротко «виглядає» з краю
        setGait("idle");
        await sleep(rand(400, 900));
        if (!alive()) break;

        // Інколи пробігає глибше до середини, потім тікає
        if (Math.random() < 0.45) {
          setGait("run");
          const deeper = fromLeft ? Math.round(w * 0.18) : Math.round(w * 0.22);
          scaleX.set(fromLeft ? 1 : -1);
          await track(
            animate(x, deeper, {
              duration: rand(0.55, 0.9),
              ease: [0.25, 0.9, 0.3, 1],
            }),
          );
          if (!alive()) break;
          await sleep(rand(200, 450));
        }

        // Тікає назад за край
        setGait("run");
        scaleX.set(fromLeft ? -1 : 1);
        await track(
          animate(x, exit, {
            duration: rand(0.7, 1.15),
            ease: [0.4, 0.05, 0.6, 1],
          }),
        );
        if (!alive()) break;

        track(animate(opacity, 0, { duration: 0.25 }));
        await sleep(280);
        setVisible(false);
        setGait("idle");

        // Пауза між появами
        await sleep(rand(6000, 14000));
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopCtrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduce]);

  if (reduce || !active) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      {visible ? (
        <motion.div
          className="ambient-mob absolute bottom-[-8px] left-0"
          style={{ x, opacity }}
        >
          <motion.div style={{ scaleX, transformOrigin: "50% 100%" }}>
            {/* ~пів висоти героя (250px) — виглядає з самого краю екрана */}
            <Deer
              variant="camp"
              width={118}
              height={168}
              scared
              gait={gait}
              curious={gait === "idle"}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}
