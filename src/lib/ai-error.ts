/** Спільна помилка ШІ-провайдерів (Gemini / OpenAI). */
export class AiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiError";
    this.status = status;
  }
}

/** @deprecated alias — старі імпорти */
export class GeminiError extends AiError {
  constructor(message: string, status = 502) {
    super(message, status);
    this.name = "GeminiError";
  }
}

export function gptApiKey(): string | undefined {
  return (
    process.env.GPT_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    undefined
  );
}
