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

/** Палітра camp-оленя — лише голова. */
const P = {
  head: "#2a1a0f",
  ear: "#b5717d",
  antler: "#080503",
  eye: "#ffe9a8",
  muzzleStroke: "#5c3f2c",
  nose: "#1d1108",
  snout: "#080503",
} as const;

/**
 * Чисто голова оленя: viewBox обрізаний під роги+морду (з повного 120×170).
 * Страшний погляд при переборі.
 */
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

/**
 * При переборі: голова оленя виглядає З‑ЗА КРАЮ САМОГО ЕКРАНА (як з рамки
 * айфона) — fixed overlay на весь viewport, ~пів екрана, не в герої додатку.
 */
export function CampOverageGiantDeer({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const opacity = useMotionValue(0);
  const [side, setSide] = useState<"left" | "right">("left");
  const [show, setShow] = useState(false);
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
        const fromLeft = Math.random() < 0.5;
        setSide(fromLeft ? "left" : "right");

        // За межею viewport → в кадр лише частина голови (~45vw peek)
        const off = fromLeft ? "-58vw" : "58vw";
        const peek = fromLeft ? "-8vw" : "8vw";

        x.set(off);
        opacity.set(0);
        setShow(true);
        playDeerStartle();

        track(animate(opacity, 1, { duration: 0.35, ease: [...EASE_SOFT] }));
        await track(
          animate(x, peek, {
            duration: rand(0.85, 1.25),
            ease: [0.18, 0.9, 0.22, 1],
          }),
        );
        if (!alive()) break;

        // Дивиться з‑за «рамки» телефону
        await sleep(rand(1600, 2800));
        if (!alive()) break;

        // Інколи трохи глибше заглядає
        if (Math.random() < 0.5) {
          const deeper = fromLeft ? "2vw" : "-2vw";
          await track(
            animate(x, deeper, {
              duration: rand(0.45, 0.7),
              ease: [...EASE_SOFT],
            }),
          );
          if (!alive()) break;
          await sleep(rand(600, 1100));
        }

        await track(
          animate(x, off, {
            duration: rand(0.55, 0.9),
            ease: [0.45, 0.05, 0.55, 0.95],
          }),
        );
        if (!alive()) break;
        await track(animate(opacity, 0, { duration: 0.2 }));
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
          className="absolute top-[16vh] will-change-transform"
          style={{
            x,
            opacity,
            [side === "left" ? "left" : "right"]: 0,
            // Дзеркало з правого краю — морда дивиться в екран
            scaleX: side === "right" ? -1 : 1,
            width: "52vw",
            maxWidth: 280,
            filter: "drop-shadow(0 12px 28px rgba(0,0,0,.55))",
          }}
        >
          {/* ~пів висоти екрана — тільки голова */}
          <DeerHeadSvg className="h-[48vh] w-full max-h-[360px]" />
        </motion.div>
      ) : null}
    </div>,
    document.body,
  );
}
