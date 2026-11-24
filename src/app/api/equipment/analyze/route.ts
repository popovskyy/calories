import { z } from "zod";
import { HttpError, handle, json, readJson } from "@/lib/http";
import { scanEquipment } from "@/lib/plan/service";

// Gemini Vision + «ремонтний» повтор можуть тривати довше за дефолт.
export const maxDuration = 90;

/** Vercel Functions: тіло запиту ≤ 4.5 МБ. Клієнт стискає фото до ~1280px JPEG. */
const MAX_BODY_BYTES = 4_400_000;
const MAX_IMAGE_B64 = 2_000_000; // ≈ 1.5 МБ бінарних даних на фото

const body = z.object({
  images: z
    .array(
      z.object({
        mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data: z.string().min(100).max(MAX_IMAGE_B64).regex(/^[A-Za-z0-9+/=]+$/, "очікується base64"),
      }),
    )
    .min(1, "Додайте хоча б одне фото")
    .max(4, "Не більше 4 фото за раз"),
});

export async function POST(req: Request) {
  return handle(async () => {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) throw new HttpError(413, "Фото завеликі — зменште їх кількість");
    const { images } = body.parse(await readJson(req));
    return json(await scanEquipment(images));
  });
}
