"use client";

import { create } from "zustand";
import { todayYMD } from "@/lib/date";

interface AppState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  selectedDate: todayYMD(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
