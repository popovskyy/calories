"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { todayYMD } from "@/lib/date";

interface AppState {
  selectedDate: string;
  geminiApiKey: string;
  setSelectedDate: (date: string) => void;
  setGeminiApiKey: (key: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedDate: todayYMD(),
      geminiApiKey: "",
      setSelectedDate: (date) => set({ selectedDate: date }),
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
    }),
    {
      name: "calories-app",
      partialize: (s) => ({ geminiApiKey: s.geminiApiKey }),
    },
  ),
);
