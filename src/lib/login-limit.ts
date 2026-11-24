import { prisma } from "@/lib/prisma";

export const MAX_ATTEMPTS = 8;
export const WINDOW_MS = 15 * 60 * 1000;

export interface AttemptStore {
  add(ip: string, at: Date): Promise<void>;
  countSince(ip: string, since: Date): Promise<number>;
  clear(ip: string): Promise<void>;
  purge(before: Date): Promise<void>;
}

const prismaStore: AttemptStore = {
  async add(ip, at) {
    await prisma.loginAttempt.create({ data: { ip, createdAt: at } });
  },
  countSince: (ip, since) => prisma.loginAttempt.count({ where: { ip, createdAt: { gte: since } } }),
  async clear(ip) {
    await prisma.loginAttempt.deleteMany({ where: { ip } });
  },
  async purge(before) {
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: before } } });
  },
};

interface Deps {
  store?: AttemptStore;
  now?: () => number;
}

/**
 * Реєструє спробу входу й каже, чи дозволено її розглядати. Запис іде ДО перевірки пароля: так сотня паралельних запитів
 * не обходить ліміт (кожен бачить уже збільшений лічильник). Заблоковані спроби теж рахуються — вікно триває, поки
 * з цього IP не стихне на 15 хвилин. Ліміт по IP, тож атакуючий не блокує вхід власнику з іншої мережі.
 */
export async function registerAttempt(ip: string, deps: Deps = {}): Promise<{ allowed: boolean; retryAfterMin: number }> {
  const store = deps.store ?? prismaStore;
  const now = (deps.now ?? Date.now)();
  await store.add(ip, new Date(now));
  const count = await store.countSince(ip, new Date(now - WINDOW_MS));
  // Гігієна: старі рядки нікому не потрібні
  await store.purge(new Date(now - WINDOW_MS));
  return { allowed: count <= MAX_ATTEMPTS, retryAfterMin: Math.ceil(WINDOW_MS / 60_000) };
}

export async function clearAttempts(ip: string, deps: Deps = {}): Promise<void> {
  await (deps.store ?? prismaStore).clear(ip);
}

/** IP клієнта: на Vercel перший елемент x-forwarded-for виставляє платформа. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return xff || req.headers.get("x-real-ip")?.trim() || "unknown";
}
