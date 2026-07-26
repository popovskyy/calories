import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { todayYMD } from "@/lib/date";
import { DOUBLER_ITEM_ID } from "@/lib/items";

export interface GrantedReward {
  key: string;
  coins: number;
  label: string;
}

/** Тип операції в гаманці — для іконки й групування в історії. */
export type TxnKind =
  | "reward"
  | "quest"
  | "arena"
  | "streak"
  | "daily_card"
  | "epic"
  | "duel"
  | "skin"
  | "theme"
  | "item"
  | "box"
  | "cosmetic"
  | "admin";

/** Ключ `arena:YMD` → "arena". Тримає гаманець читабельним без зайвих аргументів. */
function kindFromKey(key: string): TxnKind {
  const prefix = key.split(":")[0] ?? "";
  if (prefix === "quest") return "quest";
  if (prefix === "arena") return "arena";
  if (prefix === "streak" || prefix === "streak_div") return "streak";
  if (prefix === "dc") return "daily_card";
  if (prefix === "epic") return "epic";
  if (prefix === "duel") return "duel";
  return "reward";
}

/**
 * Чи діє подвоювач на цю конкретну нагороду.
 *
 * Множник навмисно прив'язаний до дати В КЛЮЧІ, а не до моменту виклику:
 * нагороди за закриті дні донараховуються ліниво, тож інакше можна було б
 * активувати подвоювач і одразу «добити» три вчорашні дні за подвійним тарифом.
 * Ключі без дати (streak:N, quest:…) подвоєнню не підлягають взагалі.
 */
async function multiplierFor(userId: string, key: string): Promise<number> {
  const today = todayYMD();
  const parts = key.split(":");
  const hasToday = parts.includes(today);
  if (!hasToday) return 1;

  const used = await prisma.itemUse.count({
    where: { userId, itemId: DOUBLER_ITEM_ID, date: today },
  });
  return used > 0 ? 2 : 1;
}

/**
 * Ідемпотентне нарахування: RewardClaim + coins + запис у гаманець. P2002 = уже було.
 *
 * RewardClaim лишається сторожем унікальності (саме його @@unique ловить
 * повторний виклик), CoinTxn пишеться в тій самій транзакції, тож історія
 * гаманця не може розійтися з балансом.
 */
export async function grant(
  userId: string,
  key: string,
  coins: number,
  label: string,
  out: GrantedReward[],
): Promise<void> {
  const mult = coins > 0 ? await multiplierFor(userId, key) : 1;
  const amount = coins * mult;
  const finalLabel = mult > 1 ? `${label} ×2` : label;

  try {
    await prisma.$transaction([
      prisma.rewardClaim.create({ data: { userId, key, coins: amount } }),
      prisma.user.update({
        where: { id: userId },
        data: { coins: { increment: amount } },
      }),
      ...(amount > 0
        ? [
            prisma.coinTxn.create({
              data: {
                userId,
                delta: amount,
                kind: kindFromKey(key),
                refKey: key,
                label: finalLabel,
              },
            }),
          ]
        : []),
    ]);
    if (amount > 0) out.push({ key, coins: amount, label: finalLabel });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
      throw e;
    }
  }
}

/**
 * Списання монет усередині вже відкритої транзакції.
 *
 * Приймає `tx`, а не створює власну: покупка має бути атомарною разом зі
 * створенням UserSkin/UserItem, інакше гравець може заплатити й не отримати річ.
 * Повертає false, якщо не вистачило монет — умова `coins >= amount` перевіряється
 * самим UPDATE, тож паралельні покупки не можуть загнати баланс у мінус.
 */
export async function spendInTx(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  kind: TxnKind,
  refKey: string,
  label: string,
): Promise<boolean> {
  if (amount > 0) {
    const paid = await tx.user.updateMany({
      where: { id: userId, coins: { gte: amount } },
      data: { coins: { decrement: amount } },
    });
    if (paid.count === 0) return false;
  }
  await tx.coinTxn.create({
    data: { userId, delta: -amount, kind, refKey, label },
  });
  return true;
}
