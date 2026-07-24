import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface GrantedReward {
  key: string;
  coins: number;
  label: string;
}

/** Ідемпотентне нарахування: RewardClaim + coins. P2002 = уже було. */
export async function grant(
  userId: string,
  key: string,
  coins: number,
  label: string,
  out: GrantedReward[],
): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.rewardClaim.create({ data: { userId, key, coins } }),
      prisma.user.update({
        where: { id: userId },
        data: { coins: { increment: coins } },
      }),
    ]);
    if (coins > 0) out.push({ key, coins, label });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
      throw e;
    }
  }
}
