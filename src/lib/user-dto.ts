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
import type { UserDTO } from "@/lib/types";

/** Prisma User → DTO з похідним age і типізованими enum-полями. */
export function toUserDTO(user: User): UserDTO {
  const sex: Sex = isSex(user.sex) ? user.sex : "male";
  const activityLevel: ActivityLevel = isActivityLevel(user.activityLevel)
    ? user.activityLevel
    : "moderate";
  const goal: Goal = isGoal(user.goal) ? user.goal : "maintain";

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
    avatarUrl: user.avatarUrl ?? null,
  };
}
