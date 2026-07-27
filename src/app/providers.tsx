"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeSync } from "@/components/ThemeSync";
import { PendingApprovalGate } from "@/components/PendingApprovalGate";

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

  const signedOut = isSignedOutRoute(pathname);

  return (
    <QueryClientProvider client={queryClient}>
      {signedOut ? null : <ThemeSync />}
      {children}
      {signedOut ? null : <PendingApprovalGate />}
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
