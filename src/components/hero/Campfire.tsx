"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { CampDeer } from "@/components/ambient/CampDeer";
import { CampTree } from "@/components/ambient/CampTree";
import type { HeroProps } from "@/components/hero/CalorieHero";
import { DURATION_SHEET, EASE_OUT } from "@/lib/motion";
import { claimRitualSound, playFireBurst, playFireSizzle, playLogToss } from "@/lib/sfx";
import { haptic } from "@/lib/haptics";
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
  const [treeTossSide, setTreeTossSide] = useState<"left" | "right">("right");
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

      {/* ореол — компактніший, пульсує разом із полум'ям */}
      <div
        className="fire-glow pointer-events-none absolute -bottom-1 left-1/2 h-[120px] w-[160px]"
        style={{
          background:
            `radial-gradient(50% 60% at 50% 80%, ${fire.glow}, transparent 70%)`,
          animation: "fireGlow 2.8s ease-in-out infinite",
          transform: `translateX(-50%) scale(${fireScale})`,
          transformOrigin: "50% 100%",
        }}
      />

      {/* олень біля вогнища — тікає і від meal-ритуалу, і від колоди з дерева */}
      <CampDeer ritualActive={active || treeTossing} />

      {/* сосни з обох боків вогнища */}
      <CampTree side="left" onLogToss={() => onTreeLogToss("left")} />
      <CampTree side="right" onLogToss={() => onTreeLogToss("right")} />

      {/* вогонь + дрова + каміння — компактне кострище; тап — шкварчання */}
      <div
        className="absolute bottom-0 left-1/2 z-[2] h-[130px] w-[140px] cursor-pointer touch-manipulation"
        style={{ transform: "translateX(-50%)", WebkitTapHighlightColor: "transparent" }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          playFireSizzle();
          haptic("click");
        }}
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
              className="flame absolute bottom-[12px] left-1/2 -ml-[11px] h-[64px] w-[22px]"
              style={{
                borderRadius: FLAME_RADIUS,
                background: fire.big,
                filter: "blur(.35px)",
                animation: "flameBig 1.15s linear infinite",
              }}
            />
            <div
              className="flame absolute bottom-[14px] left-1/2 -ml-[6px] h-11 w-[13px]"
              style={{
                borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                background: fire.mid,
                animation: "flameMid 0.85s linear infinite",
              }}
            />
            <div
              className="flame absolute bottom-[62px] left-1/2 -ml-[3px] h-3.5 w-1.5 rounded-full"
              style={{
                background: fire.tip,
                filter: "blur(1px)",
                animation: "flameTip 1.05s linear infinite",
              }}
            />
            <div
              className="flame absolute bottom-[11px] left-[36%] h-[28px] w-[11px]"
              style={{
                borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                background: fire.side,
                animation: "flameSide 1.05s linear infinite",
                transformOrigin: "50% 100%",
              }}
            />
            <div
              className="flame absolute bottom-[11px] left-[58%] h-[24px] w-2.5"
              style={{
                borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
                background: fire.side,
                animation: "flameSide 1.25s linear .35s infinite",
                transformOrigin: "50% 100%",
              }}
            />

            {/* постійні дрібні іскри */}
            {!reduce ? (
              <>
                <div
                  className="fire-spark absolute bottom-14 left-1/2 h-1 w-1 rounded-full"
                  style={{
                    background: fire.spark[0],
                    boxShadow: `0 0 6px ${fire.spark[0]}`,
                    ["--ex" as string]: "-6px",
                    animation: "emberRise 1.6s ease-out infinite",
                  }}
                />
                <div
                  className="fire-spark absolute bottom-12 left-[42%] h-[3px] w-[3px] rounded-full"
                  style={{
                    background: fire.spark[1],
                    boxShadow: `0 0 6px ${fire.spark[1]}`,
                    ["--ex" as string]: "10px",
                    animation: "emberRise 1.9s ease-out .4s infinite",
                  }}
                />
                <div
                  className="fire-spark absolute bottom-16 left-[56%] h-0.5 w-0.5 rounded-full"
                  style={{
                    background: fire.spark[2],
                    boxShadow: `0 0 5px ${fire.spark[2]}`,
                    ["--ex" as string]: "-12px",
                    animation: "emberRise 1.4s ease-out .85s infinite",
                  }}
                />
              </>
            ) : null}
          </div>
        </div>

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

      {/* колода з дерева — дуга зліва або справа */}
      {treeTossing && !reduce ? (
        <div key={`tree-toss-${treeTossKey}`}>
          <div
            className="toss-log absolute bottom-[34px] left-1/2 z-[2] -ml-[32px] h-4 w-16 rounded-[8px]"
            style={{
              background: "linear-gradient(#b5844f,#6b4626)",
              boxShadow: "inset 0 -3px 0 rgba(0,0,0,.3)",
              animation: `${
                treeTossSide === "left" ? "treeLogTossLeft" : "treeLogToss"
              } .7s cubic-bezier(.3,.1,.5,1) forwards`,
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
