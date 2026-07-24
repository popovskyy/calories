import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** У dev HMR інколи лишається старий клієнт без нових моделей. */
function resolveClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  const ex = existing as
    | { skinDef?: { findMany?: unknown }; weeklyQuest?: { findMany?: unknown } }
    | undefined;
  if (
    existing &&
    typeof ex?.skinDef?.findMany === "function" &&
    typeof ex?.weeklyQuest?.findMany === "function"
  ) {
    return existing;
  }
  if (existing) {
    void existing.$disconnect().catch(() => {});
  }
  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = resolveClient();
