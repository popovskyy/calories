import type { LightsDTO } from "@/lib/types";

/**
 * Світло вдома. Цей застосунок живе на Vercel і не бачить ПК, тому кнопка йде через дошку Elme:
 * ми кладемо туди «бажання», раннер на ПК (він і так опитує дошку) вмикає/вимикає стрічку HyperHDR
 * і звітує реальний стан. Жоден агент/модель не бере участі.
 *
 * Ключ LIGHTS_TOKEN вузький: дошка пускає його лише на GET/POST /api/lights (не на тікети). Повний
 * BOARD_TOKEN сюди класти НЕ можна — з ним можна міняти тікети, а агенти на ПК виконують їхній текст.
 */

export type BoardLights = {
  want: boolean | null;
  wantAt: number;
  actual: boolean | null;
  appliedAt: number;
  error: string | null;
};

/** Скільки чекаємо відповіді ПК, перш ніж вважати його вимкненим (раннер опитує дошку кожні ~10 с). */
export const STALE_MS = 45_000;

export const NOT_CONFIGURED: LightsDTO = { configured: false, on: null, want: null, pending: false, stale: false, error: null };

export class RelayError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "RelayError";
  }
}

export function toLightsDTO(l: BoardLights, serverNow: number): LightsDTO {
  const pending = typeof l.want === "boolean" && l.wantAt > l.appliedAt;
  return {
    configured: true,
    on: l.actual,
    want: l.want,
    pending,
    stale: pending && serverNow - l.wantAt > STALE_MS,
    error: l.error,
  };
}

export type RelayDeps = { url?: string; token?: string; fetch?: typeof fetch };

function relayOf(deps: RelayDeps): { base: string; token: string } | null {
  const url = deps.url ?? process.env.LIGHTS_RELAY_URL;
  const token = deps.token ?? process.env.LIGHTS_TOKEN;
  if (!url || !token) return null;
  return { base: url.replace(/\/+$/, ""), token };
}

async function callBoard(
  relay: { base: string; token: string },
  init: { method: "GET" | "POST"; body?: unknown },
  f: typeof fetch,
): Promise<{ lights: BoardLights; serverNow?: number }> {
  let res: Response;
  try {
    res = await f(`${relay.base}/api/lights`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${relay.token}`,
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new RelayError(502, "Дошка не відповідає");
  }
  if (res.status === 401 || res.status === 403) throw new RelayError(502, "Дошка не прийняла ключ світла");
  if (!res.ok) throw new RelayError(502, `Дошка відповіла помилкою ${res.status}`);
  const data = (await res.json().catch(() => null)) as { lights?: BoardLights; serverNow?: number } | null;
  if (!data?.lights) throw new RelayError(502, "Дошка повернула незрозумілу відповідь");
  return { lights: data.lights, serverNow: data.serverNow };
}

export async function readLights(deps: RelayDeps = {}): Promise<LightsDTO> {
  const relay = relayOf(deps);
  if (!relay) return NOT_CONFIGURED;
  const { lights, serverNow } = await callBoard(relay, { method: "GET" }, deps.fetch ?? fetch);
  return toLightsDTO(lights, serverNow ?? Date.now());
}

export async function pressLights(on: boolean, deps: RelayDeps = {}): Promise<LightsDTO> {
  const relay = relayOf(deps);
  if (!relay) throw new RelayError(503, "Світло не налаштовано (LIGHTS_RELAY_URL, LIGHTS_TOKEN)");
  const { lights } = await callBoard(relay, { method: "POST", body: { want: on } }, deps.fetch ?? fetch);
  // щойно натиснули: годинник дошки = момент натискання, тож «застряглим» стан ще не буває
  return toLightsDTO(lights, lights.wantAt);
}
