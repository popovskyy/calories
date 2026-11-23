import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вхід" };

export default function LoginPage() {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top,0px)+32px)] pb-[max(env(safe-area-inset-bottom),24px)]">
      <LoginForm />
    </main>
  );
}
