"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        theme="dark"
        // Під статус-баром iPhone (black-translucent) тост не має ховатись за годинником
        offset="calc(env(safe-area-inset-top) + 8px)"
        toastOptions={{
          style: {
            background: "var(--color-surface-2)",
            border: "1px solid rgba(43, 144, 254, 0.4)",
            color: "#fff",
            fontSize: "15px",
          },
        }}
      />
    </QueryClientProvider>
  );
}
