/**
 * Vibration API — лише Android/Chromium (iOS Safari її не має — тихий no-op).
 * Викликати з user gesture.
 */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export const HAPTIC = {
  holdStart: 12,
  complete: [30, 40, 50] as number[],
  undo: 10,
  timerDone: [100, 50, 100] as number[],
};
