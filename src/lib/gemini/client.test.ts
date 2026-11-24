import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AiError, AiValidationError, generateValidated } from "./client";

const schema = z.object({ n: z.number() });
type Out = z.infer<typeof schema>;

/** Послідовність відповідей «моделі»: значення → успіх, Error → виняток. */
function fake(...steps: (Out | Error)[]) {
  const run = vi.fn(async () => {
    const step = steps.shift();
    if (!step) throw new Error("unexpected extra call");
    if (step instanceof Error) throw step;
    return { data: step, raw: JSON.stringify(step) };
  });
  return run;
}

const base = (run: ReturnType<typeof fake>, over: Partial<Parameters<typeof generateValidated<Out>>[0]> = {}) =>
  generateValidated<Out>({
    system: "s",
    userParts: [{ text: "u" }],
    schema,
    semanticCheck: (d) => (d.n < 0 ? ["negative"] : []),
    qualityCheck: (d) => (d.n < 10 ? ["too small"] : []),
    run: run as never,
    ...over,
  });

describe("generateValidated", () => {
  it("відповідь без порушень — один виклик", async () => {
    const run = fake({ n: 20 });
    expect((await base(run)).data).toEqual({ n: 20 });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("м'яке порушення → ремонт, і виправлена відповідь береться", async () => {
    const run = fake({ n: 5 }, { n: 15 });
    expect((await base(run)).data).toEqual({ n: 15 });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("м'яке порушення не виправлено — приймаємо без помилки", async () => {
    const run = fake({ n: 5 }, { n: 6 });
    await expect(base(run)).resolves.toMatchObject({ data: expect.objectContaining({ n: expect.any(Number) }) });
  });

  it("ремонт ламає жорстке правило — лишається придатна відповідь першої спроби (не 502)", async () => {
    const run = fake({ n: 5 }, { n: -1 });
    expect((await base(run)).data).toEqual({ n: 5 });
  });

  it("ремонт не проходить схему — лишається відповідь першої спроби", async () => {
    const run = fake({ n: 5 }, new AiValidationError(["n: required"], "{}"));
    expect((await base(run)).data).toEqual({ n: 5 });
  });

  it("ремонт упав мережею — лишається відповідь першої спроби", async () => {
    const run = fake({ n: 5 }, new AiError("Gemini тимчасово перевантажений.", 503));
    expect((await base(run)).data).toEqual({ n: 5 });
  });

  it("жорстке порушення, яке не виправлено, — помилка", async () => {
    const run = fake({ n: -1 }, { n: -2 });
    await expect(base(run)).rejects.toBeInstanceOf(AiError);
  });

  it("помилка першого виклику (мережа) не маскується", async () => {
    const run = fake(new AiError("ліміт", 429));
    await expect(base(run)).rejects.toMatchObject({ status: 429 });
  });
});
