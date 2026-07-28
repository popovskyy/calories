import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import OpenAI from "openai";
import { AiError, gptApiKey } from "@/lib/ai-error";

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

export type AdviceMood = "good" | "mixed" | "over";
/** Частина доби визначає, про що взагалі можна говорити. */
export type DayPart = "morning" | "day" | "evening";

export interface DayAdvice {
  headline: string;
  body: string;
  tip: string;
  mood: AdviceMood;
}

export interface AdviceInput {
  /** Що з'їдено від початку дня — опис + макроси кожного прийому. */
  meals: {
    description: string;
    calories: number;
    protein: number;
    fats: number;
    carbs: number;
  }[];
  activities: { description: string; caloriesBurned: number }[];
  targetCalories: number;
  totals: { calories: number; protein: number; fats: number; carbs: number };
  proteinTarget: number;
  goalLabel: string;
  name: string;
  dayPart: DayPart;
}

/** Kyiv-година → частина доби. Межі під побутовий ритм, не астрономічний. */
export function dayPartOfHour(hour: number): DayPart {
  if (hour < 12) return "morning";
  if (hour < 17) return "day";
  return "evening";
}

/**
 * Тон навмисно не «дієтологічний»: застосунок — ритуал у компанії друзів,
 * а не медичний коучинг. Тому — коротко, по-людськи, без діагнозів,
 * без калорійних приписів і без сорому за перебір.
 *
 * Головне правило — доречність у часі: зранку коментуємо сніданок і
 * підказуємо, як провести решту дня; увечері підбиваємо підсумок.
 */
const SYSTEM = `Ти — уважний друг, який дивиться на журнал їжі й коротко коментує його.
Пиши українською, тепло і без моралізаторства. Ніколи не став діагнозів, не згадуй хвороби,
не приписуй суворих дієт і не соромь за перебір.

КРИТИЧНО — враховуй частину доби:
- morning (ранок): це лише початок дня. Коментуй те, що вже з'їдено (сніданок, перекус),
  і підкажи, як провести решту дня. НЕ підбивай підсумків дня, НЕ кажи "сьогодні вийшло".
- day (день): половина дня позаду. Скажи, як іде, і скільки простору лишилось до норми.
- evening (вечір): день фактично закритий. Підбий підсумок і дай пораду на завтра.

Відповідай СУВОРО JSON:
- headline: 2–5 слів, вердикт (напр. "Солодкий сніданок", "Рівний день", "Білка малувато")
- body: 1–2 речення про те, ЩО саме з'їдено — згадай конкретні страви з журналу,
  а не абстракції. Людина має впізнати свій день.
- tip: одна конкретна дія. Для morning/day — що зробити ДАЛІ СЬОГОДНІ
  (напр. "На обід візьми щось білкове — яйця чи курку, бо поки що самі вуглеводи").
  Для evening — що зробити ЗАВТРА.
- mood: "good" якщо все збалансовано, "mixed" якщо є перекос у макросах або недобір,
  "over" якщо помітний перебір калорій

Без емодзі. Звертайся на "ти".`;

const schema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    headline: { type: SchemaType.STRING },
    body: { type: SchemaType.STRING },
    tip: { type: SchemaType.STRING },
    mood: { type: SchemaType.STRING },
  },
  required: ["headline", "body", "tip", "mood"],
};

const PART_HINT: Record<DayPart, string> = {
  morning: "Зараз РАНОК — попереду майже весь день.",
  day: "Зараз ДЕНЬ — попереду ще вечеря.",
  evening: "Зараз ВЕЧІР — день фактично закритий.",
};

function buildPrompt(input: AdviceInput): string {
  const meals = input.meals
    .map(
      (m) =>
        `- ${m.description}: ${m.calories} ккал (б ${m.protein} / ж ${m.fats} / в ${m.carbs})`,
    )
    .join("\n");
  const acts = input.activities.length
    ? input.activities
        .map((a) => `- ${a.description}: −${a.caloriesBurned} ккал`)
        .join("\n")
    : "- немає";
  const left = input.targetCalories - input.totals.calories;

  return `${PART_HINT[input.dayPart]}
Частина доби: ${input.dayPart}.

Гравець: ${input.name}. Ціль: ${input.goalLabel}.
Норма: ${input.targetCalories} ккал, орієнтир білка: ${input.proteinTarget} г.

З'їдено дотепер:
${meals}

Активність:
${acts}

Разом дотепер: ${input.totals.calories} ккал, ${
    left >= 0 ? `лишається ${left}` : `перебір на ${Math.abs(left)}`
  } ккал,
білок ${input.totals.protein} г, жири ${input.totals.fats} г, вуглеводи ${input.totals.carbs} г.`;
}

function normalize(parsed: Record<string, unknown>): DayAdvice {
  const str = (v: unknown, max: number) =>
    String(v ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  const moodRaw = String(parsed.mood ?? "").toLowerCase();
  const mood: AdviceMood =
    moodRaw === "good" || moodRaw === "over" ? moodRaw : "mixed";

  const headline = str(parsed.headline, 60);
  const body = str(parsed.body, 320);
  const tip = str(parsed.tip, 200);
  if (!headline || !body) throw new AiError("Порожня порада від ШІ");
  return { headline, body, tip, mood };
}

async function adviceGemini(input: AdviceInput): Promise<DayAdvice> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError("Не задано GEMINI_API_KEY", 400);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      // Вища за аналіз їжі: порада має звучати живою, а не шаблонною.
      temperature: 0.7,
    },
  });

  const result = await model.generateContent([{ text: buildPrompt(input) }]);
  try {
    return normalize(JSON.parse(result.response.text()));
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError("Gemini повернув некоректний JSON");
  }
}

async function adviceOpenAI(input: AdviceInput): Promise<DayAdvice> {
  const key = gptApiKey();
  if (!key) throw new AiError("Не задано GPT_API_KEY", 400);

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `${buildPrompt(input)}\n\nПоверни JSON: headline, body, tip, mood`,
      },
    ],
  });
  return normalize(
    JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<
      string,
      unknown
    >,
  );
}

/** Той самий фолбек-порядок, що в решті ШІ-модулів. */
export async function generateDayAdvice(input: AdviceInput): Promise<DayAdvice> {
  const preferGpt = process.env.AI_PROVIDER?.trim().toLowerCase() === "openai";
  if (preferGpt && gptApiKey()) {
    try {
      return await adviceOpenAI(input);
    } catch {
      return await adviceGemini(input);
    }
  }
  try {
    return await adviceGemini(input);
  } catch (e) {
    if (!gptApiKey()) throw e;
    return await adviceOpenAI(input);
  }
}
