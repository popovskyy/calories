"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import {
  WEEKLY_MOTIONS,
  WEEKLY_TONES,
  WeeklyFeedbackButton,
  type WeeklyFeedbackMotion,
  type WeeklyFeedbackPhase,
  type WeeklyFeedbackTone,
} from "@/components/WeeklyFeedbackButton";
import { cn } from "@/lib/cn";

export function TestPageClient() {
  const [phase, setPhase] = useState<WeeklyFeedbackPhase>("collecting");
  const [tone, setTone] = useState<WeeklyFeedbackTone>("emerald");
  /** null = як у проді: collecting→scan, ready→breathe */
  const [motion, setMotion] = useState<WeeklyFeedbackMotion | "prod">("prod");
  const [clicks, setClicks] = useState(0);

  const swatch = useMemo(
    () => WEEKLY_TONES.find((t) => t.id === tone)?.swatch ?? "#3db89a",
    [tone],
  );

  const resolvedMotion: WeeklyFeedbackMotion | undefined =
    motion === "prod" ? undefined : motion;

  const motionLabel =
    motion === "prod"
      ? phase === "collecting"
        ? "scan (прод)"
        : "breathe (прод)"
      : motion;

  const copy =
    phase === "collecting"
      ? "Звіт готується… Стане доступним після 15:00 — коли тиждень вже майже закритий."
      : phase === "ready"
        ? "Тиждень зібрано. Готовий дізнатись вердикт від ШІ-дієтолога?"
        : "Готуємо звіт…";

  return (
    <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col gap-5 bg-[var(--color-bg)] px-[18px] py-4 text-[var(--color-text)]">
      <header className="flex items-center gap-2">
        <Link href="/" className="icon-btn" aria-label="Назад">
          <ChevronLeft size={18} />
        </Link>
        <div>
          <h1 className="text-[18px] font-semibold">testpage · звіт тижня</h1>
          <p className="text-[13px] text-[var(--color-muted3)]">
            прод: смарагд · scan → breathe
          </p>
        </div>
      </header>

      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl !mb-0">Стан</span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["collecting", "До 15:00"],
              ["ready", "Після 15:00"],
              ["pending", "Генеруємо"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                phase === value ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"
              }
              onClick={() => setPhase(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl !mb-0">Колір</span>
        <div className="flex flex-wrap gap-2">
          {WEEKLY_TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "btn btn-sm gap-2",
                tone === t.id ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => setTone(t.id)}
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{
                  background: t.swatch,
                  boxShadow: `0 0 8px ${t.swatch}88`,
                }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl !mb-0">Анімація</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={
              motion === "prod" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"
            }
            onClick={() => setMotion("prod")}
          >
            Прод (scan→breathe)
          </button>
          {WEEKLY_MOTIONS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={
                motion === m.id ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"
              }
              onClick={() => setMotion(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mcard flex flex-col gap-3 p-[18px]">
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]"
            style={{
              background: `color-mix(in srgb, ${swatch} 16%, transparent)`,
              color: swatch,
            }}
          >
            <Sparkles size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="lbl !mb-0">Звіт тижня</span>
            <p className="mt-1 text-[14px] leading-snug text-[var(--color-muted)]">
              {copy}
            </p>
          </div>
        </div>

        <WeeklyFeedbackButton
          phase={phase}
          tone={tone}
          motion={resolvedMotion}
          onClick={() => {
            setClicks((n) => n + 1);
            setPhase("pending");
            window.setTimeout(() => setPhase("ready"), 1600);
          }}
        />

        <p className="text-center text-[12px] text-[var(--color-muted3)]">
          {tone} · {motionLabel} · кліків: {clicks}
        </p>
      </section>

      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl !mb-0">
          Обидва стани · {tone} · {motion === "prod" ? "прод" : motion}
        </span>
        <WeeklyFeedbackButton
          phase="collecting"
          tone={tone}
          motion={motion === "prod" ? undefined : motion}
        />
        <WeeklyFeedbackButton
          phase="ready"
          tone={tone}
          motion={motion === "prod" ? undefined : motion}
          onClick={() => setClicks((n) => n + 1)}
        />
      </section>
    </div>
  );
}
