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
 */
export function playFinisher(enabled: boolean, pack = "default") {
  if (!enabled || prefersReducedMotion()) return;
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
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}

/**
 * Дровина летить у вогонь: whoosh + тріск. Мовчить, якщо звук вимкнено.
 * Тембр залежить від вдягненого саундпака.
 */
export function playLogToss(enabled: boolean, pack = "default") {
  if (!enabled || prefersReducedMotion()) return;
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
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.45);
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
