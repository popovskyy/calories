"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { useUpdateMeal } from "@/hooks/useQueries";
import type { MealDTO } from "@/lib/types";

interface EditMealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: MealDTO | null;
  /** Дата журналу для інвалідації (може відрізнятися, якщо змінять date) */
  listDate: string;
}

export function EditMealDialog({
  open,
  onOpenChange,
  meal,
  listDate,
}: EditMealDialogProps) {
  const update = useUpdateMeal(listDate);
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [fats, setFats] = useState("");
  const [carbs, setCarbs] = useState("");

  useEffect(() => {
    if (!open || !meal) return;
    setDescription(meal.description);
    setCalories(String(meal.calories));
    setProtein(String(meal.protein));
    setFats(String(meal.fats));
    setCarbs(String(meal.carbs));
  }, [open, meal]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meal) return;

    const cal = parseInt(calories, 10);
    const p = parseInt(protein, 10);
    const f = parseInt(fats, 10);
    const c = parseInt(carbs, 10);

    if (!description.trim()) return toast.error("Вкажіть опис");
    if (![cal, p, f, c].every((n) => Number.isFinite(n) && n >= 0)) {
      return toast.error("Калорії та макроси — цілі числа ≥ 0");
    }

    try {
      await update.mutateAsync({
        id: meal.id,
        description: description.trim(),
        calories: cal,
        protein: p,
        fats: f,
        carbs: c,
      });
      toast.success("Запис оновлено");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося зберегти");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Редагувати прийом"
      description="Підправте опис або КБЖВ"
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Опис">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </Field>

        <Field label="Калорії">
          <input
            className={inputClass}
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value.replace(/[^\d]/g, ""))}
          />
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Field label="Білки">
            <input
              className={inputClass}
              inputMode="numeric"
              value={protein}
              onChange={(e) => setProtein(e.target.value.replace(/[^\d]/g, ""))}
            />
          </Field>
          <Field label="Жири">
            <input
              className={inputClass}
              inputMode="numeric"
              value={fats}
              onChange={(e) => setFats(e.target.value.replace(/[^\d]/g, ""))}
            />
          </Field>
          <Field label="Вуглеводи">
            <input
              className={inputClass}
              inputMode="numeric"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value.replace(/[^\d]/g, ""))}
            />
          </Field>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block mt-1"
          disabled={update.isPending}
        >
          {update.isPending ? "Збереження…" : "Зберегти"}
        </button>
      </form>
    </Modal>
  );
}
