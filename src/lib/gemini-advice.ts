import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import OpenAI from "openai";
import { AiError, gptApiKey } from "@/lib/ai-error";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

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

export interface WeekDaySummary {
  date: string;
  label: string;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  mealsCount: number;
  burned: number;
  /** Короткі описи прийомів — щоб ШІ міг згадати конкретні страви. */
  mealHints: string[];
}

/** Короткий зріз попереднього тижневого фідбеку — для наскрізної лінії. */
export interface PriorWeekAdvice {
  weekStart: string;
  headline: string;
  mood: AdviceMood;
  tip: string;
}

/**
 * Lifetime-контекст юзера: рамка для супроводу, не заміна тижневого журналу.
 * Усі поля опційні / можуть бути нульовими для новачків.
 */
export interface WeekJourneyContext {
  currentWeight: number;
  startWeight: number | null;
  targetWeight: number | null;
  startWeightDate: string | null;
  streak: number;
  maxStreak: number;
  inTargetDays: number;
  daysLoggedTotal: number;
  /** Останні зважування, від новіших до старіших. */
  recentWeights: { date: string; weight: number }[];
  priorWeeks: PriorWeekAdvice[];
}

export interface WeekAdviceInput {
  days: WeekDaySummary[];
  targetCalories: number;
  proteinTarget: number;
  goalLabel: string;
  name: string;
  weekLabel: string;
  journey: WeekJourneyContext;
}

/**
 * Тон: елітний фітнес-дієтолог з почуттям гумору — не медична консультація,
 * а щоденний «звіт» від людини, яка бачила тисячі раціонів і вміє про це
 * пожартувати. Гумор живий і трохи зухвалий, але без вульгарності, образ,
 * діагнозів чи справжнього сорому — жарт завжди б'є по звичці, не по людині.
 * Коли людина майже влучила або трохи вийшла за межу після зусилля —
 * підбадьорюй, а не ганяй як за провал.
 *
 * Генерується раз на добу (Пн–Сб після 18:00), на прохання користувача —
 * день уже фактично закритий, тож текст завжди підбиває підсумок і радить
 * щось на завтра, без застережень «зарано підсумовувати».
 */
const SYSTEM_DAY = `Ти — елітний фітнес-дієтолог з великим досвідом і гострим почуттям гумору.
Клієнти платять за твої звіти тому, що ти кажеш правду смішно — і вмієш
підбадьорити, коли людина реально старалась. Пиши українською, живо, з
дотепними життєвими жартами й легкою іронією — так, щоб людина посміхнулась
і одразу зрозуміла натяк. Не будь постійно жорстким «чуваком»: тон підлаштовуй
під результат дня.

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
- mood: "good" якщо все збалансовано АБО майже в нормі / ледь-ледь вийшли за
  межу після дисциплінованого дня, "mixed" якщо є помітний перекос у макросах,
  "over" якщо помітний перебір калорій без виправдань

ВАЖЛИВО про калорії: перебір і недобір НЕ рівноцінні. Помітний перебір ламає
ціль — про нього жартуй прямо й влучно. Помірний недобір (у межах ~15% від
норми) на дефіциті нормальний і навіть по дорозі до мети — не жартуй з нього
як з провалу і не вимагай «добрати норму». Але якщо з'їдено СИЛЬНО мало
(менше ~2/3 норми) — зауваж це з гумором, але по суті: так довго не протягнути.

ПІДБАДЬОРЕННЯ (обов'язково, коли доречно):
- Майже в нормі (±~5% від цілі) або рівно в ціль — відзнач зусилля тепло й
  з гумором: це перемога, не «ну ок».
- Ледь вийшли за межу (перебір до ~7–8% / невеликий хвостик) після дня, де
  видно дисципліну (білок, нормальні прийоми, без хаосу) — НЕ ганяй як за
  провал. Підбадьор: «майже зловив», «чуть-чуть не дотягнув — але це вже
  рівень», коротко зафіксуй хвостик і м'яко підкажи на завтра.
- Жорсткий тон лишай для явного перебору, повторюваних зривів, купи фастфуду
  чи «я так і планував» без спроби триматись норми.

Без емодзі. Звертайся на "ти".`;

const SYSTEM_WEEK = `Ти — елітний фітнес-дієтолог і ПОСТІЙНИЙ супровідник клієнта: ти бачиш
не лише цей тиждень, а загальну картину шляху (вага, стрік, дні в цілі,
попередні поради). Клієнти платять за те, що ти пам'ятаєш контекст, бачиш
ПАТЕРНИ, кажеш правду смішно й по суті, і даєш конкретні поради під ЦІЛЬ.
Пиши українською, живо, з дотепними жартами й легкою іронією. Тон
підлаштовуй під картину тижня в рамці загального прогресу.

Жартуй про звички й наслідки (цукор, фастфуд, диван, "останній раз"), а не
про зовнішність чи цінність людини. Ніколи не став діагнозів, не згадуй
хвороби, не переходь на образи.

Це підсумок за ТИЖДЕНЬ (пишеться в неділю), але ти супроводжуєш людину
завжди. Акцент (~70% уваги) — на ПОТОЧНОМУ тижні; загальна картина — коротка
рамка (1 речення в body), без переказу всієї історії.

Обов'язково зроби п'ять речей:

0) РАМКА ШЛЯХУ — одне коротке речення про загальну картину: прогрес ваги до
   цілі (якщо є дані), стрік / дисципліна ведення журналу, або що людина
   лише на старті. Не роздувай.

1) ВЕРДИКТ ПО ЦІЛІ ЗА ТИЖДЕНЬ — чітко скажи, чи тиждень загалом був у
   ДЕФІЦИТІ, у ПРОФІЦИТІ (перебір), чи біля НОРМИ відносно денної цілі.
   Орієнтуйся на середнє за дні з записами і на сумарний баланс
   «з'їдено − норма × дні». Мета «схуднення / дефіцит» → дефіцит або легка
   норма = успіх; профіцит = зрив. Мета «підтримка» → триматись близько до
   норми.

2) ОЦІНКА ЛЮДИНИ — прямо й тепло або прямо й жорстко:
   - якщо тиждень зібраний / майже зібраний: скажи щось на кшталт «ти
     молодець, так тримати» (своїми словами, з гумором);
   - якщо тиждень розвалений переборами / дірками: скажи навпаки — без
     образ, але чесно: так далі не піде, ритм треба збирати.

3) СЛАБКІ МІСЦЯ — назви 1–2 конкретні патерни з журналу ЦЬОГО тижня:
   вечірні зриви, фастфуд, низький білок, вихідні, дні без записів, один
   «день-кілер» тощо. Згадай дні/страви, де це видно.
   Якщо була порада минулого тижня і цей тиждень їй суперечить або
   підтверджує — коротко згадай (1 фраза), не розжовуй.

4) ПОРАДА ПІД ЦІЛЬ — tip має бути конкретною дією на НАСТУПНИЙ тиждень і
   логічно випливати з цілі + слабкого місця + загального шляху (не
   абстрактне «їж краще»). Якщо минулий tip не спрацював — підкрути, а не
   копіюй дослівно.

Відповідай СУВОРО JSON:
- headline: 2–5 слів, дотепний вердикт тижня (відчувається дефіцит/норма/
  профіцит)
- body: 3–5 речень: (а) коротка рамка шляху, (б) вердикт дефіцит/профіцит/
  норма під ціль за ТИЖДЕНЬ, (в) «молодець / навпаки», (г) слабкі місця з
  конкретикою з журналу. Людина має впізнати свій тиждень.
- tip: одна конкретна дія на НАСТУПНИЙ тиждень під ціль, слабке місце і
  шлях, з тим самим жартівливим тоном.
- mood: "good" якщо тиждень загалом тримався або майже тримався відносно
  цілі, "mixed" якщо були перекоси, "over" якщо профіцит/зриви домінували

ВАЖЛИВО про калорії: перебір і недобір НЕ рівноцінні. Помітний перебір ламає
ціль. Помірний недобір на дефіциті — норма і навіть по дорозі до мети. Дні
без записів — теж слабке місце, зауваж.

ПІДБАДЬОРЕННЯ vs ЖОРСТКІСТЬ:
- Більшість днів близько до норми (±~5%) або легкі хвостики після дисципліни
  — хвали: молодець, так тримати; не роби з цього провал.
- Системні зриви, купа фастфуду, профіцит на тлі цілі «схуднути» — чесний
  жорсткий тон + конкретна порада, без образ.

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

function buildDayPrompt(input: AdviceInput): string {
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

function formatJourneyBlock(j: WeekJourneyContext): string {
  const weightBits: string[] = [];
  weightBits.push(`зараз ${j.currentWeight} кг`);
  if (j.startWeight != null) {
    const delta = Math.round((j.currentWeight - j.startWeight) * 10) / 10;
    const deltaLabel =
      delta === 0 ? "без змін" : delta > 0 ? `+${delta} кг` : `${delta} кг`;
    weightBits.push(
      `старт ${j.startWeight} кг${j.startWeightDate ? ` (${j.startWeightDate})` : ""} → ${deltaLabel}`,
    );
  }
  if (j.targetWeight != null) {
    const left = Math.round((j.targetWeight - j.currentWeight) * 10) / 10;
    weightBits.push(
      `ціль ${j.targetWeight} кг (лишилось ${left > 0 ? "+" : ""}${left} кг)`,
    );
  }

  const recent =
    j.recentWeights.length > 0
      ? j.recentWeights
          .map((w) => `${w.date}: ${w.weight} кг`)
          .join("; ")
      : "немає логів зважувань";

  const priors =
    j.priorWeeks.length > 0
      ? j.priorWeeks
          .map(
            (p) =>
              `- тиждень з ${p.weekStart}: «${p.headline}» (${p.mood}); порада була: ${p.tip}`,
          )
          .join("\n")
      : "- ще не було тижневих фідбеків";

  return `Загальна картина (шлях, не деталі тижня):
Вага: ${weightBits.join("; ")}.
Останні зважування: ${recent}.
Серія зараз: ${j.streak} дн., рекорд: ${j.maxStreak} дн.
Днів у цілі за весь час: ${j.inTargetDays}; днів із записами їжі: ${j.daysLoggedTotal}.
Попередні тижневі фідбеки (новіші вище):
${priors}`;
}

function buildWeekPrompt(input: WeekAdviceInput): string {
  const lines = input.days
    .map((d) => {
      const delta = d.calories - input.targetCalories;
      const deltaLabel =
        delta === 0
          ? "влучно"
          : delta > 0
            ? `перебір +${delta}`
            : `недобір ${delta}`;
      const hints =
        d.mealHints.length > 0
          ? ` · ${d.mealHints.slice(0, 4).join("; ")}`
          : "";
      return `- ${d.label} (${d.date}): ${d.calories} ккал (${deltaLabel}), б ${d.protein} / ж ${d.fats} / в ${d.carbs}, записів ${d.mealsCount}, спалено ${d.burned}${hints}`;
    })
    .join("\n");

  const logged = input.days.filter((d) => d.mealsCount > 0);
  const avgKcal =
    logged.length > 0
      ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length)
      : 0;
  const avgProtein =
    logged.length > 0
      ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length)
      : 0;

  const planned = input.targetCalories * input.days.length;
  const eaten = input.days.reduce((s, d) => s + d.calories, 0);
  const weekBalance = eaten - planned;
  const balanceLabel =
    weekBalance === 0
      ? "рівно в нормі"
      : weekBalance > 0
        ? `профіцит ≈ +${weekBalance} ккал за тиждень`
        : `дефіцит ≈ ${weekBalance} ккал за тиждень`;
  const avgDelta = avgKcal - input.targetCalories;
  const avgDeltaLabel =
    Math.abs(avgDelta) <= Math.round(input.targetCalories * 0.05)
      ? "біля норми"
      : avgDelta > 0
        ? `середній профіцит ≈ +${avgDelta} ккал/день`
        : `середній дефіцит ≈ ${avgDelta} ккал/день`;

  return `Зараз НЕДІЛЯ — підбиваємо підсумок тижня ${input.weekLabel}.
Ти супроводжуєш гравця завжди: спочатку коротка рамка шляху, далі акцент на ЦЬОМУ тижні.

Гравець: ${input.name}. Ціль: ${input.goalLabel}.
Денна норма: ${input.targetCalories} ккал, орієнтир білка: ${input.proteinTarget} г.

${formatJourneyBlock(input.journey)}

Цей тиждень:
Днів із записами: ${logged.length} з ${input.days.length}.
Середнє за дні з їжею: ${avgKcal} ккал (${avgDeltaLabel}), білок ${avgProtein} г.
Сумарний баланс тижня (з'їдено − норма×днів): ${balanceLabel}.

По днях:
${lines || "- немає записів"}

У відповіді: 1 речення рамки шляху; вердикт дефіцит/профіцит/норма під ціль
за ТИЖДЕНЬ; «молодець / навпаки»; 1–2 слабкі місця з журналу тижня; tip на
наступний тиждень з урахуванням шляху. ~70% уваги — на цей тиждень.`;
}

function normalize(parsed: Record<string, unknown>, bodyMax = 320): DayAdvice {
  const str = (v: unknown, max: number) =>
    String(v ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);
  const moodRaw = String(parsed.mood ?? "").toLowerCase();
  const mood: AdviceMood =
    moodRaw === "good" || moodRaw === "over" ? moodRaw : "mixed";

  const headline = str(parsed.headline, 60);
  const body = str(parsed.body, bodyMax);
  const tip = str(parsed.tip, 220);
  if (!headline || !body) throw new AiError("Порожня порада від ШІ");
  return { headline, body, tip, mood };
}

async function callGemini(
  system: string,
  prompt: string,
  bodyMax: number,
): Promise<DayAdvice> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError("Не задано GEMINI_API_KEY", 400);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: system,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.7,
    },
  });

  const result = await model.generateContent([{ text: prompt }]);
  try {
    return normalize(JSON.parse(result.response.text()), bodyMax);
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError("Gemini повернув некоректний JSON");
  }
}

async function callOpenAI(
  system: string,
  prompt: string,
  bodyMax: number,
): Promise<DayAdvice> {
  const key = gptApiKey();
  if (!key) throw new AiError("Не задано GPT_API_KEY", 400);

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: `${prompt}\n\nПоверни JSON: headline, body, tip, mood`,
      },
    ],
  });
  return normalize(
    JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<
      string,
      unknown
    >,
    bodyMax,
  );
}

async function withFallback(
  system: string,
  prompt: string,
  bodyMax: number,
): Promise<DayAdvice> {
  const preferGpt = process.env.AI_PROVIDER?.trim().toLowerCase() === "openai";
  if (preferGpt && gptApiKey()) {
    try {
      return await callOpenAI(system, prompt, bodyMax);
    } catch {
      return await callGemini(system, prompt, bodyMax);
    }
  }
  try {
    return await callGemini(system, prompt, bodyMax);
  } catch (e) {
    if (!gptApiKey()) throw e;
    return await callOpenAI(system, prompt, bodyMax);
  }
}

/** Той самий фолбек-порядок, що в решті ШІ-модулів. */
export async function generateDayAdvice(input: AdviceInput): Promise<DayAdvice> {
  return withFallback(SYSTEM_DAY, buildDayPrompt(input), 320);
}

/** Тижневий підсумок (неділя) — шлях + акцент на поточний тиждень. */
export async function generateWeekAdvice(
  input: WeekAdviceInput,
): Promise<DayAdvice> {
  return withFallback(SYSTEM_WEEK, buildWeekPrompt(input), 600);
}
