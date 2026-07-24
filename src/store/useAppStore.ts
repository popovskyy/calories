"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayYMD } from "@/lib/date";

interface AppState {
  currentUserId: string | null;
  selectedDate: string; // YYYY-MM-DD (не персиститься — завжди старт із сьогодні)
  geminiApiKey: string;

  setCurrentUserId: (id: string | null) => void;
  setSelectedDate: (date: string) => void;
  setGeminiApiKey: (key: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUserId: null,
      selectedDate: todayYMD(),
      geminiApiKey: "",

      setCurrentUserId: (id) => set({ currentUserId: id }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
    }),
    {
      name: "calories-app",
      // selectedDate свідомо не зберігаємо між сесіями
      partialize: (s) => ({
        currentUserId: s.currentUserId,
        geminiApiKey: s.geminiApiKey,
      }),
    },
  ),
);
