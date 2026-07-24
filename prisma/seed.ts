/**
 * Сід каталогу скінів (ціни/нові скіни далі керуються з адмінки).
 */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_SKINS } from "../src/lib/avatar-presets";

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  for (const s of DEFAULT_SKINS) {
    const exists = await prisma.skinDef.findUnique({ where: { id: s.id } });
    if (exists) continue;
    await prisma.skinDef.create({
      data: {
        id: s.id,
        nameUk: s.nameUk,
        tier: s.tier,
        price: s.price,
        rarity: s.rarity,
        bg: s.bg,
        enabled: true,
        sortOrder: s.sortOrder ?? 0,
        artKind: s.artKind,
        svg: s.svg ?? null,
      },
    });
    created += 1;
  }
  console.log(`✅ Skin catalog: +${created} нових (існуючі не змінювались).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
