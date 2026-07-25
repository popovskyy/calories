import { AppFrame } from "@/components/AppFrame";
import { TabBar } from "@/components/TabBar";
import { Fab } from "@/components/Fab";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      {/* pb-28: останню картку не має перекривати ні кнопка «+», ні бейдж монет */}
      <main className="app-scroll no-scrollbar flex flex-col gap-4 px-[18px] pb-28 pt-4">
        {children}
      </main>
      <Fab />
      <TabBar />
    </AppFrame>
  );
}
