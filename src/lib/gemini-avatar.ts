import { GoogleGenAI, Modality } from "@google/genai";
import sharp from "sharp";
import { GeminiError } from "@/lib/gemini";

/** Окрема модель для генерації зображень; можна перевизначити через env. */
const IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export const AVATAR_PROMPT = `You are an AI avatar generator.

Your task is to create a cute, consistent mascot-style avatar based on the uploaded user photo.

Requirements:

- Preserve the person's identity and recognizable facial features.
- Convert the person into a friendly cartoon mascot.
- Keep proportions slightly stylized with a larger head and expressive eyes.
- Use a clean modern mobile-app illustration style inspired by premium productivity and fitness apps.
- Soft rounded shapes.
- Smooth gradients.
- No realistic skin texture.
- No wrinkles.
- No facial imperfections.
- Bright but natural colors.
- White or transparent background.
- Front-facing pose.
- Arms relaxed.
- Full body visible.
- High resolution.
- Symmetrical composition.

Hair:
- Preserve hairstyle.
- Preserve hair color.

Face:
- Preserve eye color when possible.
- Preserve beard, mustache and glasses if present.

Body:
- Simplified athletic proportions.
- Neutral standing pose.

Clothes:
- Preserve clothing colors when possible.
- Simplify clothing details.
- Remove logos, text and brands.

Style:
- Cute
- Modern
- Friendly
- Duolingo-level mascot quality
- Mobile application illustration
- Pixar-inspired
- Soft lighting
- High quality
- Premium icon style

Output:
Generate only one avatar.
Transparent PNG.
1024x1024.`;

export interface GenerateAvatarInput {
  imageBase64: string; // без data: префікса
  imageMimeType?: string;
  apiKey?: string;
}

function mapGeminiError(err: unknown, model: string): never {
  const msg = err instanceof Error ? err.message : "Помилка запиту до Gemini";
  if (/429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) {
    throw new GeminiError(
      "Вичерпано квоту Gemini для цього ключа. Перевірте план/білінг або спробуйте пізніше.",
      429,
    );
  }
  if (/API[_ ]?KEY|API key|invalid.*key|permission|PERMISSION_DENIED|\b401\b|\b403\b/i.test(msg)) {
    throw new GeminiError("Невірний або недоступний GEMINI_API_KEY", 401);
  }
  if (/no longer available|\b404\b|not found|not supported/i.test(msg)) {
    throw new GeminiError(
      `Модель зображень "${model}" недоступна для цього ключа. Змініть GEMINI_IMAGE_MODEL у .env.`,
      502,
    );
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(msg)) {
    throw new GeminiError(
      "Немає з'єднання з Gemini. Перевірте мережу та спробуйте ще раз.",
      503,
    );
  }
  throw new GeminiError(msg);
}

/** Стискає PNG/JPEG до квадрата ≤512 для зберігання в БД. */
async function compressAvatarPng(rawBase64: string): Promise<string> {
  const buf = Buffer.from(rawBase64, "base64");
  const out = await sharp(buf)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 8 })
    .toBuffer();
  return `data:image/png;base64,${out.toString("base64")}`;
}

function extractInlineImage(response: {
  data?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
        text?: string;
      }>;
    };
  }>;
}): { data: string; mimeType: string } | null {
  if (response.data) {
    return { data: response.data, mimeType: "image/png" };
  }
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }
  return null;
}

/**
 * Генерує мультяшний аватар з фото користувача.
 * Повертає data-URL PNG (стиснутий до 512×512).
 */
export async function generateMascotAvatar(
  input: GenerateAvatarInput,
): Promise<string> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiError(
      "Не задано GEMINI_API_KEY. Додайте ключ у налаштуваннях або в .env",
      400,
    );
  }
  if (!input.imageBase64?.trim()) {
    throw new GeminiError("Потрібне фото для аватара", 400);
  }

  const ai = new GoogleGenAI({ apiKey });
  let response;
  try {
    response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: AVATAR_PROMPT },
            {
              inlineData: {
                mimeType: input.imageMimeType || "image/jpeg",
                data: input.imageBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });
  } catch (err) {
    mapGeminiError(err, IMAGE_MODEL);
  }

  const image = extractInlineImage(response);
  if (!image) {
    throw new GeminiError(
      "Gemini не повернув зображення. Спробуйте інше фото або пізніше.",
      502,
    );
  }

  try {
    return await compressAvatarPng(image.data);
  } catch {
    // Якщо sharp не зміг — повертаємо як є
    const mime = image.mimeType.startsWith("image/")
      ? image.mimeType
      : "image/png";
    return `data:${mime};base64,${image.data}`;
  }
}
