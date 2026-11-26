import { z } from "zod";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { RelayError, pressLights, readLights } from "@/lib/lights";

const body = z.object({ on: z.boolean() });

/** Помилки зв'язку з дошкою → HttpError (текст без секретів), решта лишається як є. */
async function viaRelay<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RelayError) throw new HttpError(e.status, e.message);
    throw e;
  }
}

export async function GET() {
  return handle(async () => json({ lights: await viaRelay(() => readLights()) }));
}

export async function POST(req: Request) {
  return handle(async () => {
    const { on } = body.parse(await readJson(req));
    return json({ lights: await viaRelay(() => pressLights(on)) });
  });
}
