import { z } from "zod";
import { startSession } from "@/lib/auth";
import { checkCredentials } from "@/lib/credentials";
import { HttpError, handle, json } from "@/lib/http";

const body = z.object({ username: z.string().min(1).max(120), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  return handle(
    async () => {
      const { username, password } = body.parse(await req.json());
      if (!checkCredentials(username, password)) {
        // Невелика затримка гальмує підбір пароля (rate-limit на serverless без стану недоступний).
        await new Promise((r) => setTimeout(r, 500));
        throw new HttpError(401, "Невірний логін або пароль");
      }
      await startSession();
      return json({ ok: true });
    },
    { auth: false },
  );
}
