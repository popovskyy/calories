"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PetBody, PetTrigger } from "@/lib/pet";

/**
 * Дефолтний питомець Nocturne (і fallback інших тем):
 * місячний звірок — фіолетові тони теми, живіт морфиться за body.
 */
export function MoonCritter({
  body,
  trigger,
  size = 112,
}: {
  body: PetBody;
  trigger: PetTrigger | null;
  size?: number;
}) {
  const reduce = useReducedMotion();
  const belly =
    body === "lean"
      ? { sx: 0.82, sy: 0.9 }
      : body === "plump"
        ? { sx: 1.14, sy: 1.1 }
        : body === "ache"
          ? { sx: 1.22, sy: 1.14 }
          : { sx: 1, sy: 1 };

  const eating = trigger === "eat";
  const aching = trigger === "over" || (body === "ache" && trigger === "tap");
  const tapping = trigger === "tap" && !aching;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      aria-hidden
      initial={false}
      animate={
        reduce
          ? { y: 0, rotate: 0 }
          : aching
            ? { y: [0, 2, 0, 2, 0], rotate: [0, -4, 3, -2, 0] }
            : eating
              ? { y: [0, -4, 0, -3, 0], scale: [1, 1.04, 1] }
              : tapping
                ? { rotate: [0, -8, 6, 0] }
                : { y: [0, -3, 0] }
      }
      transition={
        reduce
          ? { duration: 0 }
          : aching
            ? { duration: 1.2, ease: "easeInOut" }
            : eating
              ? { duration: 1.1, ease: "easeInOut" }
              : tapping
                ? { duration: 0.55, ease: "easeOut" }
                : { duration: 3.2, repeat: Infinity, ease: "easeInOut" }
      }
    >
      {/* soft glow */}
      <ellipse cx="64" cy="108" rx="34" ry="8" fill="rgba(145,132,217,0.22)" />

      {/* ears */}
      <path d="M38 44 L30 18 L52 36 Z" fill="#7b6fc4" />
      <path d="M90 44 L98 18 L76 36 Z" fill="#7b6fc4" />
      <path d="M38 42 L34 24 L48 36 Z" fill="#c4b8f0" />
      <path d="M90 42 L94 24 L80 36 Z" fill="#c4b8f0" />

      {/* head */}
      <ellipse cx="64" cy="48" rx="28" ry="24" fill="#9184d9" />
      {/* moon crest */}
      <path
        d="M64 18c8 0 14 6 14 14 0-10-6-16-14-16-8 0-14 6-14 16 0-8 6-14 14-14z"
        fill="#e8e0ff"
        opacity="0.95"
      />

      {/* body / belly morph */}
      <g
        style={{
          transformOrigin: "64px 78px",
          transform: `scale(${belly.sx}, ${belly.sy})`,
        }}
      >
        <ellipse cx="64" cy="82" rx="32" ry="28" fill="#7b6fc4" />
        <ellipse
          cx="64"
          cy="86"
          rx="22"
          ry={body === "lean" ? 16 : body === "ache" ? 24 : 20}
          fill="#c4b8f0"
        />
      </g>

      {/* feet */}
      <ellipse cx="50" cy="108" rx="10" ry="6" fill="#5c528f" />
      <ellipse cx="78" cy="108" rx="10" ry="6" fill="#5c528f" />

      {/* arms — ache: hold belly */}
      {body === "ache" || aching ? (
        <>
          <path
            d="M36 78 Q28 92 48 96"
            stroke="#7b6fc4"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M92 78 Q100 92 80 96"
            stroke="#7b6fc4"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <path
            d="M34 72 Q22 88 30 98"
            stroke="#7b6fc4"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M94 72 Q106 88 98 98"
            stroke="#7b6fc4"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {/* face */}
      <circle cx="52" cy="48" r="4.5" fill="#1a1630" />
      <circle cx="76" cy="48" r="4.5" fill="#1a1630" />
      {body === "ache" || aching ? (
        <>
          <path
            d="M48 46 Q52 42 56 46"
            stroke="#1a1630"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M72 46 Q76 42 80 46"
            stroke="#1a1630"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M56 58 Q64 54 72 58"
            stroke="#5c528f"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : eating ? (
        <ellipse cx="64" cy="58" rx="5" ry="4" fill="#1a1630" />
      ) : (
        <path
          d="M56 58 Q64 64 72 58"
          stroke="#5c528f"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* blush */}
      <ellipse cx="42" cy="54" rx="5" ry="3" fill="#ff9ad5" opacity="0.45" />
      <ellipse cx="86" cy="54" rx="5" ry="3" fill="#ff9ad5" opacity="0.45" />

      {/* sweat drop when ache */}
      {(body === "ache" || aching) && !reduce ? (
        <motion.ellipse
          cx="88"
          cy="36"
          rx="3"
          ry="4"
          fill="#a8c8ff"
          animate={{ y: [0, 6, 0], opacity: [0.8, 0.2, 0.8] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
    </motion.svg>
  );
}
