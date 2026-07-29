import { AppFrame } from "@/components/AppFrame";
import { AppScroll } from "@/components/AppScroll";
import { AmbientLayer } from "@/components/ambient/AmbientLayer";
import { TabBar } from "@/components/TabBar";
import { Fab } from "@/components/Fab";
import { RewardCelebrations } from "@/components/RewardCelebrations";
import { GlobalClickFx } from "@/components/GlobalClickFx";
import { RoutePrefetcher } from "@/components/RoutePrefetcher";
import { PunishmentSoundtrack } from "@/components/PunishmentSoundtrack";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppFrame>
      <AmbientLayer />
      <AppScroll className="app-scroll no-scrollbar relative z-10 flex flex-col gap-4 px-[18px] pb-24 pt-4">
        {children}
      </AppScroll>
      <Fab />
      <TabBar />
      <RewardCelebrations />
      <GlobalClickFx />
      <PunishmentSoundtrack />
      <RoutePrefetcher />
    </AppFrame>
  );
}
