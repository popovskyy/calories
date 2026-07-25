import { AppFrame } from "@/components/AppFrame";
import { TabBar } from "@/components/TabBar";
import { Fab } from "@/components/Fab";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      <main className="app-scroll no-scrollbar flex flex-col gap-4 px-[18px] pb-24 pt-4">
        {children}
      </main>
      <Fab />
      <TabBar />
    </AppFrame>
  );
}
