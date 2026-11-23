import { TabBar } from "@/components/TabBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Контент під статус-баром (black-translucent) → відступ на safe-area-inset-top */}
      <main className="phone-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-[max(env(safe-area-inset-top),14px)] pb-8">
        {children}
      </main>
      <TabBar />
    </>
  );
}
