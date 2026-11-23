import { GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";
import { z } from "zod";

/** Помилка ШІ-шару з HTTP-статусом, який віддамо клієнту. */
export class AiError extends Error {
  constructor(
    message: string,
    public status: number = 502,
  ) {
    super(message);
    this.name = "AiError";
  }
}

/** Відповідь розпарсилась, але не пройшла zod — можна попросити модель виправитись. */
export class AiValidationError extends AiError {
  constructor(
    public issues: string[],
    public raw: string,
  ) {
    super(`Відповідь ШІ не відповідає схемі: ${issues.slice(0, 3).join("; ")}`, 502);
    this.name = "AiValidationError";
  }
}

/** Модель з env; без хардкоду версії (доступність моделей залежить від ключа). */
export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.7-flash";
}

/**
 * Структурована задача за чіткими правилами не потребує довгих «роздумів»: на тижневому плані
 * thinkingLevel LOW дав ~32 с проти ~79 с із дефолтним рівнем (результат так само валідний).
 * Параметр підтримують лише gemini-3*; для інших моделей його не передаємо, щоб не отримати 400.
 */
function thinkingConfig() {
  return /^gemini-3/i.test(geminiModel()) ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {};
}

let cached: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AiError("GEMINI_API_KEY не задано на сервері", 500);
  cached = new GoogleGenAI({ apiKey });
  return cached;
}

/**
 * Ключі-обмеження, які Gemini-у віддавати НЕ можна: constrained decoding будує скінченний автомат
 * за схемою, і вкладені масиви з min/maxItems, maxLength та числовими межами дають помилку
 * «schema produces a constraint that has too many states for serving» (перевірено на плані тижня).
 * Структуру (типи, enum, required, nullable) лишаємо; межі перевіряє строга zod-схема на відповіді,
 * а порушення йдуть у «ремонтний» повтор (generateValidated).
 */
const GEMINI_UNSUPPORTED_KEYS = new Set([
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "pattern",
  "format",
]);

function stripConstraints(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripConstraints);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (GEMINI_UNSUPPORTED_KEYS.has(k)) continue;
      out[k] = stripConstraints(v);
    }
    return out;
  }
  return node;
}

/** Єдине джерело правди: zod-схема → спрощена JSON Schema для Gemini; повна zod-схема валідує відповідь. */
function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete js.$schema;
  return stripConstraints(js) as Record<string, unknown>;
}

function mapApiError(e: unknown): AiError {
  if (e instanceof AiError) return e;
  const status = (e as { status?: number })?.status;
  const msg = e instanceof Error ? e.message : String(e);
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return new AiError("Ліміт запитів Gemini вичерпано. Спробуйте за хвилину.", 429);
  }
  if (status === 503 || /overloaded|UNAVAILABLE/i.test(msg)) {
    return new AiError("Gemini тимчасово перевантажений. Спробуйте ще раз.", 503);
  }
  if (status === 404) {
    return new AiError(`Модель Gemini недоступна для цього ключа (${geminiModel()}).`, 502);
  }
  if (status === 401 || status === 403 || /API key/i.test(msg)) {
    return new AiError("Gemini відхилив ключ API.", 502);
  }
  console.error("[gemini] unexpected error:", msg.slice(0, 300));
  return new AiError("Не вдалося отримати відповідь від Gemini.", 502);
}

export interface StructuredRequest<T> {
  system: string;
  contents: Content[];
  schema: z.ZodType<T>;
  temperature?: number;
  maxOutputTokens?: number;
}

export async function generateStructured<T>(
  req: StructuredRequest<T>,
): Promise<{ data: T; raw: string }> {
  let raw = "";
  try {
    const res = await client().models.generateContent({
      model: geminiModel(),
      contents: req.contents,
      config: {
        systemInstruction: req.system,
        responseMimeType: "application/json",
        responseJsonSchema: toJsonSchema(req.schema),
        temperature: req.temperature ?? 0.6,
        maxOutputTokens: req.maxOutputTokens ?? 16000,
        ...thinkingConfig(),
      },
    });
    raw = res.text ?? "";
    if (!raw) {
      const reason = res.candidates?.[0]?.finishReason ?? res.promptFeedback?.blockReason;
      throw new AiError(`Gemini повернув порожню відповідь${reason ? ` (${reason})` : ""}.`, 502);
    }
  } catch (e) {
    throw mapApiError(e);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AiValidationError(["відповідь не є коректним JSON (можливо, обрізана)"], raw);
  }
  const parsed = req.schema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new AiValidationError(issues, raw);
  }
  return { data: parsed.data, raw };
}

/**
 * Генерація з одним «ремонтним» заходом: якщо відповідь не пройшла схему або
 * семантичні правила (напр. вправа з інвентарем, якого немає), повертаємо моделі
 * її ж відповідь і список порушень — це дешевше й надійніше, ніж обирати «з нуля».
 */
export async function generateValidated<T>(opts: {
  system: string;
  userParts: Part[];
  schema: z.ZodType<T>;
  semanticCheck: (data: T) => string[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<{ data: T; model: string }> {
  const contents: Content[] = [{ role: "user", parts: opts.userParts }];
  for (let attempt = 0; attempt < 2; attempt++) {
    let issues: string[];
    let raw = "";
    try {
      const out = await generateStructured({
        system: opts.system,
        contents,
        schema: opts.schema,
        temperature: opts.temperature,
        maxOutputTokens: opts.maxOutputTokens,
      });
      raw = out.raw;
      issues = opts.semanticCheck(out.data);
      if (issues.length === 0) return { data: out.data, model: geminiModel() };
    } catch (e) {
      if (!(e instanceof AiValidationError)) throw e;
      issues = e.issues;
      raw = e.raw;
    }
    if (attempt === 1) {
      console.error("[gemini] validation failed after repair:", issues.slice(0, 5));
      throw new AiError(
        `ШІ двічі видав некоректний результат (${issues.slice(0, 2).join("; ")}). Спробуйте ще раз.`,
        502,
      );
    }
    contents.push(
      { role: "model", parts: [{ text: raw || "{}" }] },
      {
        role: "user",
        parts: [
          {
            text:
              "У твоїй відповіді є помилки:\n- " +
              issues.slice(0, 12).join("\n- ") +
              "\nПовністю перегенеруй JSON і виправ усі ці пункти.",
          },
        ],
      },
    );
  }
  throw new AiError("Не вдалося згенерувати результат.", 502);
}
