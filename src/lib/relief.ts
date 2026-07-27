import { prisma } from "@/lib/prisma";
import { weekStartYMD } from "@/lib/date";
import { grant, type GrantedReward } from "@/lib/reward-grant";
import { RELIEF_AMOUNT, RELIEF_THRESHOLD } from "@/lib/economy";

/**
 * Фонд підйомних — страховка від глухого кута.
 *
 * Гравець із нульовим балансом не може купити щит, відкрити скриньку чи
 * прийняти дуель. Без клапана він просто перестає взаємодіяти з половиною
 * застосунку, і жодна мотивація вже не працює.
 *
 * Обмеження роблять фонд нешкідливим для економіки:
 *   · раз на тиждень (ключ relief:<понеділок> у RewardClaim)
 *   · лише коли баланс реально нижчий за поріг
 * Тобто це не джерело доходу, а те, що не дає грі зупинитись.
 */

export interface ReliefStatus {
  /** Чи можна забрати підйомні просто зараз. */
  available: boolean;
  /** Уже брав цього тижня. */
  claimedThisWeek: boolean;
  amount: number;
  threshold: number;
  coins: number;
}

export async function getReliefStatus(userId: string): Promise<ReliefStatus> {
  const key = `relief:${weekStartYMD()}`;

  const [user, claim] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { coins: true } }),
    prisma.rewardClaim.findUnique({
      where: { userId_key: { userId, key } },
      select: { id: true },
    }),
  ]);

  const coins = user?.coins ?? 0;
  const claimedThisWeek = !!claim;

  return {
    available: !claimedThisWeek && coins < RELIEF_THRESHOLD,
    claimedThisWeek,
    amount: RELIEF_AMOUNT,
    threshold: RELIEF_THRESHOLD,
    coins,
  };
}

/** Видає підйомні. Ідемпотентно: другий виклик того ж тижня нічого не робить. */
export async function claimRelief(
  userId: string,
): Promise<{ ok: true; granted: GrantedReward[] } | { ok: false; error: string }> {
  const status = await getReliefStatus(userId);

  if (status.claimedThisWeek) {
    return { ok: false, error: "Підйомні цього тижня вже отримано" };
  }
  if (status.coins >= RELIEF_THRESHOLD) {
    return {
      ok: false,
      error: `Підйомні лише коли монет менше ніж ${RELIEF_THRESHOLD}`,
    };
  }

  const granted: GrantedReward[] = [];
  await grant(
    userId,
    `relief:${weekStartYMD()}`,
    RELIEF_AMOUNT,
    "Підйомні з фонду",
    granted,
  );
  return { ok: true, granted };
}
