/**
 * Одноразовий перерахунок targetCalories новою формулою
 * і засівка startWeight / startWeightDate для існуючих користувачів.
 */
import { PrismaClient } from "@prisma/client";
import { calcTargetCalories, isGoal, isSex } from "../src/lib/calories";
import { toYMD } from "../src/lib/date";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  let updated = 0;

  for (const u of users) {
    const sex = isSex(u.sex) ? u.sex : "male";
    const goal = isGoal(u.goal) ? u.goal : "maintain";
    const { targetCalories } = calcTargetCalories({
      birthYear: u.birthYear,
      birthMonth: u.birthMonth,
      sex,
      weightKg: u.weight,
      heightCm: u.height,
      goal,
      targetWeightKg: u.targetWeight,
      targetWeeks: u.targetWeeks,
    });

    const data: {
      targetCalories: number;
      startWeight?: number;
      startWeightDate?: string;
    } = { targetCalories };

    if (u.startWeight == null) data.startWeight = u.weight;
    if (u.startWeightDate == null) data.startWeightDate = toYMD(u.createdAt);

    const changed =
      u.targetCalories !== targetCalories ||
      u.startWeight == null ||
      u.startWeightDate == null;

    if (!changed) continue;

    await prisma.user.update({ where: { id: u.id }, data });
    updated += 1;
    console.log(
      `  ${u.username}: ${u.targetCalories} → ${targetCalories}` +
        (u.startWeight == null ? ` · startWeight=${u.weight}` : ""),
    );
  }

  console.log(`✅ Перераховано ${updated} з ${users.length} користувачів.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
