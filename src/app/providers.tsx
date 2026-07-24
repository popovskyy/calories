"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ReminderScheduler } from "@/components/ReminderToggle";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReminderScheduler />
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            border: "1px solid var(--color-divider)",
            color: "var(--color-text)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
