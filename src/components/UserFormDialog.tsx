"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { useSaveUser } from "@/hooks/useQueries";
import { useAppStore } from "@/store/useAppStore";
import type { UserDTO } from "@/lib/types";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDTO | null; // задано → режим редагування
}

interface FormState {
  name: string;
  targetCalories: string;
  age: string;
  weight: string;
  height: string;
}

const empty: FormState = { name: "", targetCalories: "2000", age: "30", weight: "70", height: "175" };

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEdit = !!user;
  const saveUser = useSaveUser();
  const setCurrentUserId = useAppStore((s) => s.setCurrentUserId);
  const [form, setForm] = useState<FormState>(empty);

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? {
            name: user.name,
            targetCalories: String(user.targetCalories),
            age: String(user.age),
            weight: String(user.weight),
            height: String(user.height),
          }
        : empty,
    );
  }, [open, user]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    const targetCalories = parseInt(form.targetCalories, 10);
    if (!name) return toast.error("Введіть ім'я профілю");
    if (!targetCalories || targetCalories <= 0)
      return toast.error("Вкажіть цільові калорії");

    try {
      const saved = await saveUser.mutateAsync({
        id: user?.id,
        name,
        targetCalories,
        age: parseInt(form.age, 10) || undefined,
        weight: parseFloat(form.weight) || undefined,
        height: parseFloat(form.height) || undefined,
      });
      if (!isEdit) setCurrentUserId(saved.id);
      toast.success(isEdit ? "Профіль оновлено" : `Профіль «${saved.name}» створено`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося зберегти");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Редагувати профіль" : "Новий профіль"}
      description={isEdit ? undefined : "Створіть профіль зі своєю денною нормою калорій"}
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Ім'я">
          <input
            className={inputClass}
            value={form.name}
            onChange={set("name")}
            placeholder="Напр. Олег"
            autoFocus
          />
        </Field>
        <Field label="Цільові калорії, ккал/день">
          <input
            className={inputClass}
            value={form.targetCalories}
            onChange={set("targetCalories")}
            inputMode="numeric"
            placeholder="2000"
          />
        </Field>
        <div className="flex gap-3">
          <Field label="Вік">
            <input className={inputClass} value={form.age} onChange={set("age")} inputMode="numeric" />
          </Field>
          <Field label="Вага, кг">
            <input className={inputClass} value={form.weight} onChange={set("weight")} inputMode="decimal" />
          </Field>
          <Field label="Зріст, см">
            <input className={inputClass} value={form.height} onChange={set("height")} inputMode="decimal" />
          </Field>
        </div>
        <button type="submit" className="btn btn-primary btn-block mt-1" disabled={saveUser.isPending}>
          {saveUser.isPending ? "Збереження…" : isEdit ? "Зберегти зміни" : "Створити профіль"}
        </button>
      </form>
    </Modal>
  );
}
