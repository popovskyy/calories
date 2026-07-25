import webpush from "web-push";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface NotifyPayload {
  kind: string;
  title: string;
  body: string;
  url?: string;
  dedupeKey?: string | null;
}

function vapidConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

function ensureVapid() {
  if (!vapidConfigured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

/**
 * 1) Інбокс у БД (P2002 на dedupeKey → тихо вийти).
 * 2) Якщо VAPID є — розсилка push; 404/410 → видалити підписку.
 * Ніколи не кидає назовні — безпечно викликати void notifyUser(...).catch(...)
 */
export async function notifyUser(
  userId: string,
  payload: NotifyPayload,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        kind: payload.kind,
        title: payload.title,
        body: payload.body,
        url: payload.url ?? null,
        dedupeKey: payload.dedupeKey ?? null,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return; // ідемпотентність по dedupeKey
    }
    console.error("[notifyUser] inbox", e);
    // інбокс впав — все одно спробуємо push? ні, без запису краще не слати дубль
    return;
  }

  if (!ensureVapid()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    // Без dedupeKey тег має бути унікальним, інакше друге скасування підряд
    // мовчки замінить перше у шторці сповіщень.
    tag: payload.dedupeKey ?? `${payload.kind}:${Date.now()}`,
  });

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: s.endpoint },
          });
        }
      }
    }),
  );
}
