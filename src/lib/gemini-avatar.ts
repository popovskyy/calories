import { GoogleGenAI, Modality } from "@google/genai";
import sharp from "sharp";
import { AiError, gptApiKey } from "@/lib/ai-error";
import { AVATAR_PROMPT } from "@/lib/avatar-prompt";
import { generateMascotAvatarOpenAI } from "@/lib/openai-avatar";

export { AVATAR_PROMPT } from "@/lib/avatar-prompt";

const IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

export interface GenerateAvatarInput {
  imageBase64: string;
  imageMimeType?: string;
  apiKey?: string;
}

function mapGeminiError(err: unknown, model: string): never {
  const msg = err instanceof Error ? err.message : "Помилка запиту до Gemini";
  if (/429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg)) {
    throw new AiError(
      "Вичерпано квоту Gemini для цього ключа. Перевірте план/білінг або спробуйте пізніше.",
      429,
    );
  }
  if (/API[_ ]?KEY|API key|invalid.*key|permission|PERMISSION_DENIED|\b401\b|\b403\b/i.test(msg)) {
    throw new AiError("Невірний або недоступний GEMINI_API_KEY", 401);
  }
  if (/no longer available|\b404\b|not found|not supported/i.test(msg)) {
    throw new AiError(
      `Модель зображень "${model}" недоступна для цього ключа. Змініть GEMINI_IMAGE_MODEL у .env.`,
      502,
    );
  }
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network/i.test(msg)) {
    throw new AiError(
      "Немає з'єднання з Gemini. Перевірте мережу та спробуйте ще раз.",
      503,
    );
  }
  throw new AiError(msg);
}

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

async function generateMascotAvatarGemini(
  input: GenerateAvatarInput,
): Promise<string> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiError(
      "Не задано GEMINI_API_KEY у середовищі сервера",
      400,
    );
  }
  if (!input.imageBase64?.trim()) {
    throw new AiError("Потрібне фото для аватара", 400);
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
    throw new AiError(
      "Gemini не повернув зображення. Спробуйте інше фото або пізніше.",
      502,
    );
  }

  try {
    return await compressAvatarPng(image.data);
  } catch {
    const mime = image.mimeType.startsWith("image/")
      ? image.mimeType
      : "image/png";
    return `data:${mime};base64,${image.data}`;
  }
}

/** Gemini → при помилці GPT → якщо обидва впали — стиснуте оригінальне фото. */
export async function generateMascotAvatar(
  input: GenerateAvatarInput,
): Promise<string> {
  if (!input.imageBase64?.trim()) {
    throw new AiError("Потрібне фото для аватара", 400);
  }

  try {
    return await generateMascotAvatarGemini(input);
  } catch (geminiErr) {
    if (gptApiKey()) {
      try {
        console.warn(
          "[avatar] Gemini failed, falling back to OpenAI:",
          geminiErr instanceof Error ? geminiErr.message : geminiErr,
        );
        return await generateMascotAvatarOpenAI(input);
      } catch (gptErr) {
        console.warn(
          "[avatar] OpenAI images also failed, using original photo:",
          gptErr instanceof Error ? gptErr.message : gptErr,
        );
      }
    } else {
      console.warn(
        "[avatar] Gemini failed, no GPT_API_KEY — using original photo:",
        geminiErr instanceof Error ? geminiErr.message : geminiErr,
      );
    }
    // Останній резерв: просто стиснути завантажене фото (без cartoon)
    return compressAvatarPng(input.imageBase64);
  }
}
