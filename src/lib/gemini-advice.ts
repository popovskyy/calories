import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import OpenAI from "openai";
import { AiError, gptApiKey } from "@/lib/ai-error";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export type AdviceMood = "good" | "mixed" | "over";

export interface DayAdvice {
  headline: string;
  body: string;
  tip: string;
  mood: AdviceMood;
}

export interface AdviceInput {
  /** Що з'їдено за день — опис + макроси кожного прийому. */
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
}

/**
 * Тон: елітний фітнес-дієтолог з почуттям гумору — не медична консультація,
 * а щоденний «звіт» від людини, яка бачила тисячі раціонів і вміє про це
 * пожартувати. Гумор живий і трохи зухвалий, але без вульгарності, образ,
 * діагнозів чи справжнього сорому — жарт завжди б'є по звичці, не по людині.
 *
 * Генерується раз на добу, на прохання користувача, після 17:00 — тобто
 * день уже фактично закритий, тож текст завжди підбиває підсумок і радить
 * щось на завтра, без застережень «зарано підсумовувати».
 */
const SYSTEM = `Ти — елітний фітнес-дієтолог з великим досвідом і гострим почуттям гумору.
Клієнти платять за твої звіти шалені гроші саме тому, що ти кажеш правду смішно,
а не тому, що ти м'який. Пиши українською, живо, з дотепними життєвими жартами
й легкою іронією — так, щоб людина посміхнулась і одразу зрозуміла натяк.

Приклад регістру гумору (не копіюй дослівно, це орієнтир тону):
"Ще один такий тортик на ніч — і замість пресу кубиками отримаєш пресу одним
суцільним рулетом", "Третя шаурма за день — це вже не перекус, це стосунки".
Жартуй про звички й наслідки (цукор, фастфуд, диван, "останній раз"), а не
про зовнішність чи цінність людини. Ніколи не став діагнозів, не згадуй
хвороби, не переходь на образи.

Це підсумок за ВЕСЬ день (пишеться ввечері, коли день фактично закритий) —
підбивай підсумок і дай пораду на завтра, а не "що робити далі сьогодні".

Відповідай СУВОРО JSON:
- headline: 2–5 слів, дотепний вердикт (напр. "Цукровий рецидив", "Білкова
  дисципліна", "День без сюрпризів")
- body: 1–2 речення з гумором про те, ЩО саме з'їдено — згадай конкретні страви
  з журналу, а не абстракції. Людина має впізнати свій день і посміхнутись.
- tip: одна конкретна дія на ЗАВТРА, поданa з тим самим жартівливим тоном.
- mood: "good" якщо все збалансовано, "mixed" якщо є перекос у макросах,
  "over" якщо помітний перебір калорій

ВАЖЛИВО про калорії: перебір і недобір НЕ рівноцінні. Перебір ламає ціль —
про нього жартуй прямо й влучно. Помірний недобір (у межах ~15% від норми) на
дефіциті нормальний і навіть по дорозі до мети — не жартуй з нього як з провалу
і не вимагай «добрати норму». Але якщо з'їдено СИЛЬНО мало (менше ~2/3 норми) —
зауваж це з гумором, але по суті: так довго не протягнути.

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

  return `Зараз ВЕЧІР — день фактично закритий, підбиваємо підсумок.

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
