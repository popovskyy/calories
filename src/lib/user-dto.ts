import type { User } from "@prisma/client";
import {
  ageFromBirth,
  isActivityLevel,
  isGoal,
  isSex,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "@/lib/calories";
import { normalizeAvatarUrl } from "@/lib/avatar-presets";
import { DEFAULT_THEME, isThemeId } from "@/lib/theme-catalog";
import type { UserDTO } from "@/lib/types";

/** Prisma User → DTO з похідним age і типізованими enum-полями. */
export function toUserDTO(user: User): UserDTO {
  const sex: Sex = isSex(user.sex) ? user.sex : "male";
  const activityLevel: ActivityLevel = isActivityLevel(user.activityLevel)
    ? user.activityLevel
    : "moderate";
  const goal: Goal = isGoal(user.goal) ? user.goal : "maintain";
  const theme = isThemeId(user.theme) ? user.theme : DEFAULT_THEME;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    targetCalories: user.targetCalories,
    birthYear: user.birthYear,
    birthMonth: user.birthMonth,
    sex,
    activityLevel,
    goal,
    weight: user.weight,
    height: user.height,
    age: ageFromBirth(user.birthYear, user.birthMonth),
    avatarUrl: normalizeAvatarUrl(user.avatarUrl ?? null),
    theme,
    targetWeight: user.targetWeight ?? null,
    startWeight: user.startWeight ?? null,
    startWeightDate: user.startWeightDate ?? null,
    approved: user.approved ?? true,
    blocked: user.blockedAt != null,
    blockReason: user.blockReason ?? null,
  };
}
