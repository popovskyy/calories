import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Облікові дані єдиного користувача. Пріоритет: TRAINER_USERNAME/TRAINER_PASSWORD, інакше —
 * ADMIN_USERNAME/ADMIN_PASSWORD (вже були на Vercel від калькулятора калорій). Якщо задано
 * TRAINER_*, ADMIN_* ігноруються повністю: старий пароль не лишається «чорним ходом».
 * Нічого не задано → вхід закритий (fail closed), жодних дефолтних паролів.
 */
function configured(): { username: string; password: string } | null {
  const hasTrainer = process.env.TRAINER_USERNAME !== undefined || process.env.TRAINER_PASSWORD !== undefined;
  const username = (hasTrainer ? process.env.TRAINER_USERNAME : process.env.ADMIN_USERNAME)?.trim();
  const password = (hasTrainer ? process.env.TRAINER_PASSWORD : process.env.ADMIN_PASSWORD)?.trim();
  return username && password ? { username, password } : null;
}

const digest = (s: string) => createHash("sha256").update(s).digest();

export function checkCredentials(username: string, password: string): boolean {
  const cfg = configured();
  if (!cfg) return false;
  // sha256 вирівнює довжини → timingSafeEqual не кидає і не витікає довжину
  const okUser = timingSafeEqual(digest(username.trim()), digest(cfg.username));
  const okPass = timingSafeEqual(digest(password), digest(cfg.password));
  return okUser && okPass;
}
