"use client";

import { Creeper } from "@/components/ambient/Creeper";
import { Deer } from "@/components/ambient/Deer";
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
  return null;
}

function ForestAmbient() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* місяць */}
      <div
        className="absolute -right-11 -top-16 h-[230px] w-[230px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(160,215,255,.18), rgba(160,215,255,0) 66%)",
        }}
      />
      {/* туман */}
      <div
        className="absolute -left-[20%] -right-[20%] top-[34%] h-[220px]"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(126,200,255,.07), rgba(126,200,255,0) 70%)",
          animation: "fog 26s ease-in-out infinite",
        }}
      />
      {/* заграва вогню знизу */}
      <div
        className="fire-glow absolute inset-x-0 bottom-[78px] h-[150px]"
        style={{
          background:
            "radial-gradient(70% 100% at 50% 100%, rgba(255,138,61,.12), rgba(255,138,61,0) 70%)",
          animation: "fireGlow 4.5s ease-in-out infinite",
        }}
      />
      {/* олень проходить фоном: рух лише в перших 30% циклу, решта — пауза за кадром */}
      <div
        className="ambient-mob absolute bottom-24 left-0 flex items-end"
        style={{ animation: "deerWalk 34s linear infinite" }}
      >
        <div style={{ animation: "deerStalk 1.5s ease-in-out infinite" }}>
          <Deer variant="field" width={96} height={136} />
        </div>
      </div>
      {/* очі в хащах */}
      <div
        className="absolute right-6 top-[44%] flex gap-[9px]"
        style={{ animation: "blinkEyes 7s ease-in-out infinite" }}
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
      {/* світло факела */}
      <div
        className="absolute inset-x-0 bottom-[74px] h-[150px]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(128,255,32,.1), rgba(128,255,32,0) 70%)",
          animation: "torch 5s ease-in-out infinite",
        }}
      />
      {/* крипер іде стрибками: steps() дає «ігровий» фрейм-рейт */}
      <div
        className="ambient-mob absolute bottom-[92px] left-0"
        style={{ animation: "mobWalk 30s linear infinite" }}
      >
        <div style={{ animation: "mobHop 1.1s steps(2,end) infinite" }}>
          <Creeper />
        </div>
      </div>
      {/* пікселний пил від кнопки «+» */}
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
