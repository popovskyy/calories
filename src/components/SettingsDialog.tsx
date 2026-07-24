"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { useSaveUser } from "@/hooks/useQueries";
import { useAppStore } from "@/store/useAppStore";
import type { UserDTO } from "@/lib/types";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserDTO | null;
}

export function SettingsDialog({ open, onOpenChange, user }: SettingsDialogProps) {
  const saveUser = useSaveUser();
  const geminiApiKey = useAppStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useAppStore((s) => s.setGeminiApiKey);

  const [target, setTarget] = useState("");
  const [key, setKey] = useState("");

  useEffect(() => {
    if (!open) return;
    setTarget(user ? String(user.targetCalories) : "");
    setKey(geminiApiKey);
  }, [open, user, geminiApiKey]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(key.trim());
    if (user) {
      const t = parseInt(target, 10);
      if (!t || t <= 0) return toast.error("Вкажіть цільові калорії");
      if (t !== user.targetCalories) {
        try {
          await saveUser.mutateAsync({ id: user.id, name: user.name, targetCalories: t });
        } catch (err) {
          return toast.error(err instanceof Error ? err.message : "Помилка збереження");
        }
      }
    }
    toast.success("Налаштування збережено");
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Налаштування"
      description={user ? `Профіль: ${user.name}` : undefined}
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Цільові калорії, ккал/день">
          <input
            className={inputClass}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="numeric"
            placeholder="2000"
            disabled={!user}
          />
        </Field>
        <Field
          label="GEMINI_API_KEY"
          hint="Ключ Google Gemini для ШІ-аналізу. Зберігається лише у вашому браузері."
        >
          <input
            className={inputClass}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            type="password"
            placeholder="AIza…"
            autoComplete="off"
          />
        </Field>
        <button type="submit" className="btn btn-primary btn-block mt-1" disabled={saveUser.isPending}>
          {saveUser.isPending ? "Збереження…" : "Зберегти"}
        </button>
      </form>
    </Modal>
  );
}
