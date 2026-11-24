/**
 * Звук утримання «затисни, щоб завершити», синтезований Web Audio API — без аудіофайлів.
 *
 * Перша версія була безперервним глісандо пилкоподібної хвилі й звучала як сирена. Тепер — ступінчасті
 * події, що запускаються за прогресом утримання й пришвидшуються до фіналу:
 *   notes  — пентатонічні «щипки» вгору (до мажор, C4 → C6), як мелодія в грі;
 *   pulse  — серцебиття («тук-тук»), що частішає й дзвінчішає;
 *   finale — під час утримання тиша, звук лише при завершенні;
 *   off    — без звуку.
 * Завершення в усіх режимах однакове: низький «удар» + дзвінкий акорд C6–E6–G6–C7 (довший — для всього тренування).
 *
 * iOS: AudioContext стартує призупиненим і розблоковується лише жестом (click / touchend), а не pointerdown,
 * тож перший ж жест у застосунку розблоковує контекст (unlockOnFirstGesture). У беззвучному режимі iPhone
 * (перемикач збоку) Web Audio мовчить — це системна поведінка.
 */

export type SoundMode = "notes" | "pulse" | "finale" | "off";

export const SOUND_MODES: { id: SoundMode; label: string; hint: string }[] = [
  { id: "notes", label: "Ноти", hint: "Мелодія вгору, що пришвидшується, і дзвінкий фінал" },
  { id: "pulse", label: "Пульс", hint: "Серцебиття, що частішає, і дзвінкий фінал" },
  { id: "finale", label: "Лише фінал", hint: "Тиша під час утримання, звук лише при завершенні" },
  { id: "off", label: "Вимкнено", hint: "Без звуку" },
];

const MODE_KEY = "trainer-sound-mode";
/** Перша версія зберігала лише on/off. */
const LEGACY_KEY = "trainer-sound";
const DEFAULT_MODE: SoundMode = "notes";
const MASTER_GAIN = 0.9;
/** Скільки триває «умовне» утримання в демо (як справжні 1.5 с). */
const DEMO_HOLD_SEC = 1.5;

export function getSoundMode(): SoundMode {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_MODE;
    const v = localStorage.getItem(MODE_KEY);
    if (v === "notes" || v === "pulse" || v === "finale" || v === "off") return v;
    if (localStorage.getItem(LEGACY_KEY) === "off") return "off";
  } catch {
    /* приватний режим */
  }
  return DEFAULT_MODE;
}

export function setSoundMode(mode: SoundMode): void {
  try {
    localStorage.setItem(MODE_KEY, mode);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* налаштування просто не збережеться */
  }
  if (mode === "off") session = null;
}

/* ------------------------------------------------------------------ */
/* AudioContext                                                         */
/* ------------------------------------------------------------------ */

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

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
/* Будівельні цеглинки (працюють і на живому, і на Offline-контексті)    */
/* ------------------------------------------------------------------ */

type Ctx = BaseAudioContext;

/** Осцилятор → власна обвідка (атака 4 мс, експоненційний спад) → dest. */
function voice(c: Ctx, dest: AudioNode, type: OscillatorType, freq: number, at: number, dur: number, peak: number): void {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  g.connect(dest);
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  o.connect(g);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/** «Щипок» (маримба): чистий тон + короткий дерев'яний обертон на 3×. */
function pluck(c: Ctx, out: AudioNode, freq: number, at: number, peak: number): void {
  voice(c, out, "sine", freq, at, 0.34, peak);
  voice(c, out, "sine", freq * 3, at, 0.09, peak * 0.4);
}

const noiseCache = new WeakMap<Ctx, AudioBuffer>();
function noise(c: Ctx): AudioBuffer {
  let b = noiseCache.get(c);
  if (!b) {
    b = c.createBuffer(1, Math.ceil(c.sampleRate * 0.03), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(c, b);
  }
  return b;
}

/** «Тук»: низький тон, що падає вдвічі, + короткий високочастотний клац (щоб було чутно на динаміку телефона). */
function tick(c: Ctx, out: AudioNode, at: number, peak: number, f0: number): void {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.17);
  g.connect(out);
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.5, at + 0.11);
  o.connect(g);
  o.start(at);
  o.stop(at + 0.2);

  const click = c.createBufferSource();
  click.buffer = noise(c);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 2500;
  const cg = c.createGain();
  cg.gain.setValueAtTime(peak * 0.45, at);
  cg.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
  click.connect(hp);
  hp.connect(cg);
  cg.connect(out);
  click.start(at);
}

/** Низький «удар»: синус, що падає з 140 до 45 Гц. */
function thump(c: Ctx, out: AudioNode, at: number, peak: number): void {
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

/** Дзвінка нота-«скло»: основний тон + тихий швидкий обертон на 3×. */
function chime(c: Ctx, out: AudioNode, freq: number, at: number, dur: number, peak: number): void {
  voice(c, out, "sine", freq, at, dur, peak);
  voice(c, out, "sine", freq * 3, at, dur * 0.3, peak * 0.15);
}

const C4 = 261.63;
const semis = (n: number) => C4 * Math.pow(2, n / 12);
const C5 = semis(12);
const E5 = semis(16);
const G5 = semis(19);
const C6 = semis(24);
const E6 = semis(28);
const G6 = semis(31);
const C7 = semis(36);

/** Завершення: удар + дзвінкий акорд (для «завершити тренування» — ще й коротка пробіжка вгору). */
function finale(c: Ctx, out: AudioNode, at: number, kind: "exercise" | "day"): void {
  thump(c, out, at, kind === "day" ? 0.36 : 0.28);
  let t = at + 0.02;
  if (kind === "day") {
    [C5, E5, G5, C6, E6].forEach((f, i) => chime(c, out, f, t + i * 0.075, 0.55, 0.11));
    t += 0.42;
  }
  [C6, E6, G6, C7].forEach((f, i) => chime(c, out, f, t + i * 0.045, kind === "day" ? 1.3 : 0.95, 0.11 - i * 0.012));
}

/* ------------------------------------------------------------------ */
/* Кроки зарядки: подія запускається, коли прогрес утримання p ≥ step.p  */
/* ------------------------------------------------------------------ */

interface Step {
  /** Поріг прогресу 0…1. */
  p: number;
  play: (c: Ctx, out: AudioNode, at: number) => void;
}

/** C-мажорна пентатоніка від C4 до C6. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

function stepsFor(mode: SoundMode): Step[] {
  if (mode === "notes") {
    const last = PENTATONIC.length - 1;
    return PENTATONIC.map((s, i) => ({
      // Степінь < 1: проміжки між нотами скорочуються (перша — одразу, остання — перед самим фіналом)
      p: Math.pow(i / last, 0.65) * 0.96,
      play: (c, out, at) => pluck(c, out, semis(s), at, 0.05 + 0.08 * (i / last)),
    }));
  }
  if (mode === "pulse") {
    const K = 10;
    return Array.from({ length: K }, (_, i) => ({
      // Серцебиття частішає: проміжки між ударами зменшуються
      p: (1 - Math.pow(1 - i / K, 1.7)) * 0.98,
      play: (c, out, at) => tick(c, out, at, 0.1 + 0.2 * (i / (K - 1)), 170 + 90 * (i / (K - 1))),
    }));
  }
  return [];
}

/** Для тестів: пороги прогресу кроків режиму. */
export function stepThresholds(mode: SoundMode): number[] {
  return stepsFor(mode).map((s) => s.p);
}

/**
 * Розкладає на таймлайні контексту повне «утримання + завершення». Працює і на живому AudioContext
 * (демо в профілі), і на OfflineAudioContext (рендер WAV для прослуховування).
 */
export function scheduleDemo(c: Ctx, out: AudioNode, mode: SoundMode, kind: "exercise" | "day" = "exercise", startAt = c.currentTime + 0.05): number {
  if (mode === "off") return 0;
  for (const s of stepsFor(mode)) s.play(c, out, startAt + s.p * DEMO_HOLD_SEC);
  finale(c, out, startAt + DEMO_HOLD_SEC, kind);
  return startAt + DEMO_HOLD_SEC + (kind === "day" ? 1.8 : 1.2);
}

/** Демо в профілі: повна «зарядка» й завершення. Заодно розблоковує аудіо на iOS (виклик із жесту). */
export function playDemo(mode: SoundMode): void {
  const a = audio();
  if (a) scheduleDemo(a.c, a.out, mode);
}

/* ------------------------------------------------------------------ */
/* Живе утримання                                                       */
/* ------------------------------------------------------------------ */

interface Session {
  mode: SoundMode;
  steps: Step[];
  next: number;
  p: number;
}
let session: Session | null = null;

export function chargeStart(): void {
  const mode = getSoundMode();
  if (mode === "off") return;
  audio(); // створити/розбудити контекст
  session = { mode, steps: stepsFor(mode), next: 0, p: 0 };
}

/** Викликається з rAF-циклу: запускає кроки, до порогів яких дійшов прогрес. */
export function chargeSet(p: number): void {
  if (!session || !ctx || !master) return;
  session.p = p;
  let k = 0;
  while (session.next < session.steps.length && p >= session.steps[session.next].p) {
    // Якщо кадр «пропустив» кілька кроків — розносимо їх на 30 мс, щоб не злипались в один звук
    session.steps[session.next].play(ctx, master, ctx.currentTime + 0.004 + k * 0.03);
    session.next++;
    k++;
  }
}

/** Палець прибрали до 100%: коротке «осідання». Випадкові дотики (скрол) без прогресу мовчать. */
export function chargeCancel(): void {
  const s = session;
  session = null;
  if (!s || !ctx || !master || s.mode === "finale" || s.p < 0.12) return;
  const t = ctx.currentTime + 0.005;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  g.connect(master);
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(380, t);
  o.frequency.exponentialRampToValueAtTime(190, t + 0.14);
  o.connect(g);
  o.start(t);
  o.stop(t + 0.2);
}

/** exercise — вправа; day — все тренування (довше й урочистіше). */
export function playComplete(kind: "exercise" | "day" = "exercise"): void {
  session = null;
  if (getSoundMode() === "off") return;
  const a = audio();
  if (!a) return;
  finale(a.c, a.out, a.c.currentTime + 0.01, kind);
}
