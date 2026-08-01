"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { CampDeer } from "@/components/ambient/CampDeer";
import { CampTree } from "@/components/ambient/CampTree";
import type { HeroProps } from "@/components/hero/CalorieHero";
import { DURATION_SHEET, EASE_OUT } from "@/lib/motion";
import { claimRitualSound, playFireBurst, playLogToss } from "@/lib/sfx";
import { useAppStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/hooks/useQueries";

const FLAME_RADIUS = "50% 50% 46% 46% / 66% 66% 34% 34%";
const TREE_TOSS_MS = 2600;
const FIRE_SCALE_PER_LOG = 0.1;
const FIRE_SCALE_MAX = 1.45;

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
 * Окремо — ambient-дерево: рубаєш → кидаєш колоди → полум'я росте локально,
 * без armRecalc.
 */
export function Campfire({ consumed, target, frame }: HeroProps) {
  const reduce = useReducedMotion();
  const remaining = target - consumed;
  const over = remaining < 0;
  const fire = frame === "neon" ? FIRE.neon : FIRE.warm;

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
  const treeTossing = treeTossKey !== null;
  const fireScale = Math.min(1 + logsFed * FIRE_SCALE_PER_LOG, FIRE_SCALE_MAX);
  const flaring = active || treeTossing;

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

  const onTreeLogToss = useCallback(() => {
    playLogToss(packRef.current);
    window.setTimeout(() => playFireBurst(), 380);
    setLogsFed((n) => n + 1);
    setTreeTossKey(Date.now());
  }, []);

  const digits = String(Math.round(Math.abs(consumed))).length;
  const numSize = digits >= 5 ? "text-[42px]" : digits >= 4 ? "text-[52px]" : "text-[62px]";

  return (
    <div className="relative my-1 h-[250px] w-full shrink-0 overflow-hidden">
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

      {/* ореол — трохи росте разом із підкинутими колодами */}
      <div
        className="fire-glow pointer-events-none absolute -bottom-2.5 left-1/2 h-[150px] w-[230px]"
        style={{
          background:
            `radial-gradient(50% 60% at 50% 80%, ${fire.glow}, transparent 70%)`,
          animation: "fireGlow 3.6s ease-in-out infinite",
          transform: `translateX(-50%) scale(${fireScale})`,
          transformOrigin: "50% 100%",
        }}
      />

      {/* олень біля вогнища — тікає і від meal-ритуалу, і від колоди з дерева */}
      <CampDeer ritualActive={active || treeTossing} />

      {/* сосна праворуч: ріст → рубання → дрова */}
      <CampTree onLogToss={onTreeLogToss} />

      {/* вогонь + дрова + каміння: scale лише на полум'ї, дрова/каміння стоять */}
      <div
        className="absolute bottom-0 left-1/2 z-[2] h-[150px] w-[196px]"
        style={{ transform: "translateX(-50%)" }}
      >
        {/* полум'я — росте з logsFed; flare поверх базового scale */}
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${fireScale})`,
            transformOrigin: "50% 100%",
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
              className="flame absolute bottom-[14px] left-1/2 -ml-[13px] h-[74px] w-[26px]"
              style={{
                borderRadius: FLAME_RADIUS,
                background: fire.big,
                filter: "blur(.4px)",
                animation: "flameBig 1.5s ease-in-out infinite",
              }}
            />
            <div
              className="flame absolute bottom-4 left-1/2 -ml-[7px] h-12 w-[15px]"
              style={{
                borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                background: fire.mid,
                animation: "flameMid 1.1s ease-in-out infinite",
              }}
            />
            <div
              className="flame absolute bottom-[74px] left-1/2 -ml-[4px] h-4 w-2 rounded-full"
              style={{
                background: fire.tip,
                filter: "blur(1px)",
                animation: "flameTip 1.7s ease-in-out infinite",
              }}
            />
            <div
              className="flame absolute bottom-3 left-[38%] h-[34px] w-[14px]"
              style={{
                borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                background: fire.side,
                animation: "flameMid 1.35s ease-in-out .3s infinite",
              }}
            />
            <div
              className="flame absolute bottom-3 left-[58%] h-[30px] w-3"
              style={{
                borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                background: fire.side,
                animation: "flameMid 1.5s ease-in-out .6s infinite",
              }}
            />
          </div>
        </div>

        {/* дрова — фіксований розмір */}
        <div className="absolute bottom-0 left-1/2 -ml-[85px] h-11 w-[170px]">
          <div
            className="absolute bottom-1.5 left-1.5 h-5 w-[118px] rounded-[10px]"
            style={{
              background: "linear-gradient(#a97a4c,#6b4626)",
              transform: "rotate(-9deg)",
              boxShadow: "inset 0 -4px 0 rgba(0,0,0,.28)",
            }}
          />
          <div
            className="absolute bottom-2.5 right-1 h-5 w-[112px] rounded-[10px]"
            style={{
              background: "linear-gradient(#9a6d42,#5d3c20)",
              transform: "rotate(11deg)",
              boxShadow: "inset 0 -4px 0 rgba(0,0,0,.28)",
            }}
          />
          <div
            className="absolute bottom-0 left-[26px] h-[18px] w-[118px] rounded-[9px]"
            style={{
              background: "linear-gradient(#8a6039,#4d3220)",
              transform: "rotate(-3deg)",
            }}
          />
          <div
            className="absolute bottom-4 left-[52px] h-[22px] w-[22px] rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 40%, #ffd0a0, #a97a4c)",
              boxShadow: "inset 0 0 0 3px #6b4626",
            }}
          />
          <div
            className="absolute bottom-5 right-11 h-[18px] w-[18px] rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 40%, #ffd0a0, #9a6d42)",
              boxShadow: "inset 0 0 0 3px #5d3c20",
            }}
          />
        </div>

        {/* каміння по дузі — фіксований розмір */}
        <div className="absolute -bottom-2 left-1/2 -ml-[98px] h-[34px] w-[196px]">
          <div
            className="absolute bottom-0 left-0 h-[26px] w-9"
            style={{
              borderRadius: "14px 12px 8px 8px",
              background: "linear-gradient(#5b6660,#39423e)",
            }}
          />
          <div
            className="absolute -bottom-0.5 left-[34px] h-[22px] w-[30px] rounded-xl"
            style={{ background: "linear-gradient(#4e5853,#333a37)" }}
          />
          <div
            className="absolute -bottom-1 left-[70px] h-6 w-11 rounded-[14px]"
            style={{ background: "linear-gradient(#5b6660,#39423e)" }}
          />
          <div
            className="absolute -bottom-0.5 right-8 h-[22px] w-8 rounded-xl"
            style={{ background: "linear-gradient(#4e5853,#333a37)" }}
          />
          <div
            className="absolute bottom-0 right-0 h-[26px] w-9"
            style={{
              borderRadius: "12px 14px 8px 8px",
              background: "linear-gradient(#5b6660,#39423e)",
            }}
          />
        </div>
      </div>

      {/* meal-ритуал: дровина летить справа згори */}
      {active ? (
        <div key={`toss-${ritualKey}`}>
          <div
            className="toss-log absolute bottom-[34px] left-1/2 z-[2] -ml-[37px] h-[18px] w-[74px] rounded-[9px]"
            style={{
              background: "linear-gradient(#b5844f,#6b4626)",
              boxShadow: "inset 0 -4px 0 rgba(0,0,0,.3)",
              animation: "logToss .85s cubic-bezier(.3,.1,.5,1) forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-20 left-1/2 z-[2] h-1.5 w-1.5 rounded-full"
            style={{
              background: fire.spark[0],
              boxShadow: `0 0 10px ${fire.spark[0]}`,
              animation: "sparkBurst 1.1s ease-out .5s forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-20 left-[46%] z-[2] h-[5px] w-[5px] rounded-full"
            style={{
              background: fire.spark[2],
              boxShadow: `0 0 10px ${fire.spark[2]}`,
              ["--dx" as string]: "-18px",
              animation: "sparkBurst 1.3s ease-out .55s forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-[78px] left-[55%] z-[2] h-1 w-1 rounded-full"
            style={{
              background: fire.spark[1],
              boxShadow: `0 0 10px ${fire.spark[1]}`,
              ["--dx" as string]: "16px",
              animation: "sparkBurst 1.2s ease-out .65s forwards",
            }}
          />
        </div>
      ) : null}

      {/* колода з дерева — коротша дуга з правого боку */}
      {treeTossing && !reduce ? (
        <div key={`tree-toss-${treeTossKey}`}>
          <div
            className="toss-log absolute bottom-[34px] left-1/2 z-[2] -ml-[32px] h-4 w-16 rounded-[8px]"
            style={{
              background: "linear-gradient(#b5844f,#6b4626)",
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,.3)",
              animation: "treeLogToss .7s cubic-bezier(.3,.1,.5,1) forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-20 left-1/2 z-[2] h-1.5 w-1.5 rounded-full"
            style={{
              background: fire.spark[0],
              boxShadow: `0 0 10px ${fire.spark[0]}`,
              animation: "sparkBurst 1s ease-out .35s forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-[78px] left-[54%] z-[2] h-1 w-1 rounded-full"
            style={{
              background: fire.spark[1],
              boxShadow: `0 0 10px ${fire.spark[1]}`,
              ["--dx" as string]: "14px",
              animation: "sparkBurst 1.1s ease-out .42s forwards",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
