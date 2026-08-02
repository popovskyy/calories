"use client";

import { ProgressRing } from "@/components/ProgressRing";
import { BlockHero } from "@/components/hero/BlockHero";
import { Campfire } from "@/components/hero/Campfire";
import { LighthouseHero } from "@/components/hero/LighthouseHero";
import { PolonynaHero } from "@/components/hero/PolonynaHero";
import { useThemeId } from "@/hooks/useThemeId";
import type { Goal } from "@/lib/calories";

export interface HeroProps {
  consumed: number;
  target: number;
  /** Рамка аватара — «neon» підсвічує кільце прогресу. */
  frame?: string | null;
  /** Ціль користувача: від неї залежить асиметрична зона «в нормі». */
  goal?: Goal;
  /**
   * Підтримка (TDEE). Потрібна героям, щоб відрізнити «на межі» від «зрив»:
   * між денною ціллю і підтримкою дефіцит ще є, тож червоний там передчасний.
   */
  maintenance?: number;
}

/**
 * Головна метафора Огляду. Єдине місце, де тема міняє не оформлення, а форму:
 * Nocturne — кільце, Forest — вогнище, Minecraft — блок, Маяк — промінь,
 * Полонина — схід сонця над хребтом.
 */
export function CalorieHero(props: HeroProps) {
  const theme = useThemeId();

  if (theme === "forest") return <Campfire {...props} />;
  if (theme === "minecraft") return <BlockHero {...props} />;
  if (theme === "lighthouse") return <LighthouseHero {...props} />;
  if (theme === "polonyna") return <PolonynaHero {...props} />;
  return <ProgressRing {...props} />;
}
