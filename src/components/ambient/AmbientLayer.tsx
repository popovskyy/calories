"use client";

import { Creeper } from "@/components/ambient/Creeper";
import { FieldDeer } from "@/components/ambient/FieldDeer";
import { useThemeId } from "@/hooks/useThemeId";

/**
 * Фонові анімації теми — під контентом, ніколи не перехоплюють тапи.
 *
 * Рух міряється в пікселях (translateX(460px)), а не у vw: колонка застосунку
 * обмежена 420px, і на десктопі vw-анімація гуляла б далеко за її межами.
 */
export function AmbientLayer() {
  const theme = useThemeId();

  if (theme === "forest") return <ForestAmbient />;
  if (theme === "minecraft") return <MinecraftAmbient />;
  if (theme === "lighthouse") return <LighthouseAmbient />;
  if (theme === "polonyna") return <PolonynaAmbient />;
  return <NocturneAmbient />;
}

/**
 * Полонина: ранкове світло згори, туман у долині й самотній орел.
 * Вівці живуть у героєві — тут лише повітря, щоб фон не сперечався з ним.
 */
function PolonynaAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* косе ранкове проміння */}
      <div
        className="absolute -right-10 -top-24 h-[260px] w-[260px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,180,84,.22), rgba(255,180,84,0) 70%)",
          animation: "plSunPulse 9s ease-in-out infinite",
        }}
      />
      {/* смуги туману в долині */}
      <div
        className="pl-fog absolute inset-x-0 bottom-[120px] h-[70px]"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(253,243,230,.5) 45%, transparent)",
        }}
      />
      <div
        className="pl-fog absolute inset-x-0 bottom-[186px] h-[46px]"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(253,243,230,.34) 50%, transparent)",
          animationDelay: "-14s",
        }}
      />
      {/* орел високо над хребтом */}
      <svg
        className="ambient-mob absolute left-0 top-[16%] h-3 w-6 text-[#5c4a3a]"
        viewBox="0 0 24 12"
        style={{ animation: "plEagle 26s linear infinite" }}
      >
        <path
          d="M1 7 q5 -6 11 -1 q6 -5 11 1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function NocturneAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -right-8 -top-20 h-[200px] w-[200px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(145,132,217,.14), rgba(145,132,217,0) 68%)",
        }}
      />
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="absolute h-[3px] w-[3px] rounded-full bg-[rgba(200,190,255,.55)]"
          style={{
            left: `${12 + i * 12}%`,
            top: `${18 + (i % 3) * 14}%`,
            animation: `nightDust ${6 + (i % 4)}s ease-in-out ${i * 0.4}s infinite`,
          }}
        />
      ))}
      <div
        className="absolute inset-x-0 bottom-[78px] h-[120px]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(145,132,217,.08), transparent 70%)",
          animation: "nocturneEmber 7s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function LighthouseAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute left-1/2 top-[-10%] h-[140%] w-[48%]"
        style={{
          transform: "translateX(-50%)",
          background:
            "conic-gradient(from 200deg at 50% 0%, transparent 0deg, rgba(255,179,92,.12) 18deg, transparent 42deg)",
          animation: "lighthouseBeam 14s linear infinite",
          transformOrigin: "50% 0%",
        }}
      />
      <div
        className="absolute -left-[15%] -right-[15%] top-[40%] h-[180px]"
        style={{
          background:
            "radial-gradient(55% 50% at 50% 50%, rgba(216,226,234,.06), transparent 70%)",
          animation: "fog 32s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[100px] right-[18%]"
        style={{ animation: "gullDrift 22s ease-in-out infinite" }}
      >
        <svg width="28" height="12" viewBox="0 0 28 12" fill="none" aria-hidden>
          <path
            d="M1 8c4-6 8-6 13-1 5-5 9-5 13 1"
            stroke="rgba(216,226,234,.35)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div
        className="absolute inset-x-0 bottom-[78px] h-[130px]"
        style={{
          background:
            "radial-gradient(70% 100% at 50% 100%, rgba(255,179,92,.1), transparent 70%)",
        }}
      />
    </div>
  );
}

function ForestAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -right-11 -top-16 h-[230px] w-[230px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(160,215,255,.18), rgba(160,215,255,0) 66%)",
        }}
      />
      <div
        className="absolute -left-[20%] -right-[20%] top-[34%] h-[220px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(126,200,255,.07), rgba(126,200,255,0) 70%)",
          animation: "fog 28s ease-in-out infinite",
        }}
      />
      <div
        className="fire-glow absolute inset-x-0 bottom-[78px] h-[150px]"
        style={{
          background:
            "radial-gradient(70% 100% at 50% 100%, rgba(255,138,61,.12), rgba(255,138,61,0) 70%)",
          animation: "fireGlow 5.2s ease-in-out infinite",
        }}
      />
      <FieldDeer />
      <div
        className="absolute right-6 top-[44%] flex gap-[9px]"
        style={{ animation: "blinkEyes 9s ease-in-out infinite" }}
      >
        <Eye />
        <Eye />
      </div>
    </div>
  );
}

function Eye() {
  return (
    <div
      className="h-[5px] w-[5px] rounded-full"
      style={{ background: "#ffd166", boxShadow: "0 0 10px #ffb347" }}
    />
  );
}

function MinecraftAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-x-0 bottom-[74px] h-[150px]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(128,255,32,.1), rgba(128,255,32,0) 70%)",
          animation: "torch 5s ease-in-out infinite",
        }}
      />
      <div
        className="ambient-mob absolute bottom-[92px] left-0"
        style={{ animation: "mobWalk 30s linear infinite" }}
      >
        <div style={{ animation: "mobHop 1.1s steps(2,end) infinite" }}>
          <Creeper />
        </div>
      </div>
      <div
        className="pix-dust absolute h-[5px] w-[5px] bg-[#80ff20]"
        style={{
          right: "40px",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 172px)",
          animation: "pixDust 3.4s steps(6,end) infinite",
        }}
      />
      <div
        className="pix-dust absolute h-1 w-1 bg-[#fcdb05]"
        style={{
          right: "60px",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 166px)",
          animation: "pixDust 4.4s steps(6,end) 1s infinite",
        }}
      />
    </div>
  );
}
