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
            "dlg-content fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-24px)] max-w-[400px]",
            "max-h-[min(92dvh,720px)] -translate-x-1/2 -translate-y-1/2 flex-col outline-none",
            "rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-card-lg)]",
            className,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-5">
            <div className="min-w-0">
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
          <div
            className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4"
          >
            {children}
          </div>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}
