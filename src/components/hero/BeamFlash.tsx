"use client";

import { useEffect } from "react";
import { playFoghorn } from "@/lib/sfx";
import { useAppStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/hooks/useQueries";
import { useThemeId } from "@/hooks/useThemeId";

/**
 * Компактне відлуння ритуалу маяка для Журналу — аналог EmberFlash у forest.
 * Сигнал свідомо НЕ споживається: повний оберт променя має відпрацювати
 * на Огляді.
 */
export function BeamFlash() {
  const recalc = useAppStore((s) => s.recalc);
  const { user } = useCurrentUser();
  const pack = user?.soundpack ?? "default";
  const lighthouse = useThemeId() === "lighthouse";

  useEffect(() => {
    if (!lighthouse || !recalc) return;
    playFoghorn(pack);
  }, [recalc, lighthouse, pack]);

  if (!lighthouse || !recalc) return null;

  return (
    <div
      key={recalc.id}
      className="pointer-events-none absolute -top-2 right-3 h-10 w-10"
      aria-hidden="true"
    >
      {/* лампа */}
      <div
        className="absolute left-1/2 top-0 h-2 w-3 -translate-x-1/2 rounded-[2px]"
        style={{
          background: "linear-gradient(#ffe0a8, #ffb35c)",
          animation: "lhLampFlare 1.7s ease-out forwards",
          boxShadow: "0 0 10px rgba(255,179,92,.6)",
        }}
      />
      {/* мініатюрний оберт променя */}
      <div
        className="absolute left-1/2 top-1.5 origin-top"
        style={{
          width: 2,
          height: 30,
          marginLeft: -1,
          background:
            "linear-gradient(180deg, rgba(255,224,168,.9), rgba(255,179,92,0))",
          animation: "lhBeamSweep 1.7s cubic-bezier(.22,1,.36,1) forwards",
        }}
      />
    </div>
  );
}
