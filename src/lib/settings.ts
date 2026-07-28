/**
 * Локальні перемикачі звуку й ефектів — єдине джерело правди для сфх-модуля
 * (звичайний TS, не React) і для UI-перемикача в профілі.
 *
 * Навмисно поза React: `sfx.ts` викликається з таймерів і DOM-обробників,
 * де хук був би незручним. Синхронізація між вкладками — через `storage`.
 */

import { useSyncExternalStore } from "react";

export interface Settings {
  sound: boolean;
  vfx: boolean;
  /** Vibration API — лише Android Chromium; на iOS завжди no-op. */
  haptics: boolean;
}

const KEY = "calories:settings:v1";
const DEFAULTS: Settings = { sound: true, vfx: true, haptics: true };

let cache: Settings = DEFAULTS;
const listeners = new Set<() => void>();

function normalize(v: unknown): Settings {
  if (!v || typeof v !== "object") return DEFAULTS;
  const o = v as Record<string, unknown>;
  return {
    sound: typeof o.sound === "boolean" ? o.sound : DEFAULTS.sound,
    vfx: typeof o.vfx === "boolean" ? o.vfx : DEFAULTS.vfx,
    haptics: typeof o.haptics === "boolean" ? o.haptics : DEFAULTS.haptics,
  };
}

function load(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function persist(next: Settings) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* приватний режим — переживає лише поточну вкладку */
  }
  for (const l of listeners) l();
}

// Ліниво читаємо один раз при першому імпорті в браузері.
if (typeof window !== "undefined") {
  cache = load();
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    cache = load();
    for (const l of listeners) l();
  });
}

export function getSettings(): Settings {
  return cache;
}

export function setSound(sound: boolean) {
  persist({ ...cache, sound });
}

export function setVfx(vfx: boolean) {
  persist({ ...cache, vfx });
}

export function setHaptics(haptics: boolean) {
  persist({ ...cache, haptics });
}

export function subscribeSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** React-хук для UI-перемикачів у профілі; sfx.ts і GlobalClickFx читають getSettings() напряму. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULTS);
}
