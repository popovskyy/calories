import { AppFrame } from "@/components/AppFrame";
import { AmbientLayer } from "@/components/ambient/AmbientLayer";
import { TabBar } from "@/components/TabBar";
import { Fab } from "@/components/Fab";
import { RewardCelebrations } from "@/components/RewardCelebrations";
import { GlobalClickFx } from "@/components/GlobalClickFx";
import { RoutePrefetcher } from "@/components/RoutePrefetcher";
import { MainTabsProvider } from "@/components/MainTabs";
import { MainTabPanels } from "@/components/MainTabPanels";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainTabsProvider>
      <AppFrame>
        <AmbientLayer />
        <main className="relative z-10 flex flex-col gap-4 px-[18px] pb-24 pt-4">
          <MainTabPanels>{children}</MainTabPanels>
        </main>
        <Fab />
        <TabBar />
        <RewardCelebrations />
        <GlobalClickFx />
        <RoutePrefetcher />
      </AppFrame>
    </MainTabsProvider>
  );
}
