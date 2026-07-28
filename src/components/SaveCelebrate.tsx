"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
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

const FINISHER_TEXT: Record<string, string> = {
  confetti: "День у нормі!",
  blockbreak: "Блок вибито!",
  perfect: "PERFECT!",
  cosmos: "До зірок!",
  goldrain: "Золотий день!",
  fireflies: "Ліс аплодує",
};

const FINISHER_COLOR: Record<string, string> = {
  confetti: "var(--color-green)",
  blockbreak: "#5b9c3a",
  perfect: "#FF4B4B",
  cosmos: "#9184d9",
  goldrain: "#FFC800",
  fireflies: "#ff8a3d",
};

/** Частинки фінішера: колір і форма залежать від обраного стилю. */
function Particles({ finisher, reduce }: { finisher: string; reduce: boolean }) {
  if (reduce) return null;

  const color = FINISHER_COLOR[finisher] ?? "var(--color-accent)";
  const square = finisher === "blockbreak";
  const count = finisher === "goldrain" ? 14 : 10;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = 46 + (i % 3) * 14;
        // Золотий дощ падає згори, решта — розлітається від центру.
        const to =
          finisher === "goldrain"
            ? { x: (i - count / 2) * 12, y: 90 }
            : { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };

        return (
          <motion.span
            key={i}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2"
            style={{
              width: square ? 8 : 6,
              height: square ? 8 : 6,
              borderRadius: square ? 1 : 999,
              background: color,
            }}
            initial={{ x: 0, y: finisher === "goldrain" ? -70 : 0, opacity: 1, scale: 1 }}
            animate={{ x: to.x, y: to.y, opacity: 0, scale: 0.5, rotate: square ? 180 : 0 }}
            transition={{ duration: 0.75, delay: i * 0.015, ease: "easeOut" }}
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
      playFinisher(soundpack);
      haptic("success");
    }
    const t = window.setTimeout(onDone, reduce ? 400 : 1100);
    return () => window.clearTimeout(t);
  }, [open, onDone, reduce, inTarget, soundpack]);

  // Фінішер — нагорода саме за влучний день; звичайний запис лишається скромним.
  const style = inTarget ? finisher : "confetti";
  const color = FINISHER_COLOR[style] ?? "var(--color-accent)";

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
                : { opacity: 0, y: 10, scale: 0.94, filter: "blur(4px)" }
            }
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.12 }}
          >
            {inTarget ? <Particles finisher={style} reduce={!!reduce} /> : null}

            <Flame
              size={36}
              style={{ color: inTarget ? color : "var(--color-accent)" }}
            />
            <motion.p
              className="text-[17px] font-semibold text-[var(--color-text)]"
              // «PERFECT!» б'є в екран — дрібна деталь, заради якої його й купують
              initial={
                style === "perfect" && !reduce ? { scale: 1.6, opacity: 0 } : false
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
