"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { useAppStore } from "@/store/useAppStore";
import type { UserDTO } from "@/lib/types";
import { GOAL_LABELS } from "@/lib/calories";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserDTO | null;
}

export function SettingsDialog({ open, onOpenChange, user }: SettingsDialogProps) {
  const geminiApiKey = useAppStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useAppStore((s) => s.setGeminiApiKey);
  const [key, setKey] = useState("");

  useEffect(() => {
    if (!open) return;
    setKey(geminiApiKey);
  }, [open, geminiApiKey]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiApiKey(key.trim());
    toast.success("Налаштування збережено");
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Налаштування"
      description={
        user
          ? `${user.name} · ${user.targetCalories.toLocaleString("uk-UA")} ккал (${GOAL_LABELS[user.goal].toLowerCase()})`
          : undefined
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        {user ? (
          <p className="text-[15px] leading-relaxed text-[var(--color-muted2)]">
            Денну норму калорій змінюйте в профілі (вага, активність, мета). Тут лише
            ключ для ШІ-аналізу.
          </p>
        ) : null}
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
        <button type="submit" className="btn btn-primary btn-block mt-1">
          Зберегти
        </button>
      </form>
    </Modal>
  );
}
