"use client";

import { create } from "zustand";
import { todayYMD } from "@/lib/date";

const SOUND_KEY = "calories_sound";

/**
 * Сигнал перерахунку калорій. Зводиться будь-якою мутацією, що змінює денний
 * підсумок (додавання / редагування / видалення їжі чи активності), і живе,
 * доки його не спожиє вогнище на Огляді. Саме тому це стор, а не подія: між
 * збереженням і показом ритуалу користувач встигає перейти на інший екран.
 */
export interface RecalcSignal {
  /** Унікальний id, щоб два поспіль однакові перерахунки не злиплися */
  id: number;
  /** Зміна ккал: додатна для їжі, відʼємна для активності чи видалення */
  delta: number;
}

interface AppState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  recalc: RecalcSignal | null;
  armRecalc: (delta: number) => void;
  consumeRecalc: () => void;

  soundEnabled: boolean;
  setSoundEnabled: (value: boolean) => void;
}

function readSound(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export const useAppStore = create<AppState>()((set) => ({
  selectedDate: todayYMD(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  recalc: null,
  armRecalc: (delta) => set({ recalc: { id: Date.now(), delta } }),
  consumeRecalc: () => set({ recalc: null }),

  // Дефолт true і на сервері, і на клієнті — читання localStorage робить
  // useSoundEnabled() після монтування, щоб не ловити hydration mismatch.
  soundEnabled: true,
  setSoundEnabled: (value) => {
    try {
      window.localStorage.setItem(SOUND_KEY, value ? "on" : "off");
    } catch {
      /* приватний режим — лишаємо стан лише в памʼяті */
    }
    set({ soundEnabled: value });
  },
}));

/** Клієнтське підтягування збереженого вибору. Викликати один раз у Providers. */
export function hydrateSoundPreference() {
  useAppStore.setState({ soundEnabled: readSound() });
}
