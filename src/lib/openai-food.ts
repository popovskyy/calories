import OpenAI from "openai";
import type { AnalyzeResult } from "@/lib/types";
import { AiError, gptApiKey } from "@/lib/ai-error";

const MODEL = process.env.OPENAI_FOOD_MODEL || "gpt-4o-mini";

const SYSTEM = `Ти — нутриціолог-аналітик. За текстовим описом та/або фото страви оціни харчову цінність.
Відповідай СУВОРО у JSON:
{
  "calories": number,
  "protein": number,
  "fats": number,
  "carbs": number,
  "parsedItems": string[]
}
Правила:
- calories — сумарна калорійність усієї страви (ккал, ціле).
- protein, fats, carbs — грами (цілі).
- parsedItems — короткий список складників українською, напр. ["2 × яйце", "100 г авокадо"].
Оцінюй реалістично. Якщо кількість не вказана — типова порція.`;

const round = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

export async function analyzeFoodOpenAI(input: {
  description?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<AnalyzeResult> {
  const key = gptApiKey();
  if (!key) {
    throw new AiError("Не задано GPT_API_KEY", 400);
  }

  const description = input.description?.trim();
  if (!description && !input.imageBase64) {
    throw new AiError("Потрібен опис страви або фото", 400);
  }

  const openai = new OpenAI({ apiKey: key });
  const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
    {
      type: "text",
      text: description
        ? `Опис страви: ${description}`
        : "Проаналізуй страву на фото.",
    },
  ];
  if (input.imageBase64) {
    const mime = input.imageMimeType || "image/jpeg";
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${mime};base64,${input.imageBase64}`,
      },
    });
  }

  let text: string;
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    });
    text = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Помилка OpenAI";
    if (/429|quota|rate limit|billing/i.test(msg)) {
      throw new AiError("Вичерпано квоту OpenAI / GPT. Перевірте білінг.", 429);
    }
    if (/401|invalid.*key|Incorrect API key/i.test(msg)) {
      throw new AiError("Невірний GPT_API_KEY", 401);
    }
    throw new AiError(msg);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError("GPT повернув некоректний JSON");
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
