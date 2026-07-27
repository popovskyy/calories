"use client";

/**
 * Короткий full-bleed flash при активації теми.
 * Слухає CustomEvent `theme-equip-flash` з detail.themeId.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getThemeMeta } from "@/lib/theme-catalog";

const EVENT = "theme-equip-flash";

export function requestThemeEquipFlash(themeId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { themeId } }),
  );
}

export function ThemeEquipFlash() {
  const reduce = useReducedMotion();
  const [themeId, setThemeId] = useState<string | null>(null);

  useEffect(() => {
    const onFlash = (e: Event) => {
      const id = (e as CustomEvent<{ themeId: string }>).detail?.themeId;
      if (!id) return;
      setThemeId(id);
    };
    window.addEventListener(EVENT, onFlash);
    return () => window.removeEventListener(EVENT, onFlash);
  }, []);

  useEffect(() => {
    if (!themeId) return;
    const t = window.setTimeout(() => setThemeId(null), reduce ? 280 : 720);
    return () => window.clearTimeout(t);
  }, [themeId, reduce]);

  const meta = themeId ? getThemeMeta(themeId) : null;

  return (
    <AnimatePresence>
      {themeId && meta ? (
        <motion.div
          key={themeId}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.25 }}
          style={{
            background: meta.previewBg,
          }}
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.25 : 0.65, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: `radial-gradient(50% 40% at 50% 40%, ${meta.previewAccent}88, transparent 70%)`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.p
              className="text-[22px] font-semibold tracking-wide text-white"
              style={{ fontFamily: "var(--font-display)", textShadow: "0 2px 24px rgba(0,0,0,.5)" }}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {meta.nameUk}
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
