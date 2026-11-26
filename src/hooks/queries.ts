"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  AdaptMode,
  EquipmentDTO,
  LightsDTO,
  PlanDTO,
  ProfileDTO,
  ScanResultDTO,
  VideoResponseDTO,
} from "@/lib/types";

export const qk = {
  profile: ["profile"] as const,
  equipment: ["equipment"] as const,
  lights: ["lights"] as const,
  plan: (weekStart: string) => ["plan", weekStart] as const,
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Щось пішло не так");

/* ---------------- Світло (LED-стрічка вдома, через дошку Elme) ---------------- */

export function useLights() {
  return useQuery({
    queryKey: qk.lights,
    queryFn: async () => (await api.get<{ lights: LightsDTO }>("/api/lights")).lights,
    staleTime: 15_000,
    // Натиснули — питаємо звіт ПК кожні 3 с; ПК мовчить довго — рідше, але чекаємо, поки повернеться
    refetchInterval: (q) => (q.state.data?.pending ? (q.state.data.stale ? 15_000 : 3_000) : false),
  });
}

export function useSetLights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => (await api.post<{ lights: LightsDTO }>("/api/lights", { on })).lights,
    onMutate: async (on) => {
      await qc.cancelQueries({ queryKey: qk.lights });
      const prev = qc.getQueryData<LightsDTO>(qk.lights);
      // оптимістично: кнопка одразу починає «пульсувати»
      qc.setQueryData<LightsDTO>(qk.lights, (old) => (old ? { ...old, want: on, pending: true, stale: false, error: null } : old));
      return { prev };
    },
    onSuccess: (lights) => qc.setQueryData(qk.lights, lights),
    onError: (e, _on, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.lights, ctx.prev);
      toast.error(errMsg(e));
    },
  });
}

/* ---------------- Профіль ---------------- */

export function useProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () => (await api.get<{ profile: ProfileDTO }>("/api/profile")).profile,
  });
}

export function useSaveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: ProfileDTO) => (await api.put<{ profile: ProfileDTO }>("/api/profile", p)).profile,
    onSuccess: (profile) => {
      qc.setQueryData(qk.profile, profile);
      toast.success("Профіль збережено");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

/* ---------------- Арсенал ---------------- */

export function useEquipment() {
  return useQuery({
    queryKey: qk.equipment,
    queryFn: async () => (await api.get<{ equipment: EquipmentDTO[] }>("/api/equipment")).equipment,
  });
}

export function useScanEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (images: { mime: string; data: string }[]) =>
      api.post<ScanResultDTO>("/api/equipment/analyze", { images }),
    onSuccess: (res) => qc.setQueryData(qk.equipment, res.equipment),
    onError: (e) => toast.error(errMsg(e)),
  });
}

export type EquipmentInput = Pick<EquipmentDTO, "name" | "category" | "adjustable"> &
  Partial<Pick<EquipmentDTO, "detail" | "maxWeightKg" | "weightKg">>;

export function useAddEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EquipmentInput) =>
      (await api.post<{ item: EquipmentDTO }>("/api/equipment", input)).item,
    onSuccess: (item) => {
      qc.setQueryData<EquipmentDTO[]>(qk.equipment, (old) => [...(old ?? []), item]);
      toast.success(`Додано: ${item.name}`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

export function usePatchEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<EquipmentInput & { active: boolean }>) =>
      (await api.patch<{ item: EquipmentDTO }>(`/api/equipment/${id}`, patch)).item,
    // Оптимістично лише для швидких перемикачів; повні правки приходять із відповіді сервера.
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.equipment });
      const prev = qc.getQueryData<EquipmentDTO[]>(qk.equipment);
      qc.setQueryData<EquipmentDTO[]>(qk.equipment, (old) =>
        old?.map((e) => (e.id === id ? ({ ...e, ...patch } as EquipmentDTO) : e)),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.equipment, ctx.prev);
      toast.error(errMsg(e));
    },
    onSuccess: (item) => {
      qc.setQueryData<EquipmentDTO[]>(qk.equipment, (old) => old?.map((e) => (e.id === item.id ? item : e)));
    },
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/equipment/${id}`),
    onSuccess: (_r, id) => {
      qc.setQueryData<EquipmentDTO[]>(qk.equipment, (old) => old?.filter((e) => e.id !== id));
      toast("Предмет видалено");
    },
    onError: (e) => toast.error(errMsg(e)),
  });
}

/* ---------------- План ---------------- */

export function usePlan(weekStart: string) {
  return useQuery({
    queryKey: qk.plan(weekStart),
    queryFn: async () =>
      (await api.get<{ plan: PlanDTO | null }>(`/api/plan?weekStart=${weekStart}`)).plan,
  });
}

export function useGeneratePlan(weekStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (note?: string) =>
      (await api.post<{ plan: PlanDTO }>("/api/plan/generate", { weekStart, note: note || undefined })).plan,
    onSuccess: (plan) => {
      // Ключ — тиждень з відповіді сервера: поки йшла генерація, користувач міг перегорнути тиждень стрілками
      qc.setQueryData(qk.plan(plan.weekStart), plan);
      toast.success("Новий тиждень готовий");
    },
    onError: (e) => {
      toast.error(errMsg(e));
      // Запит міг обірватись (блокування екрана, мережа), а сервер — дописати план: підтягуємо справжній стан.
      void qc.invalidateQueries({ queryKey: qk.plan(weekStart) });
    },
  });
}

export function useAdaptDay(weekStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { dayId: string; mode: AdaptMode; note?: string }) =>
      (await api.post<{ plan: PlanDTO }>("/api/plan/adapt", { ...v, note: v.note || undefined })).plan,
    onSuccess: (plan) => {
      qc.setQueryData(qk.plan(plan.weekStart), plan);
      toast.success("Тренування адаптовано");
    },
    onError: (e) => {
      toast.error(errMsg(e));
      void qc.invalidateQueries({ queryKey: qk.plan(weekStart) });
    },
  });
}

/**
 * Hold-to-complete → запис у БД. Оптимістично: екран реагує миттєво (галочка вже
 * намальована), а при помилці мережі відкочуємось і кажемо про це.
 */
export function useToggleLog(weekStart: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { dayId: string; exerciseId: string | null; done: boolean }) => {
      const body = { dayId: v.dayId, exerciseId: v.exerciseId };
      return v.done ? api.post("/api/logs", body) : api.del("/api/logs", body);
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: qk.plan(weekStart) });
      const prev = qc.getQueryData<PlanDTO | null>(qk.plan(weekStart));
      qc.setQueryData<PlanDTO | null>(qk.plan(weekStart), (plan) => {
        if (!plan) return plan;
        return {
          ...plan,
          days: plan.days.map((d) => {
            if (d.id !== v.dayId) return d;
            if (v.exerciseId === null) {
              return { ...d, workoutCompletedAt: v.done ? new Date().toISOString() : null };
            }
            const ids = new Set(d.completedExerciseIds);
            if (v.done) ids.add(v.exerciseId);
            else ids.delete(v.exerciseId);
            return { ...d, completedExerciseIds: [...ids] };
          }),
        };
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx) qc.setQueryData(qk.plan(weekStart), ctx.prev);
      toast.error(`Не вдалося зберегти прогрес: ${errMsg(e)}`);
    },
  });
}

/* ---------------- Відео-демонстрації ---------------- */

/** Чи задано YOUTUBE_API_KEY на сервері. Поки невідомо або вимкнено — кнопка лишається простим посиланням на пошук. */
export function useVideoEnabled() {
  return useQuery({
    queryKey: ["video", "enabled"],
    queryFn: async () => (await api.get<{ enabled: boolean }>("/api/video")).enabled,
    staleTime: Infinity,
    retry: 0,
  });
}

export function useVideo(query: string | null) {
  return useQuery({
    queryKey: ["video", query],
    queryFn: () => api.get<VideoResponseDTO>(`/api/video?q=${encodeURIComponent(query as string)}`),
    enabled: !!query,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 0,
  });
}
