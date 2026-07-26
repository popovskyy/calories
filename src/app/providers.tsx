"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeSync } from "@/components/ThemeSync";
import { hydrateSoundPreference } from "@/store/useAppStore";

/** Екрани без сесії користувача — там /api/auth/me лише дав би зайвий 401. */
function isSignedOutRoute(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/admin");
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  // localStorage читаємо після монтування — інакше перший рендер на сервері
  // й на клієнті розійшлися б
  useEffect(hydrateSoundPreference, []);

  return (
    <QueryClientProvider client={queryClient}>
      {isSignedOutRoute(pathname) ? null : <ThemeSync />}
      {children}
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
