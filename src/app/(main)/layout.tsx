import { AppFrame } from "@/components/AppFrame";
import { TabBar } from "@/components/TabBar";
import { Fab } from "@/components/Fab";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      <main className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto px-[18px] pb-6 pt-5">
        {children}
      </main>
      <Fab />
      <TabBar />
    </AppFrame>
  );
}
