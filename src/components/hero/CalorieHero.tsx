"use client";

import { ProgressRing } from "@/components/ProgressRing";
import { BlockHero } from "@/components/hero/BlockHero";
import { Campfire } from "@/components/hero/Campfire";
import { useThemeId } from "@/hooks/useThemeId";
import type { Goal } from "@/lib/calories";

export interface HeroProps {
  consumed: number;
  target: number;
  frame?: string | null;
  goal?: Goal;
  maintenance?: number;
}

export function CalorieHero(props: HeroProps) {
  const theme = useThemeId();

  if (theme === "forest") return <Campfire {...props} />;
  if (theme === "minecraft") return <BlockHero {...props} />;
  return <ProgressRing {...props} />;
}
