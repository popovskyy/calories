import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import { AiError, gptApiKey } from "@/lib/ai-error";
import OpenAI from "openai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

export interface AnalyzeActivityResult {
  caloriesBurned: number;
  durationMin: number | null;
  notes: string[];
}

export interface AnalyzeActivityInput {
  description?: string;
  /** вага юзера — для точнішої оцінки */
  weightKg?: number;
  apiKey?: string;
}

const SYSTEM = `Ти — спортивний фізіолог. За описом активності оціни спалені калорії.
Відповідай СУВОРО JSON:
- caloriesBurned: ціле число ккал за всю сесію
- durationMin: тривалість у хвилинах (ціле) або null якщо невідомо
- notes: короткий масив уточнень українською (1–3 пункти)
Враховуй інтенсивність і тривалість. Якщо вага відома — використовуй MET×кг×год.`;

const schema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    caloriesBurned: { type: SchemaType.NUMBER },
    durationMin: { type: SchemaType.NUMBER, nullable: true },
    notes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["caloriesBurned", "notes"],
};

const round = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

async function analyzeActivityGemini(
  input: AnalyzeActivityInput,
): Promise<AnalyzeActivityResult> {
  const apiKey = input.apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError("Не задано GEMINI_API_KEY", 400);

  const description = input.description?.trim();
  if (!description) throw new AiError("Потрібен опис активності", 400);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.2,
    },
  });

  const weightHint =
    input.weightKg && input.weightKg > 0
      ? `Вага людини: ${input.weightKg} кг.`
      : "Вага невідома — припусти середню ~70 кг.";

  const result = await model.generateContent([
    { text: `${weightHint}\nОпис активності: ${description}` },
  ]);
  const text = result.response.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError("Gemini повернув некоректний JSON");
  }

  const notes = Array.isArray(parsed.notes)
    ? parsed.notes.map((s) => String(s)).filter(Boolean)
    : [];
  const durationRaw = parsed.durationMin;
  const durationMin =
    durationRaw == null || durationRaw === ""
      ? null
      : Math.max(0, round(durationRaw));

  return {
    caloriesBurned: Math.min(round(parsed.caloriesBurned), 5000),
    durationMin,
    notes,
  };
}

async function analyzeActivityOpenAI(
  input: AnalyzeActivityInput,
): Promise<AnalyzeActivityResult> {
  const key = gptApiKey();
  if (!key) throw new AiError("Не задано GPT_API_KEY", 400);
  const description = input.description?.trim();
  if (!description) throw new AiError("Потрібен опис активності", 400);

  const openai = new OpenAI({ apiKey: key });
  const weightHint =
    input.weightKg && input.weightKg > 0
      ? `Вага: ${input.weightKg} кг.`
      : "Вага ~70 кг.";

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${weightHint}\nОпис: ${description}\nПоверни JSON: caloriesBurned, durationMin, notes[]`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const notes = Array.isArray(parsed.notes)
    ? parsed.notes.map((s) => String(s)).filter(Boolean)
    : [];
  const durationRaw = parsed.durationMin;
  return {
    caloriesBurned: Math.min(round(parsed.caloriesBurned), 5000),
    durationMin:
      durationRaw == null || durationRaw === ""
        ? null
        : Math.max(0, round(durationRaw)),
    notes,
  };
}

export async function analyzeActivity(
  input: AnalyzeActivityInput,
): Promise<AnalyzeActivityResult> {
  const preferGpt = process.env.AI_PROVIDER?.trim().toLowerCase() === "openai";
  if (preferGpt && gptApiKey()) {
    try {
      return await analyzeActivityOpenAI(input);
    } catch {
      return await analyzeActivityGemini(input);
    }
  }
  try {
    return await analyzeActivityGemini(input);
  } catch (e) {
    if (!gptApiKey()) throw e;
    return await analyzeActivityOpenAI(input);
  }
}
