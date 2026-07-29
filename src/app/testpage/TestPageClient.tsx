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
import {
  ProgressRing,
  OVER_TONES,
  type OverTone,
} from "@/components/ProgressRing";
import { cn } from "@/lib/cn";
import type { Goal } from "@/lib/calories";

type LabTab = "weekly" | "ring";
type RingScenario = "under" | "inTarget" | "over";

const RING_SCENARIOS: {
  id: RingScenario;
  label: string;
  consumed: number;
  target: number;
}[] = [
  { id: "under", label: "Недобір", consumed: 980, target: 1900 },
  { id: "inTarget", label: "У нормі", consumed: 1850, target: 1900 },
  { id: "over", label: "Перебір", consumed: 2350, target: 1900 },
];

export function TestPageClient() {
  const [tab, setTab] = useState<LabTab>("ring");

  return (
    <div className="mx-auto flex h-dvh max-w-[420px] flex-col gap-5 overflow-y-auto bg-[var(--color-bg)] px-[18px] py-4 text-[var(--color-text)]">
      <header className="flex items-center gap-2">
        <Link href="/" className="icon-btn" aria-label="Назад">
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-semibold">testpage · lab</h1>
          <p className="text-[13px] text-[var(--color-muted3)]">
            лише development
          </p>
        </div>
      </header>

      <div className="flex gap-2">
        {(
          [
            ["ring", "Кільце ккал"],
            ["weekly", "Звіт тижня"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "btn btn-sm flex-1",
              tab === id ? "btn-primary" : "btn-ghost",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ring" ? <RingLab /> : <WeeklyLab />}
    </div>
  );
}

function RingLab() {
  const [scenario, setScenario] = useState<RingScenario>("over");
  const [overTone, setOverTone] = useState<OverTone>("magenta");
  const [flare, setFlare] = useState(true);
  const [goal] = useState<Goal>("maintain");

  const sample = RING_SCENARIOS.find((s) => s.id === scenario)!;

  return (
    <>
      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl !mb-0">Стан дня</span>
        <div className="flex flex-wrap gap-2">
          {RING_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={
                scenario === s.id ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"
              }
              onClick={() => setScenario(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl !mb-0">Колір перебору</span>
        <div className="flex flex-wrap gap-2">
          {OVER_TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(
                "btn btn-sm gap-2",
                overTone === t.id ? "btn-primary" : "btn-ghost",
              )}
              onClick={() => setOverTone(t.id)}
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                  boxShadow: `0 0 8px ${t.glow}`,
                }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl !mb-0">Анімація Flare</span>
        <button
          type="button"
          className={flare ? "btn btn-primary btn-sm w-fit" : "btn btn-ghost btn-sm w-fit"}
          onClick={() => setFlare((f) => !f)}
        >
          {flare ? "Flare увімкнено" : "Flare вимкнено"}
        </button>
      </section>

      <section className="mcard flex flex-col items-center gap-2 p-[18px]">
        <span className="lbl !mb-0 self-start">Прев'ю</span>
        <ProgressRing
          consumed={sample.consumed}
          target={sample.target}
          goal={goal}
          motion={flare ? "flare" : "none"}
          overTone={overTone}
        />
        <p className="text-center text-[12px] text-[var(--color-muted3)]">
          {sample.consumed} / {sample.target} · {overTone} · {scenario}
        </p>
      </section>

      <section className="mcard flex flex-col gap-3 p-[18px]">
        <span className="lbl !mb-0">Усі кольори перебору</span>
        <div className="flex flex-col items-center gap-6">
          {OVER_TONES.map((t) => (
            <div key={t.id} className="flex flex-col items-center gap-1">
              <span className="text-[12px] font-semibold text-[var(--color-muted2)]">
                {t.label}
              </span>
              <ProgressRing
                consumed={2350}
                target={1900}
                goal={goal}
                overTone={t.id}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function WeeklyLab() {
  const [phase, setPhase] = useState<WeeklyFeedbackPhase>("collecting");
  const [tone, setTone] = useState<WeeklyFeedbackTone>("emerald");
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
    <>
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
    </>
  );
}
