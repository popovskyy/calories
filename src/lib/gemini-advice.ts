import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import OpenAI from "openai";
import { AiError, gptApiKey } from "@/lib/ai-error";
import {
  classifyCalorieStance,
  classifyLedgerStance,
  pctVsMaintenance,
  plannedDeficitPctFromTargets,
  stanceLabelUk,
  type Goal,
} from "@/lib/calories";

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
  /** Підтримка ваги (TDEE) — щоб відрізняти м'який дефіцит від зриву. */
  maintenanceCalories: number;
  goal: Goal;
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
  /**
   * Середній net ккал/день попереднього тижня (дні з записами).
   * null — немає порівняння.
   */
  priorWeekAvgNet: number | null;
}

export interface WeekAdviceInput {
  days: WeekDaySummary[];
  targetCalories: number;
  maintenanceCalories: number;
  goal: Goal;
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
під результат дня. Звіт має бути збалансованим: фіксуй і сильні сторони, і
що підкрутити — не зводь усе до негативу.

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
  межу після дисциплінованого дня АБО м'який дефіцит (слабший за план, але
  все ще під підтримкою), "mixed" якщо є помітний перекос у макросах чи темпі,
  "over" лише якщо є ПРОФІЦИТ над підтримкою або явний зрив без виправдань

ВАЖЛИВО — дві шкали калорій (не плутай):
1) Підтримка (TDEE) — лінія «вага стоїть».
2) Денна ціль — план (на дефіциті зазвичай ≈ −15% від підтримки).
Факт між ціллю і підтримкою (напр. план −15%, факт −10%) — це НЕ зрив і НЕ
профіцит: дефіцит є, вага має йти вниз, просто повільніше. Кажи приблизно:
«дефіцит був, і так ок — можна щільніше до плану для кращого темпу».
Справжній профіцит — лише коли net ВИЩЕ підтримки. Помітний перебір над
підтримкою ламає ціль — жартуй прямо. Помірний недобір під ціллю на дефіциті
нормальний. Якщо з'їдено СИЛЬНО мало (менше ~2/3 цілі) — зауваж по суті:
так довго не протягнути.

ПІДБАДЬОРЕННЯ (обов'язково, коли доречно):
- Майже в цілі (±~5%) або рівно в ціль — відзнач зусилля тепло й з гумором.
- М'який дефіцит / майже підтримка на цілі «схуднути» — підбадьор і м'яко
  підкрути темп, без ярлика «провал».
- Ледь вийшли за ціль після дисциплінованого дня — НЕ ганяй як за зрив.
- Жорсткий тон лишай для профіциту над підтримкою, повторюваних зривів,
  купи фастфуду чи «я так і планував» без спроби триматись.

Без емодзі. Звертайся на "ти".`;

const SYSTEM_WEEK = `Ти — елітний фітнес-дієтолог і ПОСТІЙНИЙ супровідник клієнта: ти бачиш
не лише цей тиждень, а загальну картину шляху (вага, стрік, дні в цілі,
попередні поради, динаміку калорій). Клієнти платять за те, що ти пам'ятаєш
контекст, бачиш ПАТЕРНИ, кажеш правду смішно й по суті, і даєш конкретні
поради під ЦІЛЬ. Пиши українською, живо, з дотепними жартами й легкою
іронією. Тон підлаштовуй під картину тижня в рамці загального прогресу.
Звіт має бути збалансованим: не лише слабкі місця — обов'язково відзнач,
що вже виходить / куди зрушив прогрес.

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

1) ВЕРДИКТ ПО ЦІЛІ ЗА ТИЖДЕНЬ — думай ГЛОБАЛЬНО, двома шкалами:
   Підтримка (TDEE) vs денна ціль (план, на дефіциті ≈ −15%).
   Орієнтуйся на середнє за дні з записами і на готову «оцінку темпу» в
   промпті. Мета «схуднення / дефіцит»:
   - дефіцит у плані або глибший (але не екстремальний) = успіх;
   - м'який дефіцит (напр. −10% при плані −15%) = НЕ зрив: «дефіцит був,
     і так норм — можна щільніше до плану для кращого темпу»;
   - близько до підтримки = плато-ризик, м'яко підкрути;
   - профіцит НАД підтримкою = справжній зрив.
   Мета «підтримка» → триматись близько до TDEE.
   Якщо є порівняння з минулим тижнем (покращення/погіршення %) — коротко
   врахуй: зрушення в бік плану хвали навіть якщо ідеалу ще немає.

2) ОЦІНКА ЛЮДИНИ — прямо й тепло або прямо й жорстко, але справедливо:
   - зібраний / майже зібраний / м'який дефіцит із прогресом: «молодець»,
     так тримати (своїми словами);
   - розвалений профіцитом над підтримкою / дірками: чесно, без образ.

3) СИЛЬНІ СТОРОНИ + СЛАБКІ МІСЦЯ:
   - Спочатку 1 конкретна сильна сторона тижня (дисципліна, білок, менше
     зривів, ніж минулого тижня тощо), якщо є за що похвалити.
   - Слабкі місця (1–2 патерни) — лише якщо вони реально є; на хорошому
     тижні можна коротко «тримайся цього ритму» замість вигаданої критики.
   - Якщо була порада минулого тижня і цей тиждень їй суперечить або
     підтверджує — коротко (1 фраза).

4) ПОРАДА ПІД ЦІЛЬ — tip: конкретна дія на НАСТУПНИЙ тиждень з цілі +
   реального темпу (м'який дефіцит → як наблизитись до −15%; профіцит →
   як повернутись під підтримку). Якщо минулий tip не спрацював — підкрути.

Відповідай СУВОРО JSON:
- headline: 2–5 слів, дотепний вердикт тижня (відчувається темп: план /
  м'який дефіцит / підтримка / профіцит)
- body: 3–5 речень: (а) рамка шляху, (б) вердикт під ціль із нюансом темпу,
  (в) оцінка людини, (г) сильна сторона + слабке місце з журналу.
- tip: одна конкретна дія на НАСТУПНИЙ тиждень.
- mood: "good" якщо тиждень у плані / м'який дефіцит / майже в цілі,
  "mixed" якщо перекоси чи плато біля підтримки, "over" лише якщо домінував
  профіцит над підтримкою або системні зриви

ВАЖЛИВО: перебір над підтримкою ≠ м'який дефіцит. Не називай м'який
дефіцит профіцитом чи зривом. Дні без записів — слабке місце, зауваж.
Помірний недобір під ціллю на дефіциті — норма.

ПІДБАДЬОРЕННЯ vs ЖОРСТКІСТЬ:
- План, м'який дефіцит, покращення vs минулий тиждень — хвали й м'яко веди.
- Профіцит над підтримкою, купа фастфуду — чесний жорсткий тон + порада,
  без образ.

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

function formatStanceBlock(input: {
  netKcal: number;
  maintenance: number;
  target: number;
  goal: Goal;
  scopeLabel: string;
  /** Якщо є — вердикт за сумою періоду, а не лише середнім. */
  ledger?: {
    balanceVsTarget: number;
    balanceVsMaintenance: number;
    loggedDays: number;
    daysOverTarget: number;
  };
}): string {
  const { netKcal, maintenance, target, goal, scopeLabel, ledger } = input;
  const vsMaint = pctVsMaintenance(netKcal, maintenance);
  const planned = plannedDeficitPctFromTargets(maintenance, target);
  const stance = ledger
    ? classifyLedgerStance({
        balanceVsTarget: ledger.balanceVsTarget,
        balanceVsMaintenance: ledger.balanceVsMaintenance,
        loggedDays: ledger.loggedDays,
        daysOverTarget: ledger.daysOverTarget,
        target,
        maintenance,
        goal,
      })
    : classifyCalorieStance({
        netKcal,
        maintenance,
        target,
        goal,
      });
  const vsMaintLabel =
    vsMaint === 0
      ? "рівно підтримка"
      : vsMaint < 0
        ? `дефіцит ≈ ${Math.abs(vsMaint)}% від підтримки`
        : `профіцит ≈ +${vsMaint}% над підтримкою`;
  const planLine =
    goal === "deficit"
      ? `План дефіциту: −${planned}% від підтримки → денна ціль ${target} ккал.`
      : `План: триматись біля підтримки → денна ціль ${target} ккал.`;
  const ledgerLine = ledger
    ? `Сума vs ціль: ${ledger.balanceVsTarget >= 0 ? "+" : ""}${Math.round(ledger.balanceVsTarget)} ккал; vs підтримка: ${ledger.balanceVsMaintenance >= 0 ? "+" : ""}${Math.round(ledger.balanceVsMaintenance)} ккал; днів над ціллю: ${ledger.daysOverTarget}/${ledger.loggedDays}.`
    : "";

  return `${scopeLabel}:
Підтримка (TDEE): ${maintenance} ккал. ${planLine}
Факт (net середнє): ${netKcal} ккал → ${vsMaintLabel}.
${ledgerLine}
Готова оцінка темпу: ${stance} — ${stanceLabelUk(stance, goal)}.
Інтерпретація для тебе: орієнтуйся на СУМУ vs ціль і дні над ціллю, не лише
на середній %. "shallow" = дефіцит є, але слабший за план / були перебори;
"surplus" = профіцит над підтримкою; "on_plan" = у плані; "maintenance" =
майже без дефіциту; "deep" = глибше за план.`;
}

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
Денна ціль: ${input.targetCalories} ккал, орієнтир білка: ${input.proteinTarget} г.

${formatStanceBlock({
    netKcal: input.totals.calories,
    maintenance: input.maintenanceCalories,
    target: input.targetCalories,
    goal: input.goal,
    scopeLabel: "Калорійний темп дня",
  })}

З'їдено дотепер:
${meals}

Активність:
${acts}

Разом net: ${input.totals.calories} ккал, ${
    left >= 0 ? `до цілі лишається ${left}` : `над ціллю на ${Math.abs(left)}`
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
          ? "влучно в ціль"
          : delta > 0
            ? `над ціллю +${delta}`
            : `під ціллю ${delta}`;
      const vsMaint = pctVsMaintenance(d.calories, input.maintenanceCalories);
      const vsMaintShort =
        d.mealsCount === 0
          ? "немає записів"
          : vsMaint === 0
            ? "≈ підтримка"
            : vsMaint < 0
              ? `${vsMaint}% від підтримки`
              : `+${vsMaint}% над підтримкою`;
      const hints =
        d.mealHints.length > 0
          ? ` · ${d.mealHints.slice(0, 4).join("; ")}`
          : "";
      return `- ${d.label} (${d.date}): ${d.calories} ккал (${deltaLabel}; ${vsMaintShort}), б ${d.protein} / ж ${d.fats} / в ${d.carbs}, записів ${d.mealsCount}, спалено ${d.burned}${hints}`;
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

  const planned = input.targetCalories * logged.length;
  const eaten = logged.reduce((s, d) => s + d.calories, 0);
  const weekBalance = eaten - planned;
  const balanceVsMaint = logged.reduce(
    (s, d) => s + (d.calories - input.maintenanceCalories),
    0,
  );
  const daysOverTarget = logged.filter(
    (d) => d.calories > input.targetCalories,
  ).length;
  const balanceLabel =
    logged.length === 0
      ? "немає днів із записами"
      : weekBalance === 0
        ? "рівно в денній цілі"
        : weekBalance > 0
          ? `над денною ціллю ≈ +${weekBalance} ккал за дні з записами`
          : `під денною ціллю ≈ ${weekBalance} ккал за дні з записами`;

  const stanceBlock =
    logged.length > 0
      ? formatStanceBlock({
          netKcal: avgKcal,
          maintenance: input.maintenanceCalories,
          target: input.targetCalories,
          goal: input.goal,
          scopeLabel: "Калорійний темп тижня (сума + середнє за дні з їжею)",
          ledger: {
            balanceVsTarget: weekBalance,
            balanceVsMaintenance: balanceVsMaint,
            loggedDays: logged.length,
            daysOverTarget,
          },
        })
      : "Калорійний темп тижня: недостатньо записів.";

  let priorCmp = "Порівняння з минулим тижнем: немає даних.";
  if (input.journey.priorWeekAvgNet != null && logged.length > 0) {
    const prev = input.journey.priorWeekAvgNet;
    const prevPct = pctVsMaintenance(prev, input.maintenanceCalories);
    const nowPct = pctVsMaintenance(avgKcal, input.maintenanceCalories);
    const deltaPct = nowPct - prevPct;
    const betterForDeficit =
      input.goal === "deficit" && nowPct < prevPct;
    const betterForMaintain =
      input.goal === "maintain" &&
      Math.abs(nowPct) < Math.abs(prevPct);
    const trend =
      deltaPct === 0
        ? "без змін у % від підтримки"
        : betterForDeficit || betterForMaintain
          ? `зрушення в бік кращого темпу (${prevPct}% → ${nowPct}%)`
          : `зрушення від плану (${prevPct}% → ${nowPct}%)`;
    priorCmp = `Порівняння з минулим тижнем: тоді середнє ${prev} ккал (${prevPct}% від підтримки); зараз ${avgKcal} ккал (${nowPct}%). Підсумок: ${trend}.`;
  }

  return `Зараз НЕДІЛЯ — підбиваємо підсумок тижня ${input.weekLabel}.
Ти супроводжуєш гравця завжди: спочатку коротка рамка шляху, далі акцент на ЦЬОМУ тижні.

Гравець: ${input.name}. Ціль: ${input.goalLabel}.
Денна ціль: ${input.targetCalories} ккал, орієнтир білка: ${input.proteinTarget} г.

${formatJourneyBlock(input.journey)}

Цей тиждень:
Днів із записами: ${logged.length} з ${input.days.length}.
Середнє за дні з їжею: ${avgKcal} ккал, білок ${avgProtein} г.
Сумарний баланс vs денна ціль (лише дні з записами): ${balanceLabel}.

${stanceBlock}

${priorCmp}

По днях:
${lines || "- немає записів"}

У відповіді: 1 речення рамки шляху; вердикт із нюансом темпу (план / м'який
дефіцит / підтримка / профіцит); оцінка людини; сильна сторона + слабке
місце (якщо є); tip на наступний тиждень. ~70% уваги — на цей тиждень.`;
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
