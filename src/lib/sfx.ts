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

/** Дровина летить у вогонь: whoosh + тріск. Мовчить, якщо звук вимкнено. */
export function playLogToss(enabled: boolean) {
  if (!enabled || prefersReducedMotion()) return;
  const ac = getContext();
  if (!ac) return;

  try {
    const now = ac.currentTime;

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

    // тріск гілки при ударі об вогнище
    [0.5, 0.58, 0.71].forEach((offset, i) => {
      const osc = ac.createOscillator();
      const oscGain = ac.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160 - i * 30, now + offset);
      oscGain.gain.setValueAtTime(0.09, now + offset);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.07);
      osc.connect(oscGain).connect(ac.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.08);
    });
  } catch {
    /* звук ніколи не має ламати навігацію */
  }
}
