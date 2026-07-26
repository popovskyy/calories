"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, UtensilsCrossed } from "lucide-react";
import { ThinkingLine } from "@/components/ui/ThinkingLine";

/*
 * Фрази — константи рівня модуля: ThinkingLine перезапускає лічильник, якщо
 * масив приходить новим посиланням щорендера.
 */
const PHOTO_PHRASES = [
  "Роздивляємось фото",
  "Впізнаємо страви",
  "Прикидаємо розмір порції",
  "Рахуємо білки, жири, вуглеводи",
  "Майже готово",
];

const TEXT_PHRASES = [
  "Читаємо опис",
  "Розбираємо на інгредієнти",
  "Прикидаємо ваги",
  "Рахуємо білки, жири, вуглеводи",
  "Майже готово",
];

const MACROS = [
  { label: "Білки", color: "var(--color-macro-protein)", radius: 62, dur: 3 },
  { label: "Жири", color: "var(--color-macro-fats)", radius: 46, dur: 4.1 },
  { label: "Вуглеводи", color: "var(--color-macro-carbs)", radius: 73, dur: 5.2 },
] as const;

/** Висота «сцени» очікування. Нижче — і сканер/орбіта читаються як смужка. */
const STAGE = 216;

/**
 * Стан очікування відповіді ШІ по прийому їжі.
 *
 * Форма картки збігається з AiResultCard, тож коли приходить результат,
 * блок не «перестрибує», а ніби доповнюється змістом. Кожна частина показує
 * саме те, що станеться на її місці: сканер по фото → цифра ккал → макроси.
 *
 * shrink-0 на корені обовʼязковий: .app-scroll — це flex-колонка, а флекс
 * стискає елементи ще до того, як увімкнеться прокрутка. Без нього картку
 * сплющує, а overflow-hidden зрізає все нижче сцени.
 */
export function MealAnalyzeLoader({ preview }: { preview?: string | null }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[18px]"
      style={{ border: "1px solid var(--color-accent-800)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="spark-pulse text-[var(--color-accent)]" />
          <span className="text-[15px] font-semibold text-[var(--color-accent-200)]">
            {preview ? "Аналізуємо фото" : "Аналізуємо опис"}
          </span>
        </div>
        <span className="tag tag-accent">Gemini</span>
      </div>

      <div className="mt-3.5">
        {preview ? <ScanStage preview={preview} /> : <OrbitStage />}
      </div>

      <ThinkingLine
        phrases={preview ? PHOTO_PHRASES : TEXT_PHRASES}
        className="mt-3.5"
      />
      <div className="ribbon mx-auto mt-2 w-2/3" />

      <div className="mt-4 flex flex-col items-center">
        <ScrambleCalories />
        <div className="mt-1 text-[14px] text-[var(--color-muted3)]">ккал усього</div>
      </div>

      <div className="mt-4 flex gap-2.5">
        {MACROS.map((m, i) => (
          <div
            key={m.label}
            className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-tile)] p-2.5"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-[var(--color-muted3)]">{m.label}</span>
              <span className="h-[9px] w-6 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--color-text)_10%,transparent)]" />
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)]">
              <div
                className="bar-breathe h-full w-full rounded-[var(--radius-pill)]"
                style={{ background: m.color, animationDelay: `${i * 0.22}s` }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/** Фото під «сканером»: рамка наведення, сітка й промінь, що йде згори вниз. */
function ScanStage({ preview }: { preview: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-tile)]"
      style={{ height: STAGE }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview}
        alt=""
        aria-hidden
        className="h-full w-full object-cover opacity-70 saturate-[0.85]"
      />
      <div className="scan-grid absolute inset-0" />
      <div className="scan-beam" />
      {CORNERS.map((c) => (
        <span
          key={c.key}
          className="absolute h-5 w-5 border-[var(--color-accent-200)]"
          style={{ ...c.pos, ...c.border, opacity: 0.85 }}
        />
      ))}
    </div>
  );
}

const CORNERS = [
  {
    key: "tl",
    pos: { top: 10, left: 10 },
    border: { borderTopWidth: 2, borderLeftWidth: 2 },
  },
  {
    key: "tr",
    pos: { top: 10, right: 10 },
    border: { borderTopWidth: 2, borderRightWidth: 2 },
  },
  {
    key: "bl",
    pos: { bottom: 10, left: 10 },
    border: { borderBottomWidth: 2, borderLeftWidth: 2 },
  },
  {
    key: "br",
    pos: { bottom: 10, right: 10 },
    border: { borderBottomWidth: 2, borderRightWidth: 2 },
  },
] as const;

/** Без фото сканувати нічого — тож макроси «кружляють» навколо тарілки. */
function OrbitStage() {
  return (
    <div
      className="relative mx-auto"
      style={{ height: STAGE, width: STAGE }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 20%, transparent) 0%, transparent 62%)",
        }}
      />
      {MACROS.map((m, i) => (
        <div
          key={m.label}
          className="orbit"
          style={{ animationDuration: `${m.dur}s`, animationDelay: `${-i * 0.9}s` }}
        >
          <span
            className="absolute left-1/2 top-1/2 block h-2.5 w-2.5 rounded-full"
            style={{
              background: m.color,
              transform: `translate(-50%, -50%) translateY(-${m.radius}px)`,
              boxShadow: `0 0 10px ${m.color}`,
            }}
          />
        </div>
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <UtensilsCrossed
          size={46}
          className="spark-pulse text-[var(--color-accent-200)]"
        />
      </div>
    </div>
  );
}

/**
 * Цифра «перебирає» значення, поки ШІ рахує, і в тому ж місці зʼявиться
 * справжня. tabular-nums + фіксована ширина — щоб картку не смикало.
 */
function ScrambleCalories() {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(420);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setValue(120 + Math.floor(Math.random() * 900));
    }, 90);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="text-[44px] font-semibold leading-none tabular-nums text-[var(--color-muted2)]">
      {reduce ? "—" : value}
    </div>
  );
}
