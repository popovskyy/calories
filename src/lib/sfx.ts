/**
 * Звуки без ассетів — усе синтезується WebAudio.
 *
 * Рецепт «підкидання дровини» з дизайн-хендофу: whoosh (білий шум крізь
 * lowpass 320 → 1600 → 500 Hz) плюс три square-тріски гілки на 0.5 / 0.58 / 0.71s.
 *
 * AudioContext створюється лениво при першому виклику: мобільні браузери
 * дозволяють звук лише після жесту користувача, а до першого тапу контекст
 * взагалі не потрібен.
 */

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

/**
 * Профілі саундпаків.
 *
 * Пакет змінює саме тембр удару: тип хвилі, висоту й кількість тріскотів.
 * Оскільки все синтезується, новий пакет — це кілька чисел, а не аудіофайл.
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
  // Теплий, ненав'язливий — оригінальний рецепт дизайн-хендофу.
  default: {
    wave: "square",
    baseHz: 160,
    stepHz: 30,
    hits: [0.5, 0.58, 0.71],
    punch: 0.09,
    whoosh: true,
  },
  // Сухий дерев'яний «клац» — два коротких удари, без шуму.
  blocky: {
    wave: "triangle",
    baseHz: 220,
    stepHz: 70,
    hits: [0.48, 0.56],
    punch: 0.13,
    whoosh: false,
  },
  // 8-біт: висока пила, чотири швидкі ноти вгору-вниз.
  retro: {
    wave: "sawtooth",
    baseHz: 440,
    stepHz: -90,
    hits: [0.46, 0.53, 0.6, 0.67],
    punch: 0.07,
    whoosh: false,
  },
  // Кіно: низький синус із довгим шумовим підйомом.
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
 * Завжди cinema: низький бас у два удари — впізнавано, але тихіше за перемогу.
 */
export function playSaveAck() {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  try {
    const now = ac.currentTime;
    const f = FANFARE.cinema!;
    f.notes.forEach((hz, i) => {
      const at = now + i * 0.11;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = f.wave;
      osc.frequency.setValueAtTime(hz, at);
      gain.gain.setValueAtTime(f.gain * 0.72, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
      osc.connect(gain).connect(ac.destination);
      osc.start(at);
      osc.stop(at + 0.35);
    });
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
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

/**
 * Дровина летить у вогонь: whoosh + тріск. Тембр залежить від саундпака.
 */
export function playLogToss(pack = "default") {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  const p = getPackProfile(pack);

  try {
    const now = ac.currentTime;

    if (p.whoosh) {
      // whoosh — білий шум із рухомим lowpass
      const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 1.2), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.7;
      }
      const source = ac.createBufferSource();
      source.buffer = buffer;

      const lowpass = ac.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.setValueAtTime(320, now);
      lowpass.frequency.exponentialRampToValueAtTime(1600, now + 0.5);
      lowpass.frequency.exponentialRampToValueAtTime(500, now + 1.1);

      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.14, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);

      source.connect(lowpass).connect(gain).connect(ac.destination);
      source.start(now);
      source.stop(now + 1.2);
    }

    // удар(и) — саме тут чутно різницю між пакетами
    p.hits.forEach((offset, i) => {
      const osc = ac.createOscillator();
      const oscGain = ac.createGain();
      osc.type = p.wave;
      // Частота не може впасти до нуля або нижче — інакше WebAudio кине помилку.
      const hz = Math.max(40, p.baseHz - i * p.stepHz);
      osc.frequency.setValueAtTime(hz, now + offset);
      oscGain.gain.setValueAtTime(p.punch, now + offset);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.07);
      osc.connect(oscGain).connect(ac.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.08);
    });
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Універсальний «тік» на будь-який тап по кнопці чи посиланню.
 *
 * Найчастіший звук у застосунку, тому найдешевший: один короткий синус
 * (~40 мс) без шуму й без ланцюжка ударів. Тембр трохи різний по пакетах,
 * щоб куплений саундпак відчувався і тут, а не лише у фінішері.
 */
const CLICK_HZ: Record<string, number> = {
  default: 720,
  blocky: 540,
  retro: 880,
  cinema: 360,
};

export function playUiClick(pack = "default") {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = pack === "retro" ? "square" : "sine";
    osc.frequency.setValueAtTime(CLICK_HZ[pack] ?? CLICK_HZ.default!, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Тик по оленю (без ритуалу дровини) — коротке «хрусь» гілки під копитом.
 * Тихіший і різкіший за logToss, щоб не плутався з ним.
 */
export function playDeerStartle() {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  try {
    const now = ac.currentTime;
    [0, 0.05].forEach((offset, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(300 - i * 60, now + offset);
      gain.gain.setValueAtTime(0.1, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.06);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.07);
    });
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Удар сокири по дереву біля вогнища.
 * Низький стук + тріск кори + короткий «клинок» — щоб кожен тап було чути.
 */
export function playWoodChop() {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  const run = () => {
    try {
      const now = ac.currentTime;

      // 1) Низький стук по стовбуру
      const thud = ac.createOscillator();
      const thudGain = ac.createGain();
      thud.type = "sine";
      thud.frequency.setValueAtTime(95, now);
      thud.frequency.exponentialRampToValueAtTime(48, now + 0.09);
      thudGain.gain.setValueAtTime(0.28, now);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      thud.connect(thudGain).connect(ac.destination);
      thud.start(now);
      thud.stop(now + 0.11);

      // 2) Тріск деревини (шум)
      const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.1), ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const env = Math.pow(1 - i / data.length, 1.6);
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const crack = ac.createBufferSource();
      crack.buffer = buffer;
      const hip = ac.createBiquadFilter();
      hip.type = "bandpass";
      hip.frequency.setValueAtTime(1400, now);
      hip.Q.setValueAtTime(1.2, now);
      const crackGain = ac.createGain();
      crackGain.gain.setValueAtTime(0.22, now);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
      crack.connect(hip).connect(crackGain).connect(ac.destination);
      crack.start(now);
      crack.stop(now + 0.1);

      // 3) Короткий «клинок» / друге дерево
      const blade = ac.createOscillator();
      const bladeGain = ac.createGain();
      blade.type = "triangle";
      blade.frequency.setValueAtTime(320, now + 0.012);
      blade.frequency.exponentialRampToValueAtTime(140, now + 0.07);
      bladeGain.gain.setValueAtTime(0.0001, now);
      bladeGain.gain.linearRampToValueAtTime(0.12, now + 0.014);
      bladeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      blade.connect(bladeGain).connect(ac.destination);
      blade.start(now);
      blade.stop(now + 0.09);
    } catch {
      /* звук ніколи не має ламати навігацію */
    }
  };

  // Якщо контекст ще suspended — граємо після resume, інакше перший тап німий
  if (ac.state === "suspended") {
    void ac.resume().then(run).catch(() => {});
    return;
  }
  run();
}

/**
 * Дровина вдарила в жар: тріск + низький «рокіт» полум'я.
 * Окремо від whoosh польоту — кликати, коли колода долітає.
 */
export function playFireBurst() {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  const run = () => {
    try {
      const now = ac.currentTime;

      // Шипіння / тріск жару
      const crackBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.55), ac.sampleRate);
      const crackData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackData.length; i++) {
        const t = i / crackData.length;
        const env = Math.sin(Math.PI * Math.min(1, t * 1.35)) * Math.pow(1 - t, 0.55);
        // Рідкі «клацання» вугілля
        const pop = Math.random() > 0.985 ? Math.random() * 0.9 : 0;
        crackData[i] = ((Math.random() * 2 - 1) * 0.55 + pop) * env;
      }
      const crack = ac.createBufferSource();
      crack.buffer = crackBuf;
      const band = ac.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.setValueAtTime(1800, now);
      band.frequency.exponentialRampToValueAtTime(700, now + 0.45);
      band.Q.setValueAtTime(0.7, now);
      const crackGain = ac.createGain();
      crackGain.gain.setValueAtTime(0.0001, now);
      crackGain.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      crack.connect(band).connect(crackGain).connect(ac.destination);
      crack.start(now);
      crack.stop(now + 0.55);

      // Низький рокіт полум'я
      const roarBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.7), ac.sampleRate);
      const roarData = roarBuf.getChannelData(0);
      for (let i = 0; i < roarData.length; i++) {
        const t = i / roarData.length;
        const env = Math.sin(Math.PI * Math.min(1, t * 1.2)) * (1 - t * 0.65);
        roarData[i] = (Math.random() * 2 - 1) * env;
      }
      const roar = ac.createBufferSource();
      roar.buffer = roarBuf;
      const low = ac.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.setValueAtTime(220, now);
      low.frequency.exponentialRampToValueAtTime(380, now + 0.2);
      low.frequency.exponentialRampToValueAtTime(160, now + 0.65);
      const roarGain = ac.createGain();
      roarGain.gain.setValueAtTime(0.0001, now);
      roarGain.gain.exponentialRampToValueAtTime(0.24, now + 0.06);
      roarGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      roar.connect(low).connect(roarGain).connect(ac.destination);
      roar.start(now);
      roar.stop(now + 0.72);

      // Два швидких «клаци» вугілля
      [0.05, 0.14, 0.28].forEach((offset, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(180 - i * 35, now + offset);
        g.gain.setValueAtTime(0.07, now + offset);
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.045);
        osc.connect(g).connect(ac.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.05);
      });
    } catch {
      /* звук ніколи не має ламати навігацію */
    }
  };

  if (ac.state === "suspended") {
    void ac.resume().then(run).catch(() => {});
    return;
  }
  run();
}

/**
 * Тап по вогнищу — коротке шкварчання жару (тихіше за fireBurst).
 */
export function playFireSizzle() {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  const run = () => {
    try {
      const now = ac.currentTime;

      // Шипіння жиру/жару
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.38), ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / data.length;
        const env = Math.pow(1 - t, 0.4) * (0.55 + 0.45 * Math.sin(t * Math.PI));
        const hiss = (Math.random() * 2 - 1) * 0.7;
        const pop = Math.random() > 0.97 ? (Math.random() * 2 - 1) * 0.8 : 0;
        data[i] = (hiss * 0.65 + pop) * env;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const hip = ac.createBiquadFilter();
      hip.type = "highpass";
      hip.frequency.setValueAtTime(900, now);
      const band = ac.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.setValueAtTime(2400, now);
      band.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      band.Q.setValueAtTime(0.55, now);
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);
      src.connect(hip).connect(band).connect(gain).connect(ac.destination);
      src.start(now);
      src.stop(now + 0.38);

      // Пара клацань вугілля
      [0.02, 0.09, 0.18].forEach((offset, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(260 - i * 50, now + offset);
        g.gain.setValueAtTime(0.055, now + offset);
        g.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.04);
        osc.connect(g).connect(ac.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.045);
      });
    } catch {
      /* звук ніколи не має ламати навігацію */
    }
  };

  if (ac.state === "suspended") {
    void ac.resume().then(run).catch(() => {});
    return;
  }
  run();
}

/**
 * Тап по навігаційній посилці (таби внизу, лінки на інші сторінки).
 *
 * Навмисно тихіший і нижчий за базовий клік: перехід між сторінками не
 * миттєвий (завантаження даних), тому звук не повинен звучати як
 * «дію виконано» — радше як «тап прийнято, зачекай».
 */
export function playUiNav(pack = "default") {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = pack === "retro" ? "square" : "sine";
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.09);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Тап по основній (btn-primary) дії — «Зберегти», «Розрахувати» тощо.
 * Два висхідних тони замість одного: помітніше підтверджує вагому дію.
 */
export function playUiConfirm(pack = "default") {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  try {
    const now = ac.currentTime;
    const base = CLICK_HZ[pack] ?? CLICK_HZ.default!;
    [base, base * 1.28].forEach((hz, i) => {
      const at = now + i * 0.05;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = pack === "retro" ? "square" : "triangle";
      osc.frequency.setValueAtTime(hz, at);
      gain.gain.setValueAtTime(0.06, at);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      osc.connect(gain).connect(ac.destination);
      osc.start(at);
      osc.stop(at + 0.09);
    });
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/** Тап по деструктивній дії (видалити) — короткий низький «снап». */
export function playUiDestructive() {
  if (!soundAllowed()) return;
  const ac = getContext();
  if (!ac) return;

  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
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
