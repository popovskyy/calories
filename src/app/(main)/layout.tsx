import { AppFrame } from "@/components/AppFrame";
import { TabBar } from "@/components/TabBar";
import { Fab } from "@/components/Fab";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      <main className="no-scrollbar min-h-0 flex-1 flex flex-col gap-4 overflow-y-auto overscroll-contain px-[18px] pb-14 pt-4">
        {children}
      </main>
      <Fab />
      <TabBar />
    </AppFrame>
  );
}
