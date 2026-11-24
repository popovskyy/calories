import { z } from "zod";
import { startSession } from "@/lib/auth";
import { checkCredentials } from "@/lib/credentials";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { clearAttempts, clientIp, registerAttempt } from "@/lib/login-limit";

const body = z.object({ username: z.string().min(1).max(120), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  return handle(
    async () => {
      const { username, password } = body.parse(await readJson(req));
      // Ліміт спроб по IP (у БД — переживає холодні старти serverless). Спроба рахується до перевірки пароля.
      const ip = clientIp(req);
      const { allowed, retryAfterMin } = await registerAttempt(ip);
      if (!allowed) throw new HttpError(429, `Забагато спроб входу. Спробуйте приблизно за ${retryAfterMin} хв.`);
      if (!checkCredentials(username, password)) {
        await new Promise((r) => setTimeout(r, 500));
        throw new HttpError(401, "Невірний логін або пароль");
      }
      await clearAttempts(ip);
      await startSession();
      return json({ ok: true });
    },
    { auth: false },
  );
}
