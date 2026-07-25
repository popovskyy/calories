"use client";

import { Modal } from "@/components/ui/Dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Видалити",
  danger,
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={pending}
          style={
            danger
              ? {
                  background:
                    "linear-gradient(180deg, var(--color-red) 0%, var(--color-red-600) 100%)",
                }
              : undefined
          }
          onClick={onConfirm}
        >
          {pending ? "…" : confirmLabel}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          Скасувати
        </button>
      </div>
    </Modal>
  );
}
