"use client";

import * as RD from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: ModalProps) {
  return (
    <RD.Root open={open} onOpenChange={onOpenChange}>
      <RD.Portal>
        <RD.Overlay className="dlg-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" />
        <RD.Content
          className={cn(
            "dlg-content fixed left-1/2 top-1/2 z-50 w-[calc(100%-36px)] max-w-[384px]",
            "-translate-x-1/2 -translate-y-1/2 outline-none",
            "rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-5",
            "shadow-[var(--shadow-card-lg)]",
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <RD.Title className="text-[20px] font-semibold text-[var(--color-text)]">
                {title}
              </RD.Title>
              {description ? (
                <RD.Description className="mt-1 text-[14px] text-[var(--color-muted3)]">
                  {description}
                </RD.Description>
              ) : (
                <RD.Description className="sr-only">{title}</RD.Description>
              )}
            </div>
            <RD.Close
              aria-label="Закрити"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-pill)] text-[var(--color-muted2)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)]"
            >
              <X size={18} />
            </RD.Close>
          </div>
          {children}
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
