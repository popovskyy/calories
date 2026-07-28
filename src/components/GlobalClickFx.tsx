"use client";

/**
 * Глобальна тактильна віддача на будь-який тап по кнопці/посиланню.
 *
 * Один делегований `pointerdown`-слухач на document — замість того, щоб
 * розводити звук по сотнях окремих кнопок. Натиск, а не відпускання: той
 * самий принцип, що вже діє в CSS (`.btn:active`) і в CampDeer.
 *
 * Звук не один-на-всі-випадки — `classify()` нижче обирає тембр за
 * семантикою елемента (основна дія / навігація / деструктив / звичайний
 * клік), а `data-sfx="none"` дає моментам із власним фінішером (збереження
 * їжі тощо) лишитись беззвучними тут, щоб не забивати їхній звук.
 *
 * Іскри — не canvas: 3–4 короткоживучі `motion.span` у портал-оверлеї,
 * як у SaveCelebrate. Дешево, вимикається разом з prefers-reduced-motion
 * і з перемикачем «Візуальні ефекти» в профілі.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { playUiClick, playUiConfirm, playUiDestructive, playUiNav } from "@/lib/sfx";
import { getSettings } from "@/lib/settings";
import { useCurrentUser } from "@/hooks/useQueries";

const INTERACTIVE_SELECTOR =
  "button:not(:disabled), a[href], [role='button']:not([aria-disabled='true']), summary";

interface Burst {
  id: number;
  x: number;
  y: number;
}

const DOT_COUNT = 4;
const MAX_BURSTS = 6;

type SfxKind = "none" | "destructive" | "confirm" | "nav" | "click";

/**
 * Один клік — не один звук. `data-sfx` на елементі явно перевизначає
 * категорію (напр. `data-sfx="none"` на кнопці «Зберегти в журнал» — той
 * момент вже має власний фінішер/ритуал, генерик-клік лише заглушував би
 * його). За відсутності атрибута класифікація йде від семантики елемента:
 * основна дія (.btn-primary) звучить впевненіше, посилання-навігація —
 * тихіше й нижче (перехід між сторінками не миттєвий, звук не повинен
 * прикидатись «дію виконано»), решта — базовий клік.
 */
function classify(el: Element): SfxKind {
  const explicit = el.closest("[data-sfx]")?.getAttribute("data-sfx");
  if (explicit === "none" || explicit === "destructive" || explicit === "confirm" || explicit === "nav" || explicit === "click") {
    return explicit;
  }
  if (el.closest(".btn-primary")) return "confirm";
  if (el.matches("a[href]")) return "nav";
  return "click";
}

function playForKind(kind: SfxKind, pack: string) {
  switch (kind) {
    case "none":
      return;
    case "destructive":
      playUiDestructive();
      return;
    case "confirm":
      playUiConfirm(pack);
      return;
    case "nav":
      playUiNav(pack);
      return;
    default:
      playUiClick(pack);
  }
}

export function GlobalClickFx() {
  const reduce = useReducedMotion();
  const { user } = useCurrentUser();
  const packRef = useRef(user?.soundpack ?? "default");
  const [bursts, setBursts] = useState<Burst[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    packRef.current = user?.soundpack ?? "default";
  }, [user?.soundpack]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.isPrimary === false) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const hit = target.closest(INTERACTIVE_SELECTOR);
      if (!hit) return;

      const kind = classify(hit);
      if (kind === "none") return;

      if (getSettings().sound) playForKind(kind, packRef.current);

      if (!reduce && getSettings().vfx) {
        const id = ++seq.current;
        setBursts((prev) => [...prev.slice(-MAX_BURSTS + 1), { id, x: e.clientX, y: e.clientY }]);
        window.setTimeout(() => {
          setBursts((prev) => prev.filter((b) => b.id !== id));
        }, 320);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [reduce]);

  if (bursts.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[150] overflow-hidden">
      <AnimatePresence>
        {bursts.map((b) => (
          <SparkBurst key={b.id} x={b.x} y={b.y} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function SparkBurst({ x, y }: { x: number; y: number }) {
  return (
    <>
      {Array.from({ length: DOT_COUNT }).map((_, i) => {
        const angle = (i / DOT_COUNT) * Math.PI * 2 + Math.PI / 4;
        const dist = 14 + (i % 2) * 6;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[var(--color-accent)]"
            style={{ left: x, top: y, width: 4, height: 4, marginLeft: -2, marginTop: -2 }}
            initial={{ opacity: 0.9, scale: 1, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: 0.4,
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}
