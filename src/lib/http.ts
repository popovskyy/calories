import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AiError } from "@/lib/gemini/client";
import { isAuthenticated } from "@/lib/auth";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

/**
 * Обгортка route handler-а: авторизація (другий рубіж після proxy.ts) + єдина
 * обробка помилок. Помилки валідації → 400, ШІ → статус із AiError, решта → 500
 * без витоку внутрішніх повідомлень.
 */
export async function handle(fn: () => Promise<Response>, opts: { auth?: boolean } = {}): Promise<Response> {
  try {
    if (opts.auth !== false && !(await isAuthenticated())) {
      throw new HttpError(401, "Потрібен вхід");
    }
    return await fn();
  } catch (e) {
    if (e instanceof HttpError || e instanceof AiError) {
      return json({ error: e.message }, { status: e.status });
    }
    if (e instanceof ZodError) {
      const first = e.issues[0];
      const where = first?.path.length ? ` (${first.path.join(".")})` : "";
      return json({ error: `Некоректні дані${where}: ${first?.message ?? "перевірте поля"}` }, { status: 400 });
    }
    if (e instanceof SyntaxError) {
      return json({ error: "Некоректний JSON у запиті" }, { status: 400 });
    }
    console.error("[api] unhandled:", e);
    return json({ error: "Внутрішня помилка сервера" }, { status: 500 });
  }
}
