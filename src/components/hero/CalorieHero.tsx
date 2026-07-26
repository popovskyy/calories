"use client";

import { ProgressRing } from "@/components/ProgressRing";
import { BlockHero } from "@/components/hero/BlockHero";
import { Campfire } from "@/components/hero/Campfire";
import { useThemeId } from "@/hooks/useThemeId";

export interface HeroProps {
  consumed: number;
  target: number;
}

/**
 * Головна метафора Огляду. Єдине місце, де тема міняє не оформлення, а форму:
 * Nocturne — кільце, Forest — вогнище, Minecraft — блок з XP-баром.
 * Контракт пропсів однаковий, тож сторінка Огляду про тему не знає.
 */
export function CalorieHero(props: HeroProps) {
  const theme = useThemeId();

  if (theme === "forest") return <Campfire {...props} />;
  if (theme === "minecraft") return <BlockHero {...props} />;
  return <ProgressRing {...props} />;
}
