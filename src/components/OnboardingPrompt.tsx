"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { UserFormDialog } from "@/components/UserFormDialog";

export function OnboardingPrompt() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <EmptyState
        icon={UserPlus}
        title="Створіть перший профіль"
        subtitle="Додайте профіль зі своєю денною нормою калорій, щоб почати вести журнал харчування."
        action={
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            Створити профіль
          </button>
        }
      />
      <UserFormDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
