"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { HAPTIC, vibrate } from "@/lib/haptics";

/** Тривалість утримання за ТЗ: 1.5 с. */
export const HOLD_MS = 1500;

const R = 20;
const CIRC = 2 * Math.PI * R; // ≈125.66 — довжина кола для stroke-dashoffset
/** Скільки пікселів палець може «з'їхати» за межі кнопки, доки утримання не скасується. */
const SLOP_PX = 24;
/** Після завершення утримання браузер шле click на pointerup — він не має одразу скасувати прогрес. */
const CLICK_GUARD_MS = 700;

interface Props {
  completed: boolean;
  /** Викликається один раз, коли утримання досягло 100%. */
  onComplete: () => void;
  /** Тап по вже виконаному — скасувати. Без пропа виконане не скасовується. */
  onUndo?: () => void;
  holdMs?: number;
  /** ring — кругла кнопка біля вправи; bar — широка кнопка «Завершити тренування». */
  variant?: "ring" | "bar";
  /** aria-label і текст у bar-варіанті. */
  label: string;
  doneLabel?: string;
  /** Колір кільця/заливки в стані утримання. */
  accent?: string;
  /** Лише для ring: lg 48px (за замовчуванням), md 40px — для згорнутих виконаних карток. */
  size?: "lg" | "md";
  disabled?: boolean;
  className?: string;
}

/**
 * Кастомний «затисни, щоб завершити».
 *
 * Pointer Events: down → старт, up / leave / cancel → плавний відкат кільця.
 * Під час утримання: кільце заповнюється, елемент стискається (scale), при 100% —
 * пульсація-світіння, малюється галочка (stroke-dashoffset), onComplete().
 *
 * Прогрес пишемо прямо в DOM з requestAnimationFrame (refs), а не в React-стан:
 * 60 ре-рендерів на секунду на кожній картці — зайве, а так компонент рендериться
 * лише при зміні `completed`.
 */
export function HoldToCompleteButton({
  completed,
  onComplete,
  onUndo,
  holdMs = HOLD_MS,
  variant = "ring",
  label,
  doneLabel,
  accent = "#2B90FE",
  size = "lg",
  disabled = false,
  className,
}: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  /** Світіння по краях екрана (#charge-glow у layout): яскравість = прогрес утримання. */
  const glowRef = useRef<HTMLElement | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const holdingRef = useRef(false);
  const firedAtRef = useRef(-Infinity);

  const paint = useCallback(
    (p: number) => {
      const ring = ringRef.current;
      const fill = fillRef.current;
      const btn = btnRef.current;
      if (ring) ring.style.strokeDashoffset = String(CIRC * (1 - p));
      if (fill) fill.style.transform = `scaleX(${p})`;
      // Притискання: ring — до 0.88, bar — до 0.97 (широкий елемент не має «стрибати»)
      const squeeze = variant === "ring" ? 0.12 : 0.03;
      if (btn) btn.style.transform = p > 0 ? `scale(${1 - squeeze * p})` : "";
      glowRef.current?.style.setProperty("--charge", String(p));
    },
    [variant],
  );

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const release = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    stopRaf();
    const btn = btnRef.current;
    if (btn) delete btn.dataset.holding;
    // Плавний відкат: вмикаємо transition лише на час повернення
    const ease = "0.3s cubic-bezier(0.22, 1, 0.36, 1)";
    if (ringRef.current) ringRef.current.style.transition = `stroke-dashoffset ${ease}`;
    if (fillRef.current) fillRef.current.style.transition = `transform ${ease}`;
    paint(0);
  }, [paint, stopRaf]);

  const finish = useCallback(() => {
    holdingRef.current = false;
    stopRaf();
    firedAtRef.current = performance.now();
    const btn = btnRef.current;
    if (btn) {
      delete btn.dataset.holding;
      btn.style.transform = "";
      // перезапуск CSS-анімації пульсу
      btn.dataset.pulse = "false";
      void btn.offsetWidth;
      btn.dataset.pulse = "true";
    }
    paint(1);
    if (btn) btn.style.transform = "";
    // Розряд: зарядка гасне, по краях спалахує зелений «виконано»
    const glow = glowRef.current;
    if (glow) {
      glow.style.setProperty("--charge", "0");
      glow.dataset.burst = "false";
      void glow.offsetWidth;
      glow.dataset.burst = "true";
      // Перезбройка: таймер попередньої кнопки не має зняти спалах, що щойно почався вдруге
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      burstTimerRef.current = setTimeout(() => delete glow.dataset.burst, 900);
    }
    vibrate(HAPTIC.complete);
    onComplete();
  }, [onComplete, paint, stopRaf]);

  const begin = useCallback(() => {
    if (disabled || completed || holdingRef.current) return;
    holdingRef.current = true;
    startRef.current = performance.now();
    glowRef.current = document.getElementById("charge-glow");
    const btn = btnRef.current;
    if (btn) {
      btn.dataset.holding = "true";
      btn.dataset.pulse = "false";
    }
    // На час утримання transition вимкнено — інакше кільце відставало б від пальця
    if (ringRef.current) ringRef.current.style.transition = "none";
    if (fillRef.current) fillRef.current.style.transition = "none";
    vibrate(HAPTIC.holdStart);

    // rAF-цикл — локальна функція: так вона може безпечно посилатись сама на себе
    const loop = (now: number) => {
      if (!holdingRef.current) return;
      const p = Math.min(Math.max((now - startRef.current) / holdMs, 0), 1);
      paint(p);
      if (p >= 1) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [completed, disabled, finish, holdMs, paint]);

  // Розмонтування посеред утримання не має лишати rAF-цикл
  useEffect(
    () => () => {
      stopRaf();
      glowRef.current?.style.setProperty("--charge", "0");
    },
    [stopRaf],
  );

  // Якщо стан змінили ззовні (скасування) — прибираємо залишки інлайн-стилів
  useEffect(() => {
    if (!completed) {
      if (ringRef.current) ringRef.current.style.transition = "none";
      paint(0);
    }
  }, [completed, paint]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    begin();
  };

  // На iOS дотик неявно «захоплюється» елементом і pointerleave не приходить, поки палець
  // не відпущено — тож «з'їхав пальцем» перевіряємо самі.
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!holdingRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < r.left - SLOP_PX ||
      e.clientX > r.right + SLOP_PX ||
      e.clientY < r.top - SLOP_PX ||
      e.clientY > r.bottom + SLOP_PX
    ) {
      release();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      if (completed) return; // скасування — через click
      e.preventDefault();
      begin();
    }
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") release();
  };

  const onClick = () => {
    if (!completed || !onUndo) return;
    if (performance.now() - firedAtRef.current < CLICK_GUARD_MS) return; // «хвіст» щойно завершеного утримання
    vibrate(HAPTIC.undo);
    onUndo();
  };

  const isBar = variant === "bar";

  return (
    <button
      ref={btnRef}
      type="button"
      aria-label={completed ? `${doneLabel ?? label}. Натисніть, щоб скасувати` : `Затисніть, щоб завершити: ${label}`}
      aria-pressed={completed}
      disabled={disabled}
      data-done={completed}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onPointerMove={onPointerMove}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onClick={onClick}
      className={cn(
        "hold-btn border",
        isBar
          ? "h-14 w-full overflow-hidden rounded-2xl text-sm font-bold"
          : cn("shrink-0 rounded-2xl", size === "md" ? "h-10 w-10" : "h-12 w-12"),
        completed
          ? "border-mint/50 bg-mint/15 text-mint"
          : isBar
            ? "border-volt/40 bg-surface-2 text-white hover:border-volt/70"
            : "border-white/10 bg-surface-2 text-gray-300 hover:border-white/25",
        disabled && "opacity-50",
        className,
      )}
    >
      {isBar ? (
        <>
          {/* Лінійний прогрес-бар утримання */}
          <span
            ref={fillRef}
            aria-hidden
            className="absolute inset-0 origin-left rounded-[inherit]"
            style={{ transform: `scaleX(${completed ? 1 : 0})`, background: completed ? "rgba(76,232,146,0.2)" : `${accent}40` }}
          />
          <span className="relative z-10 flex items-center justify-center gap-2.5">
            {/* Фіксований слот 20×20: «порожній чекбокс» у спокої → галочка після завершення */}
            <span className={cn("relative h-5 w-5 shrink-0", !completed && "text-volt")} aria-hidden>
              <span className="hold-idle-glyph absolute inset-[3px] rounded-[4px] border-2 border-current" />
              <svg viewBox="0 0 24 24" className="absolute inset-0 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path className="hold-check-path" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span>{completed ? (doneLabel ?? label) : label}</span>
          </span>
        </>
      ) : (
        <>
          <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 48 48" aria-hidden>
            <circle cx="24" cy="24" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
            <circle
              ref={ringRef}
              cx="24"
              cy="24"
              r={R}
              fill="none"
              stroke={completed ? "#4CE892" : accent}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              style={{ strokeDashoffset: completed ? 0 : CIRC }}
            />
          </svg>
          {/* Спокійний «глиф» до виконання: порожній чекбокс, що трансформується в галочку */}
          <span className="hold-idle-glyph pointer-events-none absolute h-3 w-3 rounded-[4px] border-2 border-current opacity-60" aria-hidden />
          <svg viewBox="0 0 24 24" className="pointer-events-none relative z-10 h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path className="hold-check-path" d="M5 13l4 4L19 7" />
          </svg>
        </>
      )}
    </button>
  );
}
