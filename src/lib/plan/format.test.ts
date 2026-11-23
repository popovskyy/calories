import { describe, expect, it } from "vitest";
import { dayProgress, dayStatus, formatDuration, formatPrescription, formatSeconds, videoUrl } from "./format";

describe("formatPrescription", () => {
  it("підходи × повтори", () => {
    expect(formatPrescription({ sets: 4, reps: "8–10", durationSec: null })).toBe("4 × 8–10");
  });
  it("лише час", () => {
    expect(formatPrescription({ sets: null, reps: null, durationSec: 300 })).toBe("5 хв");
  });
  it("підходи × час", () => {
    expect(formatPrescription({ sets: 3, reps: null, durationSec: 45 })).toBe("3 × 45 с");
  });
  it("лише повтори (інтервальний опис)", () => {
    expect(formatPrescription({ sets: null, reps: "8 × (40с / 80с)", durationSec: null })).toBe(
      "8 × (40с / 80с)",
    );
  });
  it("порожнє → тире", () => {
    expect(formatPrescription({ sets: null, reps: null, durationSec: null })).toBe("—");
  });
});

describe("formatDuration / formatSeconds", () => {
  it("секунди й хвилини", () => {
    expect(formatDuration(45)).toBe("45 с");
    expect(formatDuration(90)).toBe("1 хв 30 с");
    expect(formatSeconds(75)).toBe("1:15");
    expect(formatSeconds(-3)).toBe("0:00");
  });
});

describe("dayProgress / dayStatus", () => {
  const exercises = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }] as never[];
  it("рахує лише існуючі вправи", () => {
    const p = dayProgress({ exercises, completedExerciseIds: ["a", "b", "ghost"] });
    expect(p).toEqual({ done: 2, total: 4, pct: 50 });
  });
  it("порожній день → 0%", () => {
    expect(dayProgress({ exercises: [], completedExerciseIds: [] }).pct).toBe(0);
  });
  it("статуси: planned → in_progress → done", () => {
    expect(dayStatus({ completedExerciseIds: [], workoutCompletedAt: null })).toBe("planned");
    expect(dayStatus({ completedExerciseIds: ["a"], workoutCompletedAt: null })).toBe("in_progress");
    expect(dayStatus({ completedExerciseIds: ["a"], workoutCompletedAt: "2026-11-23T10:00:00Z" })).toBe(
      "done",
    );
  });
});

describe("videoUrl", () => {
  it("бере запит від ШІ й кодує його", () => {
    expect(videoUrl({ name: "x", videoQuery: "dead bug exercise proper form" })).toBe(
      "https://www.youtube.com/results?search_query=dead%20bug%20exercise%20proper%20form",
    );
  });
  it("без запиту — фолбек з назви вправи (кирилиця кодується)", () => {
    const url = videoUrl({ name: "Планка", videoQuery: null });
    expect(url.startsWith("https://www.youtube.com/results?search_query=")).toBe(true);
    expect(decodeURIComponent(url.split("=")[1])).toBe("Планка як правильно робити");
  });
  it("порожній рядок запиту не вважається запитом", () => {
    expect(decodeURIComponent(videoUrl({ name: "Присідання", videoQuery: "  " }).split("=")[1])).toContain("Присідання");
  });
});
