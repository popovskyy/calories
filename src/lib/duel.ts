import { prisma } from "@/lib/prisma";
import { shiftYMD, todayYMD, weekDays, weekStartYMD } from "@/lib/date";
import { dayNetCalories } from "@/lib/day-totals";
import { isInTarget } from "@/lib/quests";
import { grant, spendInTx, type GrantedReward } from "@/lib/reward-grant";
import { DUEL_STAKE } from "@/lib/economy";

/**
 * Дуель тижня: хто набере більше днів у ±5%.
 *
 * У приватній грі на 2–5 друзів лідерборд безглуздий — поле замале, місця
 * розподіляються самі собою. А от прямий виклик конкретній людині працює
 * навіть удвох, бо створює підзвітність: кинути виклик легко, злити його
 * перед другом — соромно.
 *
 * Ставки списуються при прийнятті (не при створенні), щоб виклик, який
 * ніхто не прийняв, нічого не коштував.
 */

export interface DuelDTO {
  id: string;
  weekStart: string;
  status: string;
  stake: number;
  challengerId: string;
  opponentId: string;
  challengerName: string;
  opponentName: string;
  challengerScore: number;
  opponentScore: number;
  winnerId: string | null;
  isMine: boolean;
  /** Мені кинули виклик і я ще не відповів. */
  awaitingMe: boolean;
}

/** Скільки днів у ±5% набрав гравець за тиждень (тільки закриті дні). */
async function weekScore(userId: string, weekStart: string): Promise<number> {
  const today = todayYMD();
  const days = weekDays(weekStart).filter((d) => d < today);
  if (days.length === 0) return 0;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { targetCalories: true },
  });
  const target = user?.targetCalories ?? 0;
  if (target <= 0) return 0;

  const totals = await Promise.all(days.map((d) => dayNetCalories(userId, d)));
  return totals.filter((t) => t.mealCount > 0 && isInTarget(t.net, target)).length;
}

/** Створити виклик на поточний тиждень. */
export async function createDuel(
  challengerId: string,
  opponentId: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (challengerId === opponentId) {
    return { ok: false, error: "Не можна викликати себе" };
  }
  const weekStart = weekStartYMD();

  const opponent = await prisma.user.findUnique({
    where: { id: opponentId },
    select: { id: true },
  });
  if (!opponent) return { ok: false, error: "Суперника не знайдено" };

  // Одна дуель на пару за тиждень — у будь-якому напрямку.
  const existing = await prisma.duel.findFirst({
    where: {
      weekStart,
      status: { in: ["pending", "accepted"] },
      OR: [
        { challengerId, opponentId },
        { challengerId: opponentId, opponentId: challengerId },
      ],
    },
  });
  if (existing) return { ok: false, error: "Дуель на цей тиждень уже є" };

  const duel = await prisma.duel.create({
    data: { challengerId, opponentId, weekStart, stake: DUEL_STAKE },
  });
  return { ok: true, id: duel.id };
}

/** Прийняти виклик: обидва вносять ставку. */
export async function acceptDuel(
  userId: string,
  duelId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const duel = await prisma.duel.findUnique({ where: { id: duelId } });
  if (!duel) return { ok: false, error: "Дуель не знайдено" };
  if (duel.opponentId !== userId) return { ok: false, error: "Це не твій виклик" };
  if (duel.status !== "pending") return { ok: false, error: "Виклик уже опрацьовано" };

  try {
    await prisma.$transaction(async (tx) => {
      for (const id of [duel.challengerId, duel.opponentId]) {
        const paid = await spendInTx(
          tx,
          id,
          duel.stake,
          "duel",
          `duel:${duel.id}`,
          "Ставка в дуелі",
        );
        if (!paid) throw Object.assign(new Error("BROKE"), { code: "BROKE" });
      }
      await tx.duel.update({
        where: { id: duel.id },
        data: { status: "accepted" },
      });
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : null;
    if (code === "BROKE") {
      return { ok: false, error: "Комусь із вас не вистачає монет на ставку" };
    }
    throw e;
  }
  return { ok: true };
}

export async function declineDuel(userId: string, duelId: string): Promise<boolean> {
  const res = await prisma.duel.updateMany({
    where: { id: duelId, opponentId: userId, status: "pending" },
    data: { status: "declined" },
  });
  return res.count > 0;
}

/**
 * Закриває дуелі минулих тижнів. Викликається ліниво при читанні —
 * окремий крон заради двох гравців був би зайвим.
 */
export async function settleDuels(userId: string): Promise<GrantedReward[]> {
  const thisWeek = weekStartYMD();
  const out: GrantedReward[] = [];

  const pending = await prisma.duel.findMany({
    where: {
      status: "accepted",
      weekStart: { lt: thisWeek },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
  });

  for (const duel of pending) {
    const [a, b] = await Promise.all([
      weekScore(duel.challengerId, duel.weekStart),
      weekScore(duel.opponentId, duel.weekStart),
    ]);

    const winnerId =
      a > b ? duel.challengerId : b > a ? duel.opponentId : null;

    await prisma.duel.update({
      where: { id: duel.id },
      data: { status: "settled", winnerId, settledAt: new Date() },
    });

    if (winnerId) {
      await grant(
        winnerId,
        `duel:${duel.id}:win`,
        duel.stake * 2,
        `Дуель виграно ${a}:${b}`,
        out,
      );
    } else {
      // Нічия — кожному повертається його ставка.
      for (const id of [duel.challengerId, duel.opponentId]) {
        await grant(id, `duel:${duel.id}:draw:${id}`, duel.stake, "Дуель: нічия", out);
      }
    }
  }

  return out;
}

/** Дуелі гравця за поточний і минулий тиждень. */
export async function listDuels(userId: string): Promise<DuelDTO[]> {
  const thisWeek = weekStartYMD();
  const lastWeek = shiftYMD(thisWeek, -7);

  const duels = await prisma.duel.findMany({
    where: {
      weekStart: { gte: lastWeek },
      OR: [{ challengerId: userId }, { opponentId: userId }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (duels.length === 0) return [];

  const ids = [...new Set(duels.flatMap((d) => [d.challengerId, d.opponentId]))];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  const out: DuelDTO[] = [];
  for (const d of duels) {
    const [challengerScore, opponentScore] = await Promise.all([
      weekScore(d.challengerId, d.weekStart),
      weekScore(d.opponentId, d.weekStart),
    ]);
    out.push({
      id: d.id,
      weekStart: d.weekStart,
      status: d.status,
      stake: d.stake,
      challengerId: d.challengerId,
      opponentId: d.opponentId,
      challengerName: nameOf.get(d.challengerId) ?? "—",
      opponentName: nameOf.get(d.opponentId) ?? "—",
      challengerScore,
      opponentScore,
      winnerId: d.winnerId,
      isMine: d.challengerId === userId,
      awaitingMe: d.opponentId === userId && d.status === "pending",
    });
  }
  return out;
}
