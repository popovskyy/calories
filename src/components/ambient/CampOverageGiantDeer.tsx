"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  type AnimationPlaybackControls,
} from "framer-motion";
import { playDeerStartle } from "@/lib/sfx";

const EASE_SOFT = [0.22, 1, 0.36, 1] as const;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Страшні / тролінгові репліки оленя при переборі. */
const SCARE_LINES = [
  "Бууу!",
  "Я тебе з'їм",
  "Сьогодні ти піднабрав…",
  "Іди сюди. Я голодний",
  "Ще один укус — і кінець",
  "Не кричи. Ніхто не почує",
  "Ти пахнеш перебором",
  "Я вже вибрав тебе на вечерю",
  "Залиш собі десерт. Себе",
  "Ой. Хтось вийшов за норму",
  "Ближче… ще ближче…",
  "Калорії кричать. Я чую",
  "Ти мій. Зі всіма ккал",
  "Буууу. З вогнем покінчено",
  "Не тікай від лісу",
] as const;

const P = {
  head: "#2a1a0f",
  ear: "#b5717d",
  antler: "#080503",
  eye: "#ffe9a8",
  muzzleStroke: "#5c3f2c",
  nose: "#1d1108",
  snout: "#080503",
} as const;

/** Голова оленя (обрізаний viewBox з повного силуету). */
function DeerHeadSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="12 6 96 108"
      className={className}
      aria-hidden
      style={{ animation: "deerCurious 4.2s ease-in-out infinite" }}
    >
      <g
        className="deer-part deer-scared"
        style={{
          transformOrigin: "50% 70%",
          animation: "headScan 5.4s cubic-bezier(0.33, 1, 0.68, 1) infinite",
        }}
      >
        <g stroke={P.antler} strokeWidth={6} strokeLinecap="round" fill="none">
          <path d="M45 50C41 36 35 26 25 14" />
          <path d="M34 28L20 24M30 19L27 6M40 39L27 38" />
          <path d="M75 50C79 36 85 26 95 14" />
          <path d="M86 28l14-4M90 19l3-13M80 39l13-1" />
        </g>
        <path d="M31 56q-9-8-5-19q11 4 13 16z" fill={P.head} />
        <path d="M33 55q-5-5-3-11q6 3 7 10z" fill={P.ear} />
        <path d="M89 56q9-8 5-19q-11 4-13 16z" fill={P.head} />
        <path d="M87 55q5-5 3-11q-6 3-7 10z" fill={P.ear} />
        <ellipse cx="60" cy="72" rx="27" ry="26" fill={P.head} />
        <path d="M50 88h20v10q0 9-10 9t-10-9z" fill={P.head} />
        <g style={{ animation: "eyeFlare 8s ease-in-out infinite" }}>
          <circle className="deer-eye" cx="47" cy="68" r="12.5" fill={P.eye} />
          <circle className="deer-eye" cx="73" cy="68" r="12.5" fill={P.eye} />
          <circle cx="47" cy="68" r="5" fill="#0f0904" />
          <circle cx="73" cy="68" r="5" fill="#0f0904" />
        </g>
        <rect
          x="52"
          y="86"
          width="16"
          height="26"
          rx="8"
          fill={P.snout}
          stroke={P.muzzleStroke}
          strokeWidth="2"
        />
        <ellipse cx="60" cy="86" rx="7" ry="5" fill={P.nose} />
      </g>
    </svg>
  );
}

/** Комікс-хмарці біля голови — текст не дзеркалиться. */
function ScareBubble({
  text,
  fromLeft,
}: {
  text: string;
  fromLeft: boolean;
}) {
  return (
    <div
      className="absolute top-[18%] z-[1] max-w-[9.5rem]"
      style={{
        [fromLeft ? "left" : "right"]: "58%",
        animation: "scareBubbleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <div
        className="relative rounded-[18px] border-[2.5px] border-[#1a120c] bg-[#fff6e8] px-3 py-2 text-center text-[13px] font-black leading-snug text-[#1a120c] shadow-[3px_4px_0_#1a120c]"
        style={{ fontFamily: "var(--font-display), system-ui, sans-serif" }}
      >
        {text}
        {/* хвостик хмарки до морди */}
        <span
          className="absolute top-[72%] h-3 w-3 rotate-45 border-b-[2.5px] border-r-[2.5px] border-[#1a120c] bg-[#fff6e8]"
          style={{
            [fromLeft ? "left" : "right"]: -6,
            boxShadow: fromLeft ? "2px 2px 0 #1a120c" : "-1px 2px 0 #1a120c",
          }}
        />
      </div>
    </div>
  );
}

/**
 * При переборі: голова оленя виглядає З‑ЗА КРАЮ ЕКРАНА ТЕЛЕФОНА
 * + комікс-хмара з рандомною страшною фразою.
 */
export function CampOverageGiantDeer({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const opacity = useMotionValue(0);
  const scaleX = useMotionValue(1);
  const [show, setShow] = useState(false);
  const [fromLeft, setFromLeft] = useState(true);
  const [line, setLine] = useState<string>(SCARE_LINES[0]);
  const [portalReady, setPortalReady] = useState(false);
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

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (reduce || !active) {
      stopCtrls();
      opacity.set(0);
      setShow(false);
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

    const run = async () => {
      await sleep(rand(900, 1800));

      while (alive()) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const headW = Math.min(vw * 0.55, vh * 0.42);
        const left = Math.random() < 0.5;

        const off = left ? -(headW + 16) : vw + 8;
        const peek = left ? -(headW * 0.35) : vw - headW * 0.65;

        setFromLeft(left);
        setLine(pick(SCARE_LINES));
        scaleX.set(left ? 1 : -1);
        x.set(off);
        opacity.set(0);
        setShow(true);
        playDeerStartle();

        track(animate(opacity, 1, { duration: 0.32, ease: [...EASE_SOFT] }));
        await track(
          animate(x, peek, {
            duration: rand(0.85, 1.2),
            ease: [0.18, 0.9, 0.22, 1],
          }),
        );
        if (!alive()) break;

        await sleep(rand(1800, 3000));
        if (!alive()) break;

        if (Math.random() < 0.55) {
          const deeper = left ? -(headW * 0.18) : vw - headW * 0.82;
          await track(
            animate(x, deeper, {
              duration: rand(0.4, 0.65),
              ease: [...EASE_SOFT],
            }),
          );
          if (!alive()) break;
          await sleep(rand(700, 1200));
        }

        await track(
          animate(x, off, {
            duration: rand(0.55, 0.85),
            ease: [0.45, 0.05, 0.55, 0.95],
          }),
        );
        if (!alive()) break;
        await track(animate(opacity, 0, { duration: 0.18 }));
        setShow(false);

        await sleep(rand(4000, 8000));
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopCtrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduce]);

  if (reduce || !active || !portalReady) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[180] overflow-hidden"
      aria-hidden
    >
      {show ? (
        <motion.div
          className="absolute top-[14vh] left-0 will-change-transform"
          style={{
            x,
            opacity,
            width: "min(55vw, 42vh)",
            filter: "drop-shadow(0 16px 32px rgba(0,0,0,.6))",
          }}
        >
          <div className="relative">
            {/* голова дзеркалиться; хмарка — ні */}
            <motion.div style={{ scaleX }}>
              <DeerHeadSvg className="h-[50vh] w-full max-h-[420px]" />
            </motion.div>
            <ScareBubble text={line} fromLeft={fromLeft} />
          </div>
        </motion.div>
      ) : null}
    </div>,
    document.body,
  );
}
