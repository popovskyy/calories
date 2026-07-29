"use client";

import { useEffect, useRef } from "react";
import { claimRitualSound, playLogToss } from "@/lib/sfx";
import { useAppStore } from "@/store/useAppStore";
import { useCurrentUser } from "@/hooks/useQueries";
import { useThemeId } from "@/hooks/useThemeId";

/**
 * Компактна версія ритуалу для Журналу.
 *
 * Після збереження їжі застосунок веде на /log, а вогнище живе на Огляді —
 * без цього спалаху перерахунок пройшов би повз очі. Сигнал тут свідомо
 * НЕ споживається: повний ритуал усе одно має відпрацювати на Огляді.
 * Звук — через claimRitualSound: один сигнал = один whoosh, навіть якщо
 * потім відкриється Campfire.
 */
export function EmberFlash() {
  const recalc = useAppStore((s) => s.recalc);
  const { user } = useCurrentUser();
  const pack = user?.soundpack ?? "default";
  const packRef = useRef(pack);
  packRef.current = pack;
  const forest = useThemeId() === "forest";

  useEffect(() => {
    if (!forest || !recalc) return;
    if (claimRitualSound(recalc.id)) playLogToss(packRef.current);
  }, [recalc, forest]);

  if (!forest || !recalc) return null;

  return (
    <div
      key={recalc.id}
      className="pointer-events-none absolute -top-2 right-3 h-10 w-10"
      aria-hidden="true"
    >
      <div
        className="flame absolute bottom-0 left-1/2 -ml-[7px] h-7 w-3.5"
        style={{
          borderRadius: "50% 50% 46% 46% / 66% 66% 34% 34%",
          background: "linear-gradient(#ffb347,#ff6a1f)",
          animation: "emberFade 1.2s ease-out forwards",
        }}
      />
      <div
        className="fire-spark absolute bottom-5 left-1/2 h-1 w-1 rounded-full"
        style={{
          background: "#ffd166",
          boxShadow: "0 0 8px #ff8a3d",
          animation: "sparkBurst 1s ease-out forwards",
        }}
      />
      <div
        className="fire-spark absolute bottom-5 left-[30%] h-1 w-1 rounded-full"
        style={{
          background: "#fff3c4",
          boxShadow: "0 0 8px #ffd166",
          ["--dx" as string]: "-10px",
          animation: "sparkBurst 1.1s ease-out .15s forwards",
        }}
      />
    </div>
  );
}
