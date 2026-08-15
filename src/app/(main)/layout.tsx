import { AppFrame } from "@/components/AppFrame";
import { AmbientLayer } from "@/components/ambient/AmbientLayer";
import { TabBar } from "@/components/TabBar";
import { Fab } from "@/components/Fab";
import { RoutePrefetcher } from "@/components/RoutePrefetcher";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      <AmbientLayer />
      <main className="relative z-10 flex flex-col gap-4 px-[18px] pb-24 pt-4">
        {children}
      </main>
      <Fab />
      <TabBar />
      <RoutePrefetcher />
    </AppFrame>
  );
}
