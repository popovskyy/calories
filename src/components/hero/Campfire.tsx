"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { Deer } from "@/components/ambient/Deer";
import type { HeroProps } from "@/components/hero/CalorieHero";
import { playLogToss } from "@/lib/sfx";
import { useAppStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/hooks/useQueries";

const FLAME_RADIUS = "50% 50% 46% 46% / 66% 66% 34% 34%";

/**
 * Forest-герой: вогнище замість кільця прогресу.
 *
 * Ритуал «підкидання дровини» запускається сигналом перерахунку зі стора
 * (додали / змінили / видалили запис), а не тапом по «+». Сигнал переживає
 * навігацію, тож ритуал відпрацює й тоді, коли користувач збереже їжу на
 * /add і повернеться на Огляд лише за кілька екранів.
 */
export function Campfire({ consumed, target }: HeroProps) {
  const remaining = target - consumed;
  const over = remaining < 0;

  const recalc = useAppStore((s) => s.recalc);
  const consumeRecalc = useAppStore((s) => s.consumeRecalc);
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const { user } = useCurrentUser();
  const pack = user?.soundpack ?? "default";

  /*
   * Стану ритуалу в React немає взагалі: увесь таймлайн (дровина .85s, спалах
   * на .56s, втеча оленя, згасання іскор) — це CSS-анімації з forwards, а
   * `key={recalc.id}` перезапускає їх на кожному новому сигналі. React лишає
   * собі тільки те, що CSS не вміє: програти звук і погасити сигнал у кінці.
   */
  const active = recalc !== null;
  const ritualKey = recalc?.id ?? "idle";

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("uk-UA"));

  useEffect(() => {
    const a = animate(count, consumed, { duration: 1.0, ease: [0.22, 1, 0.36, 1] });
    return () => a.stop();
  }, [consumed, count]);

  useEffect(() => {
    if (!recalc) return;
    playLogToss(soundEnabled, pack);
    const t = window.setTimeout(consumeRecalc, 2600);
    return () => window.clearTimeout(t);
  }, [recalc, consumeRecalc, soundEnabled, pack]);

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
            textShadow: "0 0 26px rgba(255,138,61,.55)",
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

      {/* ореол */}
      <div
        className="fire-glow pointer-events-none absolute -bottom-2.5 left-1/2 h-[150px] w-[230px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 80%, rgba(255,138,61,.34), rgba(255,138,61,0) 70%)",
          animation: "fireGlow 3.6s ease-in-out infinite",
        }}
      />

      {/* олень біля вогнища — за полум'ям. `both` тримає його завмерлим
          біля багаття протягом .56s, поки летить дровина, і аж тоді він тікає */}
      <div
        key={`deer-${ritualKey}`}
        className="ambient-mob pointer-events-none absolute bottom-[26px] left-10 z-[1]"
        style={{
          animation: active
            ? "deerFlee 1.5s ease-out .56s both"
            : "deerCamp 19s linear infinite",
        }}
      >
        <div style={{ animation: `deerStalk ${active ? "0.35s" : "1.4s"} ease-in-out infinite` }}>
          <Deer variant="camp" width={58} height={82} scared={active} />
        </div>
      </div>

      {/* вогонь + дрова + каміння: єдиний стек, що спалахує на .56s */}
      <div
        key={`fire-${ritualKey}`}
        className="absolute bottom-0 left-1/2 z-[2] h-[150px] w-[196px]"
        style={{
          transform: "translateX(-50%)",
          transformOrigin: "50% 100%",
          animation: active ? "fireFlare 2.6s forwards" : undefined,
        }}
      >
        <div
          className="flame absolute bottom-[14px] left-1/2 -ml-[13px] h-[74px] w-[26px]"
          style={{
            borderRadius: FLAME_RADIUS,
            background: "linear-gradient(#ffb347,#ff6a1f)",
            filter: "blur(.4px)",
            animation: "flameBig 1.5s ease-in-out infinite",
          }}
        />
        <div
          className="flame absolute bottom-4 left-1/2 -ml-[7px] h-12 w-[15px]"
          style={{
            borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
            background: "linear-gradient(#fff3c4,#ffd166)",
            animation: "flameMid 1.1s ease-in-out infinite",
          }}
        />
        <div
          className="flame absolute bottom-[74px] left-1/2 -ml-[4px] h-4 w-2 rounded-full"
          style={{
            background: "#ffe9a8",
            filter: "blur(1px)",
            animation: "flameTip 1.7s ease-in-out infinite",
          }}
        />
        <div
          className="flame absolute bottom-3 left-[38%] h-[34px] w-[14px]"
          style={{
            borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
            background: "linear-gradient(#ff9c3a,#e0561a)",
            animation: "flameMid 1.35s ease-in-out .3s infinite",
          }}
        />
        <div
          className="flame absolute bottom-3 left-[58%] h-[30px] w-3"
          style={{
            borderRadius: "50% 50% 46% 46% / 70% 70% 30% 30%",
            background: "linear-gradient(#ff9c3a,#e0561a)",
            animation: "flameMid 1.5s ease-in-out .6s infinite",
          }}
        />

        {/* дрова */}
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

        {/* каміння по дузі */}
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

      {/* ритуал: дровина летить справа згори, за нею — три іскри.
          Анімації forwards, тож після завершення вузли невидимі й просто
          чекають, доки сигнал згасне */}
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
              background: "#ffd166",
              boxShadow: "0 0 10px #ff8a3d",
              animation: "sparkBurst 1.1s ease-out .5s forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-20 left-[46%] z-[2] h-[5px] w-[5px] rounded-full"
            style={{
              background: "#ffb347",
              boxShadow: "0 0 10px #ff8a3d",
              ["--dx" as string]: "-18px",
              animation: "sparkBurst 1.3s ease-out .55s forwards",
            }}
          />
          <div
            className="fire-spark absolute bottom-[78px] left-[55%] z-[2] h-1 w-1 rounded-full"
            style={{
              background: "#fff3c4",
              boxShadow: "0 0 10px #ffd166",
              ["--dx" as string]: "16px",
              animation: "sparkBurst 1.2s ease-out .65s forwards",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
