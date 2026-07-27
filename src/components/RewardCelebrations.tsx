"use client";

/**
 * Глобальний клейм-театр для нагород, які сервер нараховує при читанні
 * (квести тижня, вузли хронік). Пасивно слухає кеш React Query — сам нічого
 * не фетчить і не додає запитів, але ловить grant незалежно від того, який
 * екран його спричинив.
 *
 * Картки дня сюди свідомо не входять: у них власний театр у DailyCardsRow,
 * ближче до самої картки.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CoinIcon } from "@/components/icons/CurrencyIcons";
import { EPICS } from "@/lib/epics";
import { playFinisher } from "@/lib/sfx";
import { useCurrentUser } from "@/hooks/useQueries";
import type { GrantedReward } from "@/lib/types";

/** Вузол хроніки, що чекає на повноекранне святкування. */
interface EpicMoment {
  key: string;
  epicName: string;
  icon: string;
  nodeName: string;
  lore: string;
  coins: number;
}

const WATCHED_KEYS = new Set(["quests", "epics"]);

function epicMomentFromGrant(g: GrantedReward): EpicMoment | null {
  // Ключ вузла: epic:<epicId>:<nodeIndex>
  const [, epicId, idx] = g.key.split(":");
  const def = EPICS.find((e) => e.id === epicId);
  const node = def?.nodes[Number(idx)];
  if (!def || !node) return null;
  return {
    key: g.key,
    epicName: def.nameUk,
    icon: def.icon,
    nodeName: node.nameUk,
    lore: node.loreUk,
    coins: g.coins,
  };
}

export function RewardCelebrations() {
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  const { user } = useCurrentUser();
  const seen = useRef<Set<string>>(new Set());
  const [epicQueue, setEpicQueue] = useState<EpicMoment[]>([]);

  const soundpack = user?.soundpack ?? "default";
  const packRef = useRef(soundpack);
  packRef.current = soundpack;
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  useEffect(() => {
    return qc.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const root = event.query.queryKey[0];
      if (typeof root !== "string" || !WATCHED_KEYS.has(root)) return;
      const data = event.query.state.data as
        | { granted?: GrantedReward[] }
        | undefined;
      const granted = data?.granted;
      if (!granted?.length) return;

      const fresh = granted.filter((g) => !seen.current.has(g.key));
      if (fresh.length === 0) return;
      for (const g of fresh) seen.current.add(g.key);

      const epicMoments = fresh
        .filter((g) => g.key.startsWith("epic:"))
        .map(epicMomentFromGrant)
        .filter((m): m is EpicMoment => m !== null);
      const rest = fresh.filter((g) => !g.key.startsWith("epic:"));

      for (const g of rest) toast.success(`+${g.coins} монет · ${g.label}`);
      if (epicMoments.length > 0) {
        setEpicQueue((q) => [...q, ...epicMoments]);
      }
      if (!reduceRef.current && (rest.length > 0 || epicMoments.length > 0)) {
        playFinisher(packRef.current);
      }
    });
  }, [qc]);

  // Показуємо вузли по одному: перший у черзі, авто-зникнення.
  const current = epicQueue[0] ?? null;
  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(
      () => setEpicQueue((q) => q.slice(1)),
      reduce ? 1400 : 3000,
    );
    return () => window.clearTimeout(t);
  }, [current, reduce]);

  return (
    <AnimatePresence>
      {current ? (
        <motion.div
          key={current.key}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[210] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.3 }}
          style={{
            background:
              "radial-gradient(80% 60% at 50% 42%, rgba(0,0,0,.82), rgba(0,0,0,.55) 70%, rgba(0,0,0,.35))",
          }}
        >
          <motion.div
            className="flex max-w-[320px] flex-col items-center gap-2 px-6 text-center"
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0.15 : 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-[40px] leading-none">{current.icon}</span>
            <span className="lbl text-white/60">{current.epicName}</span>
            <p
              className="text-[22px] font-semibold leading-tight text-white"
              style={{
                fontFamily: "var(--font-display)",
                textShadow: "0 2px 24px rgba(0,0,0,.6)",
              }}
            >
              {current.nodeName}
            </p>
            <p className="text-[13px] leading-snug text-white/75">{current.lore}</p>
            <span className="mt-1 flex items-center gap-1 text-[17px] font-semibold tabular-nums text-white">
              <CoinIcon size={17} />+{current.coins}
            </span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
