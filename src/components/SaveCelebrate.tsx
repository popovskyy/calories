"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Flame } from "lucide-react";
import { playFinisher } from "@/lib/sfx";
import { haptic } from "@/lib/haptics";

interface SaveCelebrateProps {
  open: boolean;
  onDone: () => void;
  inTarget?: boolean;
  /** Куплений фінішер; за замовчуванням — конфеті. */
  finisher?: string;
  /** Куплений саундпак — визначає акорд перемоги. */
  soundpack?: string;
}

/**
 * Коротке святкування після збереження прийому їжі.
 *
 * Це найчастіше побачений «моментний» екран у застосунку, тому саме він і
 * продається: висока частота показу робить дешеву анімацію дорогою за
 * сприйняттям. Усе малюється CSS/framer-motion — жодних ассетів.
 */

export const FINISHER_TEXT: Record<string, string> = {
  confetti: "День у нормі!",
  blockbreak: "Блок вибито!",
  perfect: "PERFECT!",
  cosmos: "До зірок!",
  goldrain: "Золотий день!",
  fireflies: "Ліс аплодує",
  ripple: "У хвилі!",
  stamp: "Влучно!",
};

export const FINISHER_COLOR: Record<string, string> = {
  confetti: "var(--color-green)",
  blockbreak: "#5b9c3a",
  perfect: "#FF4B4B",
  cosmos: "#9184d9",
  goldrain: "#FFC800",
  fireflies: "#ff8a3d",
  ripple: "#1CB0F6",
  stamp: "#58CC02",
};

const CONFETTI_PALETTE = ["#FFC800", "#FF86D0", "#1CB0F6", "#58CC02", "#FF9600"];

/** Частинки / короткі ефекти фінішера: форма й траєкторія залежать від стилю. */
function Particles({ finisher, reduce }: { finisher: string; reduce: boolean }) {
  if (reduce) return null;

  if (finisher === "ripple") return <RippleRings />;
  if (finisher === "stamp") return <StampShock />;

  const color = FINISHER_COLOR[finisher] ?? "var(--color-accent)";
  const square = finisher === "blockbreak";
  const count = finisher === "goldrain" ? 14 : finisher === "fireflies" ? 8 : 10;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 46 + (i % 3) * 14;
        const confettiColor =
          finisher === "confetti"
            ? CONFETTI_PALETTE[i % CONFETTI_PALETTE.length]!
            : color;

        if (finisher === "goldrain") {
          return (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{
                width: 6,
                height: 8,
                borderRadius: 2,
                background: color,
                boxShadow: `0 0 6px ${color}88`,
              }}
              initial={{ x: (i - count / 2) * 10, y: -70, opacity: 1, rotate: 0 }}
              animate={{
                x: (i - count / 2) * 12,
                y: 90,
                opacity: 0,
                rotate: i % 2 === 0 ? 40 : -40,
              }}
              transition={{ duration: 0.85, delay: i * 0.02, ease: "easeIn" }}
            />
          );
        }

        if (finisher === "fireflies") {
          const drift = (i % 2 === 0 ? 1 : -1) * (18 + (i % 3) * 10);
          return (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: 5,
                height: 5,
                background: color,
                boxShadow: `0 0 10px ${color}`,
              }}
              initial={{ x: (i - count / 2) * 8, y: 20, opacity: 0, scale: 0.6 }}
              animate={{
                x: [null, drift * 0.4, drift],
                y: [20, -30, -70],
                opacity: [0, 1, 0],
                scale: [0.6, 1.2, 0.4],
              }}
              transition={{ duration: 0.95, delay: i * 0.04, ease: "easeOut" }}
            />
          );
        }

        if (finisher === "cosmos") {
          return (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderBottom: `7px solid ${color}`,
                filter: `drop-shadow(0 0 4px ${color})`,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
              animate={{
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                opacity: 0,
                scale: 1,
                rotate: 120,
              }}
              transition={{ duration: 0.8, delay: i * 0.02, ease: "easeOut" }}
            />
          );
        }

        return (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2"
            style={{
              width: square ? 8 : 6,
              height: square ? 8 : 6,
              borderRadius: square ? 1 : 999,
              background: confettiColor,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              opacity: 0,
              scale: 0.5,
              rotate: square ? 180 : 0,
            }}
            transition={{ duration: 0.75, delay: i * 0.015, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

/** Три концентричні кільця — «sonar» після влучання в норму. */
function RippleRings() {
  const color = FINISHER_COLOR.ripple!;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: 28,
            height: 28,
            marginLeft: -14,
            marginTop: -14,
            border: `2px solid ${color}`,
            boxShadow: `0 0 12px ${color}55`,
          }}
          initial={{ scale: 0.4, opacity: 0.85 }}
          animate={{ scale: 3.4 + i * 0.35, opacity: 0 }}
          transition={{
            duration: 0.85,
            delay: i * 0.12,
            ease: [0.16, 1, 0.3, 1],
          }}
        />
      ))}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
        return (
          <motion.span
            key={`d-${i}`}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: 4,
              height: 4,
              marginLeft: -2,
              marginTop: -2,
              background: color,
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * 58,
              y: Math.sin(angle) * 58,
              opacity: 0,
            }}
            transition={{ duration: 0.7, delay: 0.08 + i * 0.03, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

/** Ударна хвиля + коротка «печатка» влучання. */
function StampShock() {
  const color = FINISHER_COLOR.stamp!;
  return (
    <>
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: 36,
            height: 36,
            marginLeft: -18,
            marginTop: -18,
            border: `2.5px solid ${color}`,
          }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 2.8 + i * 0.5, opacity: 0 }}
          transition={{
            duration: 0.55,
            delay: i * 0.08,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={`s-${i}`}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2"
            style={{
              width: 3,
              height: 10,
              marginLeft: -1.5,
              marginTop: -5,
              borderRadius: 1,
              background: color,
              transformOrigin: "50% 50%",
              rotate: `${(angle * 180) / Math.PI}deg`,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scaleY: 0.4 }}
            animate={{
              x: Math.cos(angle) * 52,
              y: Math.sin(angle) * 52,
              opacity: 0,
              scaleY: 1.2,
            }}
            transition={{ duration: 0.45, delay: 0.04, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

export function SaveCelebrate({
  open,
  onDone,
  inTarget,
  finisher = "confetti",
  soundpack = "default",
}: SaveCelebrateProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    // Акорд лише за влучний день — щоб звук лишався нагородою, а не фоном.
    if (inTarget) {
      playFinisher(soundpack, finisher);
      haptic("success");
    }
    const t = window.setTimeout(onDone, reduce ? 400 : 1100);
    return () => window.clearTimeout(t);
  }, [open, onDone, reduce, inTarget, soundpack, finisher]);

  // Фінішер — нагорода саме за влучний день; звичайний запис лишається скромним.
  const style = inTarget ? finisher : "confetti";
  const color = FINISHER_COLOR[style] ?? "var(--color-accent)";
  const isStamp = inTarget && style === "stamp";
  const isPerfect = style === "perfect";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="relative flex flex-col items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-8 py-6 shadow-[var(--shadow-card-lg)]"
            initial={
              reduce
                ? { opacity: 0 }
                : isStamp
                  ? { opacity: 0, scale: 1.18, y: -6 }
                  : { opacity: 0, y: 10, scale: 0.94, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={
              isStamp && !reduce
                ? { type: "spring", duration: 0.38, bounce: 0.35 }
                : { type: "spring", duration: 0.4, bounce: 0.12 }
            }
          >
            {inTarget ? <Particles finisher={style} reduce={!!reduce} /> : null}

            {isStamp ? (
              <motion.span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  background: `color-mix(in srgb, ${color} 22%, transparent)`,
                  color,
                }}
                initial={reduce ? false : { scale: 1.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.32, bounce: 0.5 }}
              >
                <Check size={28} strokeWidth={3} />
              </motion.span>
            ) : (
              <Flame
                size={36}
                style={{ color: inTarget ? color : "var(--color-accent)" }}
              />
            )}
            <motion.p
              className="text-[17px] font-semibold text-[var(--color-text)]"
              // «PERFECT!» б'є в екран — дрібна деталь, заради якої його й купують
              initial={
                isPerfect && !reduce ? { scale: 1.6, opacity: 0 } : false
              }
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.45 }}
            >
              {inTarget ? (FINISHER_TEXT[style] ?? "День у нормі!") : "Записано!"}
            </motion.p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
