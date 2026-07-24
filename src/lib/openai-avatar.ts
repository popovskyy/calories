import OpenAI from "openai";
import sharp from "sharp";
import { AiError, gptApiKey } from "@/lib/ai-error";
import { AVATAR_PROMPT } from "@/lib/avatar-prompt";

const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

async function compressAvatarPng(rawBase64: string): Promise<string> {
  const buf = Buffer.from(rawBase64, "base64");
  const out = await sharp(buf)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 8 })
    .toBuffer();
  return `data:image/png;base64,${out.toString("base64")}`;
}

/**
 * Мультяшний аватар через OpenAI Images (редагування / генерація з фото).
 */
export async function generateMascotAvatarOpenAI(input: {
  imageBase64: string;
  imageMimeType?: string;
}): Promise<string> {
  const key = gptApiKey();
  if (!key) throw new AiError("Не задано GPT_API_KEY", 400);
  if (!input.imageBase64?.trim()) {
    throw new AiError("Потрібне фото для аватара", 400);
  }

  const openai = new OpenAI({ apiKey: key });
  const mime = input.imageMimeType || "image/jpeg";
  const ext = mime.includes("png") ? "png" : "jpg";
  const buf = Buffer.from(input.imageBase64, "base64");

  // Нормалізуємо в PNG для edits API
  const pngBuf = await sharp(buf)
    .resize(1024, 1024, { fit: "inside" })
    .png()
    .toBuffer();

  const file = new File([pngBuf], `photo.${ext === "png" ? "png" : "png"}`, {
    type: "image/png",
  });

  try {
    // Спочатку пробуємо images.edit (фото → мультяшний стиль)
    const edited = await openai.images.edit({
      model: IMAGE_MODEL,
      image: file,
      prompt: AVATAR_PROMPT,
      size: "1024x1024",
      n: 1,
    });

    const b64 = edited.data?.[0]?.b64_json;
    if (b64) return compressAvatarPng(b64);

    const url = edited.data?.[0]?.url;
    if (url) {
      const res = await fetch(url);
      const ab = await res.arrayBuffer();
      return compressAvatarPng(Buffer.from(ab).toString("base64"));
    }
  } catch (editErr) {
    // Фоллбек: описати людину через vision → згенерувати картинку
    try {
      const desc = await openai.chat.completions.create({
        model: process.env.OPENAI_FOOD_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Коротко англійською опиши зовнішність людини на фото для cartoon avatar (hair, face, clothes, vibe). Max 80 words.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime};base64,${input.imageBase64}`,
                },
              },
            ],
          },
        ],
      });
      const appearance = desc.choices[0]?.message?.content?.trim() || "a friendly person";
      const gen = await openai.images.generate({
        model: IMAGE_MODEL === "gpt-image-1" ? "dall-e-3" : IMAGE_MODEL,
        prompt: `${AVATAR_PROMPT}\n\nSubject appearance: ${appearance}`,
        size: "1024x1024",
        n: 1,
        response_format: "b64_json",
      });
      const b64 = gen.data?.[0]?.b64_json;
      if (b64) return compressAvatarPng(b64);
      throw new AiError("GPT не повернув зображення аватара", 502);
    } catch (genErr) {
      const msg =
        genErr instanceof Error
          ? genErr.message
          : editErr instanceof Error
            ? editErr.message
            : "Помилка OpenAI images";
      if (/429|quota|rate limit|billing/i.test(msg)) {
        throw new AiError("Вичерпано квоту OpenAI для зображень", 429);
      }
      if (/401|invalid.*key|Incorrect API key/i.test(msg)) {
        throw new AiError("Невірний GPT_API_KEY", 401);
      }
      throw new AiError(msg);
    }
  }

  throw new AiError("GPT не повернув зображення аватара", 502);
}
