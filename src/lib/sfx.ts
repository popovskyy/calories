/**
 * Звуки застосунку.
 *
 * Часті UI / Forest-куеси — готові CC0-семпли через Howler (`public/sounds/`).
 * Фінішери, епіки, тематичні ритуали (маяк / полонина) лишаються WebAudio-
 * синтезом: рідкі, залежать від саундпака нотами.
 *
 * Howl створюється лениво; `preloadSfxSamples()` варто кликнути з першого
 * user gesture (GlobalClickFx), щоб мобільний браузер розблокував аудіо.
 */

import { Howl } from "howler";
import { getSettings } from "@/lib/settings";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Спільна брама для всіх звуків: системний reduced-motion І перемикач у профілі. */
function soundAllowed(): boolean {
  return !prefersReducedMotion() && getSettings().sound;
}

/* ------------------------------------------------------------------ */
/*  Семпли (Howler)                                                    */
/* ------------------------------------------------------------------ */

type SampleId =
  | "chop"
  | "fire-sizzle"
  | "fire-burst"
  | "log-toss"
  | "deer-startle"
  | "ui-click"
  | "ui-nav"
  | "ui-confirm"
  | "ui-destructive"
  | "save-ack";

const SAMPLE_IDS: SampleId[] = [
  "chop",
  "fire-sizzle",
  "fire-burst",
  "log-toss",
  "deer-startle",
  "ui-click",
  "ui-nav",
  "ui-confirm",
  "ui-destructive",
  "save-ack",
];

/** Саундпак магазину → rate/volume поверх одного набору семплів. */
const SAMPLE_PACK: Record<string, { rate: number; volume: number }> = {
  default: { rate: 1, volume: 0.88 },
  blocky: { rate: 0.9, volume: 0.98 },
  retro: { rate: 1.18, volume: 0.72 },
  cinema: { rate: 0.8, volume: 1 },
};

const howls = new Map<SampleId, Howl>();

function getHowl(id: SampleId): Howl {
  let h = howls.get(id);
  if (!h) {
    h = new Howl({
      src: [`/sounds/${id}.mp3`],
      preload: true,
      html5: false,
      volume: 1,
    });
    howls.set(id, h);
  }
  return h;
}

/** Прогріти семпли після першого жесту користувача. */
export function preloadSfxSamples() {
  if (typeof window === "undefined") return;
  for (const id of SAMPLE_IDS) getHowl(id);
}

function playSample(id: SampleId, pack = "default", baseVol = 0.8) {
  if (!soundAllowed()) return;
  try {
    const p = SAMPLE_PACK[pack] ?? SAMPLE_PACK.default!;
    const h = getHowl(id);
    h.rate(p.rate);
    h.volume(Math.min(1, Math.max(0, baseVol * p.volume)));
    h.play();
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Профілі саундпаків для WebAudio-фінішерів (ноти / хвиля).
 * Семплові куеси див. SAMPLE_PACK вище.
 */
interface PackProfile {
  /** Форма хвилі удару. */
  wave: OscillatorType;
  /** Базова частота першого тріску, Гц. */
  baseHz: number;
  /** На скільки Гц нижчий кожен наступний. */
  stepHz: number;
  /** Моменти ударів, секунди від старту. */
  hits: number[];
  /** Гучність удару. */
  punch: number;
  /** Чи грати шумовий whoosh перед ударом. */
  whoosh: boolean;
}

const PACKS: Record<string, PackProfile> = {
  default: {
    wave: "triangle",
    baseHz: 160,
    stepHz: 30,
    hits: [0.5, 0.58, 0.71],
    punch: 0.09,
    whoosh: true,
  },
  blocky: {
    wave: "triangle",
    baseHz: 220,
    stepHz: 70,
    hits: [0.48, 0.56],
    punch: 0.13,
    whoosh: false,
  },
  retro: {
    wave: "sawtooth",
    baseHz: 440,
    stepHz: -90,
    hits: [0.46, 0.53, 0.6, 0.67],
    punch: 0.07,
    whoosh: false,
  },
  cinema: {
    wave: "sine",
    baseHz: 70,
    stepHz: 12,
    hits: [0.52, 0.78],
    punch: 0.22,
    whoosh: true,
  },
};

export function getPackProfile(pack: string): PackProfile {
  return PACKS[pack] ?? PACKS.default!;
}

/**
 * Спільна брама сімейства «нагорода».
 *
 * Одна дія користувача розсилає кілька інвалідацій (`quests`, `epics`,
 * святкування збереження) — кожна прилітає окремою подією кешу,
 * і без цієї брами той самий акорд грав би двічі-тричі поспіль, що на слух
 * читається як заїкання, а не як нагорода.
 */
let lastRewardAt = 0;
let lastEpicAt = 0;
/** Які recalc.id вже озвучили — один сигнал, один звук (журнал + огляд). */
const playedRitualIds = new Set<number>();

function rewardGate(minGapMs: number): boolean {
  const now = Date.now();
  if (now - lastRewardAt < minGapMs) return false;
  lastRewardAt = now;
  return true;
}

/**
 * Брама ритуального звуку (дровина / фогхорн / дзвіночок).
 *
 * Сигнал чують і міні-спалах на /log, і герой на Огляді — без брами
 * той самий whoosh/гудок грав би двічі. Id «займається» одразу, навіть
 * якщо звук приглушено (акорд нагороди / вимкнений sound): інакше
 * пізніше на Огляді раптом знову гудело б.
 */
export function claimRitualSound(recalcId: number): boolean {
  if (playedRitualIds.has(recalcId)) return false;
  playedRitualIds.add(recalcId);
  if (playedRitualIds.size > 24) {
    const oldest = playedRitualIds.values().next().value;
    if (oldest !== undefined) playedRitualIds.delete(oldest);
  }
  if (!soundAllowed()) return false;
  // Нагорода («день у нормі») важливіша за атмосферу ритуалу.
  if (Date.now() - lastRewardAt < 1200) return false;
  return true;
}

/** Акорд перемоги для кожного пакета: півтони від базової ноти. */
const FANFARE: Record<string, { wave: OscillatorType; notes: number[]; gain: number }> = {
  default: { wave: "triangle", notes: [523, 659, 784], gain: 0.11 },
  blocky: { wave: "square", notes: [587, 784], gain: 0.1 },
  retro: { wave: "sawtooth", notes: [523, 659, 784, 1047], gain: 0.07 },
  cinema: { wave: "sine", notes: [131, 196, 262], gain: 0.2 },
};

/**
 * Короткий акорд, коли день закрито в ±5%.
 *
 * Грає в будь-якій темі — на відміну від вогнища, яке живе лише у «лісі».
 * Саме завдяки цьому куплений саундпак чутно всім, а не тільки forest-гравцям.
 * Другий аргумент — id фінішера: додає короткий акцент поверх акорду пакета
 * (sonar ping для ripple, удар печатки для stamp).
 */
export function playFinisher(pack = "default", finisher = "confetti") {
  if (!soundAllowed()) return;
  if (!rewardGate(900)) return;
  const ac = getContext();
  if (!ac) return;

  const f = FANFARE[pack] ?? FANFARE.default!;

  try {
    const now = ac.currentTime;
    f.notes.forEach((hz, i) => {
      const at = now + i * 0.09;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = f.wave;
      osc.frequency.setValueAtTime(hz, at);
      gain.gain.setValueAtTime(f.gain, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      osc.connect(gain).connect(ac.destination);
      osc.start(at);
      osc.stop(at + 0.3);
    });
    playFinisherAccent(ac, finisher, now);
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Підтвердження звичайного запису їжі (не ±5%).
 */
export function playSaveAck() {
  playSample("save-ack", "cinema", 0.75);
}

/** Унікальний «голос» фінішера поверх акорду саундпака. */
function playFinisherAccent(ac: AudioContext, finisher: string, now: number) {
  if (finisher === "ripple") {
    // М'який sonar: високий синус + тихе відлуння.
    [0, 0.18].forEach((offset, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880 - i * 40, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.09 * (1 - i * 0.45), now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.42);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.45);
    });
    return;
  }

  if (finisher === "stamp") {
    // Низький «туп» + короткий високий клік печатки.
    const thud = ac.createOscillator();
    const thudGain = ac.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(110, now);
    thud.frequency.exponentialRampToValueAtTime(55, now + 0.12);
    thudGain.gain.setValueAtTime(0.18, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    thud.connect(thudGain).connect(ac.destination);
    thud.start(now);
    thud.stop(now + 0.15);

    const click = ac.createOscillator();
    const clickGain = ac.createGain();
    click.type = "triangle";
    click.frequency.setValueAtTime(1400, now + 0.04);
    clickGain.gain.setValueAtTime(0.07, now + 0.04);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    click.connect(clickGain).connect(ac.destination);
    click.start(now + 0.04);
    click.stop(now + 0.13);
    return;
  }

  if (finisher === "nova") {
    // Підйом whoosh (синус 180→1200) + дзвінкий хвіст із трьох високих нот.
    const sweep = ac.createOscillator();
    const sweepGain = ac.createGain();
    sweep.type = "sine";
    sweep.frequency.setValueAtTime(180, now);
    sweep.frequency.exponentialRampToValueAtTime(1200, now + 0.38);
    sweepGain.gain.setValueAtTime(0.0001, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.14, now + 0.08);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    sweep.connect(sweepGain).connect(ac.destination);
    sweep.start(now);
    sweep.stop(now + 0.45);

    [988, 1319, 1760].forEach((hz, i) => {
      const at = now + 0.28 + i * 0.07;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(hz, at);
      gain.gain.setValueAtTime(0.08, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
      osc.connect(gain).connect(ac.destination);
      osc.start(at);
      osc.stop(at + 0.38);
    });
  }
}

/**
 * Вузол хроніки («Перший кілограм» і подібні) — окремий, більший звук.
 *
 * Такі моменти трапляються кілька разів за весь шлях, тому вони НЕ мають
 * звучати як звичайний toast чи влучний день: висхідне арпеджіо на п'ять нот
 * плюс низький корінь і дзвінкий хвіст. Впізнається з першої ноти саме як
 * «це щось рідкісне».
 */
const EPIC_NOTES: Record<string, number[]> = {
  default: [392, 523, 659, 784, 1047],
  blocky: [349, 466, 587, 784, 932],
  retro: [523, 659, 784, 1047, 1319],
  cinema: [131, 175, 262, 349, 523],
};

export function playEpicFanfare(pack = "default") {
  if (!soundAllowed()) return;
  // Власна брама: рідкісний момент має право прозвучати навіть одразу після
  // звичайного фінішера — але сам себе не дублює.
  const now = Date.now();
  if (now - lastEpicAt < 1500) return;
  lastEpicAt = now;
  lastRewardAt = now; // приглушує звичайний акорд із тієї ж пачки нагород

  const ac = getContext();
  if (!ac) return;

  const f = FANFARE[pack] ?? FANFARE.default!;
  const notes = EPIC_NOTES[pack] ?? EPIC_NOTES.default!;

  try {
    const t0 = ac.currentTime;

    // Низький корінь — підкладка, що тримає всю фразу.
    const root = ac.createOscillator();
    const rootGain = ac.createGain();
    root.type = "sine";
    root.frequency.setValueAtTime(notes[0]! / 2, t0);
    rootGain.gain.setValueAtTime(0.0001, t0);
    rootGain.gain.exponentialRampToValueAtTime(f.gain * 0.8, t0 + 0.08);
    rootGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    root.connect(rootGain).connect(ac.destination);
    root.start(t0);
    root.stop(t0 + 1.15);

    notes.forEach((hz, i) => {
      const at = t0 + i * 0.11;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = f.wave;
      osc.frequency.setValueAtTime(hz, at);
      gain.gain.setValueAtTime(f.gain, at);
      // Остання нота дзвенить довше — це і є «хвіст» моменту.
      const tail = i === notes.length - 1 ? 0.9 : 0.3;
      gain.gain.exponentialRampToValueAtTime(0.0001, at + tail);
      osc.connect(gain).connect(ac.destination);
      osc.start(at);
      osc.stop(at + tail + 0.02);
    });
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Фогхорн маяка — голос теми «Маяк» на ритуалі перерахунку.
 *
 * Короткий далекий «рев» (не довгий гудок): швидкий підйом, коротка
 * плато, згасання ~1 с. Саундпак лише трохи міняє гучність.
 */
export function playFoghorn(pack = "default") {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  const gainScale = pack === "cinema" ? 1.15 : 1;

  try {
    const now = ac.currentTime;
    const voices: { hz: number; gain: number }[] = [
      { hz: 78, gain: 0.1 * gainScale },
      { hz: 156, gain: 0.035 * gainScale },
    ];
    for (const v of voices) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(v.hz * 0.96, now);
      osc.frequency.exponentialRampToValueAtTime(v.hz, now + 0.18);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(v.gain, now + 0.22);
      gain.gain.setValueAtTime(v.gain * 0.85, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 1.1);
    }
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Дзвіночок вівці — голос теми «Полонина» на ритуалі перерахунку.
 *
 * Два розстроєні високі тони з швидким загасанням: бляшаний дзвоник,
 * а не музична нота. Легке гойдання робимо трьома ударами, що тихішають.
 */
export function playSheepBell(pack = "default") {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  const gainScale = pack === "cinema" ? 1.2 : 1;

  try {
    const now = ac.currentTime;
    const strikes = [0, 0.16, 0.34];
    strikes.forEach((offset, i) => {
      const decay = 0.9 - i * 0.28;
      // Дві близькі, навмисно розстроєні частоти дають «бляшаний» тембр
      for (const hz of [1180, 1247]) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(hz, now + offset);
        gain.gain.setValueAtTime(0.055 * decay * gainScale, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5);
        osc.connect(gain).connect(ac.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.55);
      }
    });
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/** Дровина летить у вогонь: whoosh + thud. Тембр — rate/vol саундпака. */
export function playLogToss(pack = "default") {
  playSample("log-toss", pack, 0.85);
}

/** Універсальний «тік» на тап по кнопці / посиланню. */
export function playUiClick(pack = "default") {
  playSample("ui-click", pack, 0.7);
}

/** Тик по оленю — коротке «хрусь» гілки. */
export function playDeerStartle() {
  playSample("deer-startle", "default", 0.75);
}

/** Удар сокири по дереву біля вогнища. */
export function playWoodChop() {
  playSample("chop", "default", 0.9);
}

/** Дровина вдарила в жар — кликати, коли колода долітає. */
export function playFireBurst() {
  playSample("fire-burst", "default", 0.88);
}

/** Тап по вогнищу — коротке шкварчання жару. */
export function playFireSizzle() {
  playSample("fire-sizzle", "default", 0.72);
}

/**
 * Тап по навігаційній посилці (таби / лінки).
 * Тихіший за базовий клік: «тап прийнято», не «дію виконано».
 */
export function playUiNav(pack = "default") {
  playSample("ui-nav", pack, 0.62);
}

/** Тап по основній (btn-primary) дії. */
export function playUiConfirm(pack = "default") {
  playSample("ui-confirm", pack, 0.78);
}

/** Тап по деструктивній дії (видалити). */
export function playUiDestructive(pack = "default") {
  playSample("ui-destructive", pack, 0.75);
}

/**
 * Тик по ліхтарю маяка — короткий скляний «дзінь», відмінний від фогхорна
 * (той зарезервований за ритуалом перерахунку).
 */
export function playLighthouseDing() {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  try {
    const now = ac.currentTime;
    for (const hz of [1400, 2100]) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(hz, now);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(gain).connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    }
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}
