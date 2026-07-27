"use client";

import { create } from "zustand";
import { todayYMD } from "@/lib/date";

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
}

export const useAppStore = create<AppState>()((set) => ({
  selectedDate: todayYMD(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  recalc: null,
  armRecalc: (delta) => set({ recalc: { id: Date.now(), delta } }),
  consumeRecalc: () => set({ recalc: null }),
}));
