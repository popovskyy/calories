import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import type { AnalyzeResult } from "./types";
import { AiError, GeminiError, gptApiKey } from "@/lib/ai-error";
import { analyzeFoodOpenAI } from "@/lib/openai-food";

export { AiError, GeminiError };

/** Модель можна перевизначити через env; дефолт — актуальний flash */
/** Дешевий GA lite: ~$0.25/$1.50 vs flash-latest (3.6) ~$1.50/$7.50 */
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const SYSTEM_PROMPT = `Ти — нутриціолог-аналітик. За текстовим описом та/або фото страви оціни харчову цінність.
Відповідай СУВОРО у JSON за схемою. Правила:
- calories — сумарна калорійність усієї страви (ккал, ціле число).
- protein, fats, carbs — грами білків, жирів і вуглеводів (цілі числа).
- parsedItems — короткий список розпізнаних складників з кількістю українською,
  напр. ["2 × яйце", "100 г авокадо", "40 г хліба"].
Оцінюй реалістично за звичайними довідковими значеннями. Якщо кількість не вказана — припусти типову порцію.`;

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    calories: { type: SchemaType.NUMBER },
    protein: { type: SchemaType.NUMBER },
    fats: { type: SchemaType.NUMBER },
    carbs: { type: SchemaType.NUMBER },
    parsedItems: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: ["calories", "protein", "fats", "carbs", "parsedItems"],
};

export interface AnalyzeInput {
  description?: string;
  imageBase64?: string;
  imageMimeType?: string;
  apiKey?: string;
}

const round = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

async function analyzeFoodGemini(input: AnalyzeInput): Promise<AnalyzeResult> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiError(
      "Не задано GEMINI_API_KEY у середовищі сервера",
      400,
    );
  }

  const description = input.description?.trim();
  if (!description && !input.imageBase64) {
    throw new AiError("Потрібен опис страви або фото", 400);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [];
  parts.push({
    text: description
      ? `Опис страви: ${description}`
      : "Проаналізуй страву на фото.",
  });
  if (input.imageBase64) {
    parts.push({
      inlineData: {
        data: input.imageBase64,
        mimeType: input.imageMimeType || "image/jpeg",
      },
    });
  }

  let text: string;
  try {
    const result = await model.generateContent(parts);
    text = result.response.text();
  } catch (err) {
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
    if (/no longer available|\b404\b|not found/i.test(msg)) {
      throw new AiError(
        `Модель "${MODEL}" недоступна для цього ключа. Змініть GEMINI_MODEL у .env.`,
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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError("Gemini повернув некоректний JSON");
  }

  const items = Array.isArray(parsed.parsedItems)
    ? parsed.parsedItems.map((s) => String(s)).filter(Boolean)
    : [];

  return {
    calories: round(parsed.calories),
    protein: round(parsed.protein),
    fats: round(parsed.fats),
    carbs: round(parsed.carbs),
    parsedItems: items,
  };
}

/**
 * Аналіз їжі: спочатку Gemini, при помилці — GPT (якщо є GPT_API_KEY).
 */
export async function analyzeFood(input: AnalyzeInput): Promise<AnalyzeResult> {
  const description = input.description?.trim();
  if (!description && !input.imageBase64) {
    throw new AiError("Потрібен опис страви або фото", 400);
  }

  const preferGpt = process.env.AI_PROVIDER?.trim().toLowerCase() === "openai";

  if (preferGpt && gptApiKey()) {
    try {
      return await analyzeFoodOpenAI(input);
    } catch (gptErr) {
      console.warn(
        "[analyzeFood] OpenAI failed, falling back to Gemini:",
        gptErr instanceof Error ? gptErr.message : gptErr,
      );
      try {
        return await analyzeFoodGemini(input);
      } catch (geminiErr) {
        throw bothFailed(gptErr, geminiErr);
      }
    }
  }

  try {
    return await analyzeFoodGemini(input);
  } catch (geminiErr) {
    if (!gptApiKey()) throw geminiErr;
    // UI-ключ Gemini не блокує GPT-фолбек
    try {
      console.warn(
        "[analyzeFood] Gemini failed, falling back to OpenAI:",
        geminiErr instanceof Error ? geminiErr.message : geminiErr,
      );
      return await analyzeFoodOpenAI(input);
    } catch (gptErr) {
      throw bothFailed(geminiErr, gptErr);
    }
  }
}

function bothFailed(a: unknown, b: unknown): AiError {
  const first = a instanceof Error ? a.message : "помилка";
  const second = b instanceof Error ? b.message : "помилка";
  return new AiError(
    `Обидва ШІ недоступні. ${first} Також запасний: ${second}`,
    502,
  );
}
