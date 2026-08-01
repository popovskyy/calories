"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { CampDeer } from "@/components/ambient/CampDeer";
import { CampFirGrove } from "@/components/ambient/CampFirGrove";
import { CampLogVisual } from "@/components/ambient/CampLogVisual";
import { CampTree } from "@/components/ambient/CampTree";
import type { HeroProps } from "@/components/hero/CalorieHero";
import { DURATION_SHEET, EASE_OUT } from "@/lib/motion";
import { HERO_HEAT_SIZE_SCALE, heroHeatFromCalories } from "@/lib/hero-heat";
import { claimRitualSound, playFireBurst, playFireSizzle, playLogToss } from "@/lib/sfx";
import { haptic } from "@/lib/haptics";
import { useAppStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/hooks/useQueries";

const FLAME_RADIUS = "50% 50% 46% 46% / 66% 66% 34% 34%";
const TREE_TOSS_MS = 2600;
/** Колода з дерева лише трохи підживлює, якщо вогонь ще живий. */
const FIRE_SCALE_PER_LOG = 0.06;
const FIRE_SCALE_LOG_CAP = 0.18;

/**
 * Палітра вогню. Куплена рамка «Неон» не просто ховалась у лісовій темі —
 * Campfire узагалі не читав frame, тож преміум-тема з'їдала покупку. Тепер
 * неон перефарбовує саме вогнище: холодне ціано-маджентове полум'я.
 */
const FIRE = {
  warm: {
    big: "linear-gradient(#ffb347,#ff6a1f)",
    mid: "linear-gradient(#fff3c4,#ffd166)",
    tip: "#ffe9a8",
    side: "linear-gradient(#ff9c3a,#e0561a)",
    glow: "rgba(255,138,61,.34)",
    halo: "rgba(255,138,61,.55)",
    spark: ["#ffd166", "#fff3c4", "#ffb347"],
  },
  neon: {
    big: "linear-gradient(#00f0ff,#7b61ff)",
    mid: "linear-gradient(#eafeff,#00f0ff)",
    tip: "#eafeff",
    side: "linear-gradient(#ff2bd6,#7b61ff)",
    glow: "rgba(0,240,255,.34)",
    halo: "rgba(0,240,255,.6)",
    spark: ["#00f0ff", "#eafeff", "#ff2bd6"],
  },
} as const;

/**
 * Forest-герой: вогнище замість кільця прогресу.
 *
 * Ритуал «підкидання дровини» запускається сигналом перерахунку зі стора
 * (додали / змінили / видалили запис), а не тапом по «+». Сигнал переживає
 * навігацію, тож ритуал відпрацює й тоді, коли користувач збереже їжу на
 * /add і повернеться на Огляд лише за кілька екранів.
 *
 * Окремо — ambient-дерево: рубаєш → кидаєш колоди → легкий бонус до полум'я,
 * якщо вогонь ще не згасає від перебору калорій.
 */
export function Campfire({ consumed, target, frame }: HeroProps) {
  const reduce = useReducedMotion();
  const remaining = target - consumed;
  const over = remaining < 0;
  const fire = frame === "neon" ? FIRE.neon : FIRE.warm;
  const heat = heroHeatFromCalories(consumed, target);

  const recalc = useAppStore((s) => s.recalc);
  const consumeRecalc = useAppStore((s) => s.consumeRecalc);
  const { user } = useCurrentUser();
  const pack = user?.soundpack ?? "default";
  const packRef = useRef(pack);
  useEffect(() => {
    packRef.current = pack;
  }, [pack]);

  /*
   * Стану ритуалу в React немає взагалі: увесь таймлайн (дровина .85s, спалах
   * на .56s, втеча оленя, згасання іскор) — це CSS-анімації з forwards, а
   * `key={recalc.id}` перезапускає їх на кожному новому сигналі. React лишає
   * собі тільки те, що CSS не вміє: програти звук і погасити сигнал у кінці.
   */
  const active = recalc !== null;
  const ritualKey = recalc?.id ?? "idle";

  const [logsFed, setLogsFed] = useState(0);
  const [treeTossKey, setTreeTossKey] = useState<number | null>(null);
  const [treeTossSide, setTreeTossSide] = useState<"left" | "right">("right");
  const [pokeKey, setPokeKey] = useState(0);
  const treeTossing = treeTossKey !== null;

  // База від size; колоди — дрібний бонус, поки не dying/out
  const logBoost =
    heat.extinguished || heat.dying
      ? 0
      : Math.min(logsFed * FIRE_SCALE_PER_LOG, FIRE_SCALE_LOG_CAP);
  const baseScale =
    heat.size === "out" ? 0 : HERO_HEAT_SIZE_SCALE[heat.size];
  const fireScale = heat.extinguished ? 0 : baseScale + logBoost;
  const fireOpacity = heat.extinguished ? 0 : 0.4 + heat.intensity * 0.6;
  // Поки не out — полум'я завжди з CSS flicker. Іскри — не на small.
  const alive = !heat.extinguished;
  const showSparks = alive && heat.size !== "small" && !reduce;
  const flaring = alive && heat.size !== "small" && (active || treeTossing);

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("uk-UA"));

  useEffect(() => {
    const a = animate(count, consumed, {
      duration: reduce ? 0 : DURATION_SHEET,
      ease: EASE_OUT,
    });
    return () => a.stop();
  }, [consumed, count, reduce]);

  useEffect(() => {
    if (!recalc) return;
    const timers: number[] = [];
    if (claimRitualSound(recalc.id)) {
      playLogToss(packRef.current);
      // Рокіт жару, коли дровина долітає (~0.5s у logToss)
      timers.push(window.setTimeout(() => playFireBurst(), 480));
    }
    timers.push(window.setTimeout(consumeRecalc, 2600));
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [recalc, consumeRecalc]);

  useEffect(() => {
    if (treeTossKey === null) return;
    const t = window.setTimeout(() => setTreeTossKey(null), TREE_TOSS_MS);
    return () => window.clearTimeout(t);
  }, [treeTossKey]);

  const onTreeLogToss = useCallback((side: "left" | "right") => {
    playLogToss(packRef.current);
    window.setTimeout(() => playFireBurst(), 380);
    setLogsFed((n) => n + 1);
    setTreeTossSide(side);
    setTreeTossKey(Date.now());
  }, []);

  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize = digits >= 5 ? "text-[42px]" : digits >= 4 ? "text-[52px]" : "text-[62px]";

  return (
    <div className="relative my-1 h-[250px] w-full shrink-0 overflow-x-visible overflow-y-hidden">
      {/* цифри — найвищий шар */}
      <div className="pointer-events-none absolute inset-x-0 top-2.5 z-[3] flex flex-col items-center gap-px">
        <motion.div
          className={`${numSize} leading-none text-white`}
          style={{
            fontFamily: "var(--font-display)",
            textShadow: `0 0 26px ${fire.halo}`,
          }}
        >
          {rounded}
        </motion.div>
        <div className="text-[12px] text-[var(--color-muted)]">
          із {target.toLocaleString("uk-UA")} ккал
        </div>
        <div
          className="text-[13px] font-black"
          style={{ color: over ? "var(--color-red)" : "var(--color-green)" }}
        >
          {over
            ? `Перебір ${Math.abs(remaining).toLocaleString("uk-UA")}`
            : `Ще ${remaining.toLocaleString("uk-UA")}`}
        </div>
      </div>

      {/* ореол — scale від size; пульс через CSS-клас (не inline animation) */}
      {alive ? (
        <div
          className="fire-glow fire-glow-live pointer-events-none absolute -bottom-1 left-1/2 h-[120px] w-[160px]"
          style={{
            background:
              `radial-gradient(50% 60% at 50% 80%, ${fire.glow}, transparent 70%)`,
            transform: `translateX(-50%) scale(${fireScale})`,
            transformOrigin: "50% 100%",
            opacity: 0.25 + heat.intensity * 0.7,
          }}
        />
      ) : null}

      {/* попередження з першої зайвої ккал — полум'я при цьому ще горить */}
      {heat.warn ? (
        <div
          className="pointer-events-none absolute bottom-[118px] left-1/2 z-[4] w-[90%] -translate-x-1/2 text-center text-[11px] font-bold leading-tight"
          style={{
            color: "#ffc9a8",
            textShadow: "0 1px 8px rgba(0,0,0,.75)",
          }}
        >
          Обережно — вогонь може потухнути
        </div>
      ) : null}
      {heat.extinguished ? (
        <div
          className="pointer-events-none absolute bottom-[118px] left-1/2 z-[4] w-[90%] -translate-x-1/2 text-center text-[11px] font-bold leading-tight"
          style={{
            color: "#c4b8a8",
            textShadow: "0 1px 8px rgba(0,0,0,.75)",
          }}
        >
          Вогонь згас від перебору
        </div>
      ) : null}

      {/* ялинки біля оленя — ростуть у лівому коридорі, не затуляють вогонь */}
      <CampFirGrove />

      {/* олень: ритуал / хаос при згаслому вогні */}
      <CampDeer
        ritualActive={active || treeTossing}
        calorieChaos={heat.extinguished}
      />

      {/* сосни з обох боків вогнища */}
      <CampTree side="left" onLogToss={() => onTreeLogToss("left")} />
      <CampTree side="right" onLogToss={() => onTreeLogToss("right")} />

      {/* вогонь + дрова + каміння — вище кострище під tall flame; тап — шкварчання + poke */}
      <div
        className="absolute bottom-0 left-1/2 z-[2] h-[150px] w-[150px] cursor-pointer touch-manipulation"
        style={{ transform: "translateX(-50%)", WebkitTapHighlightColor: "transparent" }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (heat.extinguished) {
            haptic("click");
            return;
          }
          playFireSizzle();
          haptic("click");
          if (!reduce) setPokeKey((k) => k + 1);
        }}
      >
        {/* полум'я — ховаємо лише при out; flicker завжди через CSS-класи */}
        {alive ? (
          <div
            className="absolute inset-0"
            style={{
              transform: `scale(${fireScale})`,
              transformOrigin: "50% 100%",
              opacity: fireOpacity,
            }}
          >
            <div
              key={`flames-${ritualKey}-${treeTossKey ?? "idle"}`}
              className="absolute inset-0"
              style={{
                transformOrigin: "50% 100%",
                animation: flaring ? "fireFlare 2.6s forwards" : undefined,
              }}
            >
              <div
                key={`poke-${pokeKey}`}
                className="absolute inset-0"
                style={{
                  transformOrigin: "50% 100%",
                  animation:
                    pokeKey > 0 && !flaring && !reduce && heat.size !== "small"
                      ? "firePoke 0.38s cubic-bezier(0.22, 1, 0.36, 1)"
                      : undefined,
                }}
              >
                <div
                  className="flame flame-big absolute bottom-[12px] left-1/2 -ml-[16px] h-[100px] w-[32px]"
                  style={{
                    borderRadius: FLAME_RADIUS,
                    background: fire.big,
                    filter: "blur(.35px)",
                  }}
                />
                <div
                  className="flame flame-mid absolute bottom-[14px] left-1/2 -ml-[9px] h-[68px] w-[18px]"
                  style={{
                    borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                    background: fire.mid,
                  }}
                />
                <div
                  className="flame flame-tip absolute bottom-[88px] left-1/2 -ml-[4px] h-5 w-2 rounded-full"
                  style={{
                    background: fire.tip,
                    filter: "blur(1px)",
                  }}
                />
                <div
                  className="flame flame-side absolute bottom-[11px] left-[32%] h-[44px] w-[15px]"
                  style={{
                    borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                    background: fire.side,
                    transformOrigin: "50% 100%",
                  }}
                />
                <div
                  className="flame flame-side-alt absolute bottom-[11px] left-[58%] h-[38px] w-[13px]"
                  style={{
                    borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                    background: fire.side,
                    transformOrigin: "50% 100%",
                  }}
                />
                <div
                  className="flame flame-mid-alt absolute bottom-[13px] left-[44%] h-[56px] w-[12px]"
                  style={{
                    borderRadius: "50% 50% 45% 45% / 68% 68% 32% 32%",
                    background: fire.mid,
                    opacity: 0.75,
                    transformOrigin: "50% 100%",
                  }}
                />

                {showSparks ? (
                  <>
                    <div
                      className="fire-spark absolute bottom-14 left-1/2 h-1 w-1 rounded-full"
                      style={{
                        background: fire.spark[0],
                        boxShadow: `0 0 6px ${fire.spark[0]}`,
                        ["--ex" as string]: "-6px",
                        animation: "emberRise 1.45s ease-out infinite",
                      }}
                    />
                    <div
                      className="fire-spark absolute bottom-12 left-[42%] h-[3px] w-[3px] rounded-full"
                      style={{
                        background: fire.spark[1],
                        boxShadow: `0 0 6px ${fire.spark[1]}`,
                        ["--ex" as string]: "10px",
                        animation: "emberRise 1.7s ease-out .35s infinite",
                      }}
                    />
                    <div
                      className="fire-spark absolute bottom-16 left-[56%] h-0.5 w-0.5 rounded-full"
                      style={{
                        background: fire.spark[2],
                        boxShadow: `0 0 5px ${fire.spark[2]}`,
                        ["--ex" as string]: "-12px",
                        animation: "emberRise 1.25s ease-out .7s infinite",
                      }}
                    />
                    <div
                      className="fire-spark absolute bottom-[50px] left-[48%] h-[2px] w-[2px] rounded-full"
                      style={{
                        background: fire.spark[0],
                        boxShadow: `0 0 5px ${fire.spark[0]}`,
                        ["--ex" as string]: "8px",
                        animation: "emberRise 1.55s ease-out 1.05s infinite",
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          /* холодне вугілля замість полум'я */
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div
              className="absolute bottom-[18px] left-1/2 h-3 w-10 -translate-x-1/2 rounded-full"
              style={{
                background: "radial-gradient(circle, #3a2a22 0%, #1a120e 70%)",
                boxShadow: "0 0 8px rgba(40,20,10,.4)",
              }}
            />
            <div
              className="absolute bottom-[22px] left-[42%] h-2 w-2 rounded-full opacity-40"
              style={{ background: "#2a1c14" }}
            />
            <div
              className="absolute bottom-[20px] left-[55%] h-1.5 w-2.5 rounded-full opacity-35"
              style={{ background: "#241810" }}
            />
          </div>
        )}

        {/* дрова — компактніші */}
        <div className="absolute bottom-0 left-1/2 -ml-[58px] h-8 w-[116px]">
          <div
            className="absolute bottom-1 left-1 h-3.5 w-[80px] rounded-[8px]"
            style={{
              background: "linear-gradient(#a97a4c,#6b4626)",
              transform: "rotate(-10deg)",
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,.28)",
            }}
          />
          <div
            className="absolute bottom-1.5 right-0.5 h-3.5 w-[76px] rounded-[8px]"
            style={{
              background: "linear-gradient(#9a6d42,#5d3c20)",
              transform: "rotate(12deg)",
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,.28)",
            }}
          />
          <div
            className="absolute bottom-0 left-[18px] h-3 w-[80px] rounded-[7px]"
            style={{
              background: "linear-gradient(#8a6039,#4d3220)",
              transform: "rotate(-2deg)",
            }}
          />
          <div
            className="absolute bottom-2.5 left-[36px] h-4 w-4 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 40%, #ffd0a0, #a97a4c)",
              boxShadow: "inset 0 0 0 2px #6b4626",
            }}
          />
          <div
            className="absolute bottom-3 right-8 h-3.5 w-3.5 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 40%, #ffd0a0, #9a6d42)",
              boxShadow: "inset 0 0 0 2px #5d3c20",
            }}
          />
        </div>

        {/* каміння — щільніше кільце */}
        <div className="absolute -bottom-1.5 left-1/2 -ml-[70px] h-7 w-[140px]">
          <div
            className="absolute bottom-0 left-0 h-5 w-6"
            style={{
              borderRadius: "11px 10px 6px 6px",
              background: "linear-gradient(#5b6660,#39423e)",
            }}
          />
          <div
            className="absolute bottom-0 left-[24px] h-4 w-[22px] rounded-lg"
            style={{ background: "linear-gradient(#4e5853,#333a37)" }}
          />
          <div
            className="absolute -bottom-0.5 left-[50px] h-[18px] w-8 rounded-[10px]"
            style={{ background: "linear-gradient(#5b6660,#39423e)" }}
          />
          <div
            className="absolute bottom-0 right-[22px] h-4 w-[22px] rounded-lg"
            style={{ background: "linear-gradient(#4e5853,#333a37)" }}
          />
          <div
            className="absolute bottom-0 right-0 h-5 w-6"
            style={{
              borderRadius: "10px 11px 6px 6px",
              background: "linear-gradient(#5b6660,#39423e)",
            }}
          />
        </div>
      </div>

      {/* meal-ритуал: коротка колода летить у жар */}
      {active ? (
        <div key={`toss-${ritualKey}`}>
          <div
            className="toss-log absolute bottom-[28px] left-1/2 z-[2] -ml-[24px] h-[16px] w-[48px]"
            style={{
              animation: "logToss .75s cubic-bezier(.3,.1,.5,1) forwards",
            }}
          >
            <CampLogVisual className="h-full w-full" />
          </div>
          <div
            className="fire-spark absolute bottom-16 left-1/2 z-[2] h-1.5 w-1.5 rounded-full"
            style={{
              background: fire.spark[0],
              boxShadow: `0 0 10px ${fire.spark[0]}`,
              animation: "sparkBurst 1.1s ease-out .42s forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-16 left-[46%] z-[2] h-[5px] w-[5px] rounded-full"
            style={{
              background: fire.spark[2],
              boxShadow: `0 0 10px ${fire.spark[2]}`,
              ["--dx" as string]: "-14px",
              animation: "sparkBurst 1.2s ease-out .48s forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-[70px] left-[54%] z-[2] h-1 w-1 rounded-full"
            style={{
              background: fire.spark[1],
              boxShadow: `0 0 10px ${fire.spark[1]}`,
              ["--dx" as string]: "12px",
              animation: "sparkBurst 1.1s ease-out .55s forwards",
            }}
          />
        </div>
      ) : null}

      {/* колода з дерева — коротка дуга зліва/справа */}
      {treeTossing && !reduce ? (
        <div key={`tree-toss-${treeTossKey}`}>
          <div
            className="toss-log absolute bottom-[28px] left-1/2 z-[2] -ml-[22px] h-[15px] w-[44px]"
            style={{
              animation: `${
                treeTossSide === "left" ? "treeLogTossLeft" : "treeLogToss"
              } .65s cubic-bezier(.3,.1,.5,1) forwards`,
            }}
          >
            <CampLogVisual className="h-full w-full" />
          </div>
          <div
            className="fire-spark absolute bottom-16 left-1/2 z-[2] h-1.5 w-1.5 rounded-full"
            style={{
              background: fire.spark[0],
              boxShadow: `0 0 10px ${fire.spark[0]}`,
              animation: "sparkBurst 1s ease-out .32s forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-[68px] left-[54%] z-[2] h-1 w-1 rounded-full"
            style={{
              background: fire.spark[1],
              boxShadow: `0 0 10px ${fire.spark[1]}`,
              ["--dx" as string]: "12px",
              animation: "sparkBurst 1s ease-out .38s forwards",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
