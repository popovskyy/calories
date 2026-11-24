/**
 * Звук утримання «затисни, щоб завершити», синтезований Web Audio API — без аудіофайлів:
 * жодних ліцензій і завантажень, нуль затримки, а головне — висоту й яскравість звуку можна прив'язати
 * до прогресу утримання (чим довше тримаєш, тим вище, світліше й «тремтливіше» нарощується тон).
 *
 *   charge*  — безперервний наростаючий тон, поки палець на кнопці;
 *   complete — «удар» + арпеджіо вгору, коли утримання дійшло до 100%;
 *   cancel   — швидкий спад, якщо палець прибрали раніше.
 *
 * iOS: AudioContext стартує призупиненим і розблоковується лише жестом (click / touchend), а не pointerdown,
 * тож перший ж жест у застосунку розблоковує контекст (unlockOnFirstGesture). У беззвучному режимі iPhone
 * (перемикач збоку) Web Audio мовчить — це системна поведінка.
 */

const PREF_KEY = "trainer-sound";

/** Макс. гучність зарядки (пилкоподібна хвиля гучна, тому малий коефіцієнт) та загальна гучність. */
const CHARGE_GAIN = 0.05;
const MASTER_GAIN = 0.9;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function isSoundOn(): boolean {
  try {
    return typeof localStorage === "undefined" || localStorage.getItem(PREF_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    /* приватний режим — налаштування просто не збережеться */
  }
  if (!on) chargeCancel();
}

function audio(): { c: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      return null;
    }
  }
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
  return master ? { c: ctx, out: master } : null;
}

let unlockArmed = false;

/** Один раз: перший же жест у застосунку створює й розблоковує AudioContext (вимога iOS Safari). */
export function unlockOnFirstGesture(): void {
  if (unlockArmed || typeof window === "undefined") return;
  unlockArmed = true;
  const events = ["pointerup", "touchend", "click", "keydown"] as const;
  const unlock = () => {
    const a = audio();
    if (!a) return;
    // Беззвучний буфер — офіційний спосіб «прогріти» контекст на iOS
    const src = a.c.createBufferSource();
    src.buffer = a.c.createBuffer(1, 1, 22050);
    src.connect(a.out);
    src.start(0);
    if (a.c.state === "running") events.forEach((e) => window.removeEventListener(e, unlock, true));
  };
  events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
}

/* ------------------------------------------------------------------ */
/* Зарядка: наростаючий тон, прив'язаний до прогресу                    */
/* ------------------------------------------------------------------ */

interface Charge {
  o1: OscillatorNode;
  o2: OscillatorNode;
  lfo: OscillatorNode;
  filter: BiquadFilterNode;
  level: GainNode;
}
let charge: Charge | null = null;

/** Висота: 150 → 750 Гц експоненційно (рівномірно «на слух»), p — прогрес утримання 0…1. */
const pitch = (p: number) => 150 * Math.pow(5, p);

export function chargeStart(): void {
  if (!isSoundOn()) return;
  const a = audio();
  if (!a) return;
  stopCharge(0.02);
  const { c, out } = a;
  const t = c.currentTime;

  const level = c.createGain();
  level.gain.setValueAtTime(0, t);
  const tremolo = c.createGain();
  tremolo.gain.value = 0.65;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 5;
  filter.frequency.setValueAtTime(500, t);

  // Два злегка розстроєні осцилятори — «товстіший» тон; ЛНЧ на гучності дає наростаюче тремтіння
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = "sawtooth";
  o2.type = "sawtooth";
  o1.frequency.setValueAtTime(pitch(0), t);
  o2.frequency.setValueAtTime(pitch(0) * 1.006, t);
  const lfo = c.createOscillator();
  lfo.frequency.setValueAtTime(5, t);
  const lfoDepth = c.createGain();
  lfoDepth.gain.value = 0.35;

  o1.connect(filter);
  o2.connect(filter);
  filter.connect(tremolo);
  tremolo.connect(level);
  level.connect(out);
  lfo.connect(lfoDepth);
  lfoDepth.connect(tremolo.gain);
  o1.start(t);
  o2.start(t);
  lfo.start(t);
  level.gain.setTargetAtTime(CHARGE_GAIN * 0.35, t, 0.03);
  charge = { o1, o2, lfo, filter, level };
}

/** Викликається з rAF-циклу: плавно підтягує параметри до поточного прогресу. */
export function chargeSet(p: number): void {
  if (!charge || !ctx) return;
  const t = ctx.currentTime;
  const f = pitch(p);
  charge.o1.frequency.setTargetAtTime(f, t, 0.04);
  charge.o2.frequency.setTargetAtTime(f * 1.006, t, 0.04);
  charge.filter.frequency.setTargetAtTime(500 + 3800 * p * p, t, 0.04);
  charge.level.gain.setTargetAtTime(CHARGE_GAIN * (0.35 + 0.65 * p), t, 0.05);
  charge.lfo.frequency.setTargetAtTime(5 + 13 * p, t, 0.06);
}

function stopCharge(fadeSec: number): void {
  const ch = charge;
  if (!ch || !ctx) return;
  charge = null;
  const t = ctx.currentTime;
  ch.level.gain.cancelScheduledValues(t);
  ch.level.gain.setTargetAtTime(0, t, fadeSec / 3);
  const end = t + fadeSec + 0.05;
  for (const n of [ch.o1, ch.o2, ch.lfo]) {
    try {
      n.stop(end);
    } catch {
      /* уже зупинений */
    }
  }
}

/** Палець прибрали до 100%: тон швидко «осідає». */
export function chargeCancel(): void {
  if (!charge || !ctx) return;
  const t = ctx.currentTime;
  charge.o1.frequency.setTargetAtTime(pitch(0) * 0.8, t, 0.05);
  charge.o2.frequency.setTargetAtTime(pitch(0) * 0.8, t, 0.05);
  stopCharge(0.14);
}

/* ------------------------------------------------------------------ */
/* Завершення                                                           */
/* ------------------------------------------------------------------ */

/** Нота з атакою 6 мс і експоненційним спадом. */
function note(c: AudioContext, out: AudioNode, freq: number, at: number, dur: number, peak: number): void {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  g.connect(out);
  // Синус + тихий дзвінкий обертон — «скляний» тембр без різкості
  for (const [mult, amp, type] of [[1, 1, "sine"], [2, 0.25, "triangle"]] as const) {
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult, at);
    og.gain.value = amp;
    o.connect(og);
    og.connect(g);
    o.start(at);
    o.stop(at + dur + 0.05);
  }
}

/** Низький «удар»: синус, що падає з 140 до 45 Гц. */
function thump(c: AudioContext, out: AudioNode, at: number, peak: number): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(140, at);
  o.frequency.exponentialRampToValueAtTime(45, at + 0.2);
  g.gain.setValueAtTime(peak, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
  o.connect(g);
  g.connect(out);
  o.start(at);
  o.stop(at + 0.25);
}

/** exercise — вправа (удар + 3 ноти вгору); day — все тренування (довше й урочистіше). */
export function playComplete(kind: "exercise" | "day" = "exercise"): void {
  if (!isSoundOn()) return;
  stopCharge(0.03);
  const a = audio();
  if (!a) return;
  const { c, out } = a;
  const t = c.currentTime + 0.01;
  thump(c, out, t, kind === "day" ? 0.42 : 0.32);
  if (kind === "exercise") {
    // E5 → B5 → E6: чиста квінта + октава, «галочка»
    note(c, out, 659.25, t + 0.02, 0.35, 0.16);
    note(c, out, 987.77, t + 0.09, 0.4, 0.14);
    note(c, out, 1318.5, t + 0.16, 0.7, 0.13);
  } else {
    // C5 E5 G5 C6 E6 і довгий акорд наприкінці
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(c, out, f, t + 0.02 + i * 0.085, 0.5, 0.13));
    [1046.5, 1318.5, 1568].forEach((f) => note(c, out, f, t + 0.36, 1.1, 0.11));
  }
}

/** Короткий прев'ю при вмиканні звуку в профілі (заодно розблоковує аудіо на iOS). */
export function playPreview(): void {
  playComplete("exercise");
}
