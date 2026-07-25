import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

/** POST /api/push/subscribe — зберегти підписку та увімкнути remindersEnabled. */
export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = subSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Невалідні дані підписки" }, { status: 400 });
  }

  const userId = auth.session.userId;
  const { endpoint, keys, userAgent } = parsed.data;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { remindersEnabled: true },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/push/subscribe — видалити підписку та вимкнути remindersEnabled (якщо більше немає). */
export async function DELETE(req: NextRequest) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const endpoint = body?.endpoint as string | undefined;

  const userId = auth.session.userId;

  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  } else {
    await prisma.pushSubscription.deleteMany({ where: { userId } });
  }

  const remaining = await prisma.pushSubscription.count({ where: { userId } });
  if (remaining === 0) {
    await prisma.user.update({ where: { id: userId }, data: { remindersEnabled: false } });
  }

  return NextResponse.json({ ok: true });
}

/** GET /api/push/subscribe — статус підписки + публічний VAPID-ключ. */
export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.session.userId;
  const [count, user] = await Promise.all([
    prisma.pushSubscription.count({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { remindersEnabled: true },
    }),
  ]);

  return NextResponse.json({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null,
    subscribed: count > 0,
    remindersEnabled: user?.remindersEnabled ?? false,
  });
}
