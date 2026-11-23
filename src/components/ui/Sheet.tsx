"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow?: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Нижня шторка. Рендериться ВСЕРЕДИНУ мобільного контейнера (#app-frame), а не в body —
 * інакше на десктопі вона розтягнулась би на все вікно поза «телефоном».
 */
export function Sheet({ open, onOpenChange, title, eyebrow, description, children }: Props) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => setContainer(document.getElementById("app-frame")), []);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="animate-fade-in absolute inset-0 z-40 bg-black/75 backdrop-blur-sm" />
        <Dialog.Content
          className="animate-sheet-up absolute inset-x-0 bottom-0 z-50 max-h-[88%] overflow-y-auto rounded-t-3xl border-t border-white/15 bg-surface-2 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),24px)] focus:outline-none"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              {eyebrow && (
                <span className="font-mono text-[10px] tracking-widest text-volt uppercase">{eyebrow}</span>
              )}
              <Dialog.Title className="mt-0.5 text-base font-bold text-white">{title}</Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Закрити"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="mb-4 text-xs leading-relaxed text-gray-400">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
