"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { useChangePassword } from "@/hooks/useQueries";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const change = useChangePassword();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (!open) return;
    setCurrent("");
    setNew("");
    setConfirm("");
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return toast.error("Новий пароль мін. 6 символів");
    }
    if (newPassword !== confirm) {
      return toast.error("Паролі не збігаються");
    }
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      toast.success("Пароль змінено");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не вдалося змінити");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Змінити пароль"
      description="Після зміни увійдіть з новим паролем на інших пристроях"
    >
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Поточний пароль">
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="Новий пароль" hint="Мін. 6 символів">
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
          />
        </Field>
        <Field label="Повторіть новий">
          <input
            className={inputClass}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <button
          type="submit"
          className="btn btn-primary btn-block mt-1"
          disabled={change.isPending}
        >
          {change.isPending ? "Збереження…" : "Зберегти пароль"}
        </button>
      </form>
    </Modal>
  );
}
