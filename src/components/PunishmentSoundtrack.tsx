"use client";

import { useEffect, useRef } from "react";
import { useCurrentUser } from "@/hooks/useQueries";
import { getSettings, subscribeSettings } from "@/lib/settings";

const SRC = "/sounds/peppa-punishment.mp3";

/**
 * Модульний singleton — layout Next може ремаунтитись, а саундтрек має
 * жити як один фоновий трек між переходами по табах.
 */
let sharedAudio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement {
  if (!sharedAudio) {
    const a = new Audio();
    a.src = SRC;
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.55;
    // Не блокуємо рендер: load у фоні.
    try {
      a.load();
    } catch {
      /* ignore */
    }
    sharedAudio = a;
  }
  return sharedAudio;
}

async function tryPlay(audio: HTMLAudioElement): Promise<boolean> {
  try {
    await audio.play();
    unlocked = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Фоновий саундтрек покарання: грузить mp3 асинхронно, стартує коли ready,
 * не перезапускається при навігації. Якщо браузер блокує autoplay —
 * вмикаємо на перший жест юзера.
 */
export function PunishmentSoundtrack() {
  const { user } = useCurrentUser();
  const active = Boolean(user?.punishmentActive);
  const waitingGesture = useRef(false);

  useEffect(() => {
    if (!active) {
      if (sharedAudio && !sharedAudio.paused) {
        sharedAudio.pause();
        sharedAudio.currentTime = 0;
      }
      waitingGesture.current = false;
      return;
    }

    if (!getSettings().sound) return;

    const audio = getAudio();

    const start = () => {
      if (!getSettings().sound) return;
      void tryPlay(audio);
    };

    const onReady = () => {
      if (unlocked) {
        start();
        return;
      }
      void tryPlay(audio).then((ok) => {
        if (ok || waitingGesture.current) return;
        waitingGesture.current = true;
        const unlock = () => {
          waitingGesture.current = false;
          start();
          window.removeEventListener("pointerdown", unlock);
          window.removeEventListener("keydown", unlock);
          window.removeEventListener("touchstart", unlock);
        };
        window.addEventListener("pointerdown", unlock, { once: true });
        window.addEventListener("keydown", unlock, { once: true });
        window.addEventListener("touchstart", unlock, { once: true });
      });
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      onReady();
    } else {
      audio.addEventListener("canplaythrough", onReady, { once: true });
      // Фолбек, якщо canplaythrough уже пройшов / не стрільне
      audio.addEventListener("canplay", onReady, { once: true });
    }

    const unsub = subscribeSettings(() => {
      if (!getSettings().sound) {
        audio.pause();
      } else if (active) {
        start();
      }
    });

    return () => {
      unsub();
      // Не pause() тут — інакше саундтрек глухне при ремаунті layout.
      // Справжній стоп лише коли punishmentActive стає false (гілка вище).
    };
  }, [active]);

  return null;
}
