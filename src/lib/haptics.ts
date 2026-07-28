/**
 * Vibration API — progressive enhancement для Android Chromium / встановленого PWA.
 * На iOS / Safari / Firefox тихо no-op (немає API або вимкнено).
 * Викликати лише з user gesture (pointerdown тощо).
 */

import { getSettings } from "@/lib/settings";

export type HapticKind = "click" | "nav" | "confirm" | "destructive" | "success";

const PATTERNS: Record<HapticKind, number | number[]> = {
  click: 8,
  nav: 10,
  confirm: [12, 30, 12],
  destructive: [20, 40, 20],
  success: [14, 40, 14, 40, 24],
};

function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Сирий виклик; без перевірки settings — для тестів / особливих випадків. */
export function vibrateRaw(pattern: number | number[]): boolean {
  if (!canVibrate()) return false;
  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/** Вібрація за семантикою кліку; шанує settings.haptics. */
export function haptic(kind: HapticKind): void {
  if (!getSettings().haptics) return;
  vibrateRaw(PATTERNS[kind]);
}
