import { describe, expect, it } from "vitest";
import { decodeEntities, normalizeQuery, searchYoutube, youtubeSearchUrl } from "./youtube";

const item = (id: string, title = "Dead bug &amp; core &#39;form&#39;", channel = "Fit &amp; Co") => ({
  id: { videoId: id },
  snippet: { title, channelTitle: channel },
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Черга відповідей + запис викликів. */
function fakeFetch(responses: (Response | Error)[]) {
  const calls: string[] = [];
  const f = (async (url: string | URL | Request) => {
    calls.push(String(url));
    const next = responses.shift();
    if (!next) throw new Error("unexpected extra call");
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { f, calls };
}

describe("searchYoutube", () => {
  it("без ключа — unavailable/no_key й жодного запиту", async () => {
    const { f, calls } = fakeFetch([]);
    expect(await searchYoutube("plank", { fetch: f, apiKey: null })).toEqual({ status: "unavailable", reason: "no_key" });
    expect(calls).toHaveLength(0);
  });

  it("успіх з коротких відео: один запит, сутності декодовано, id без сміття відсіяно", async () => {
    const { f, calls } = fakeFetch([json({ items: [item("abcDEF12345"), item("bad id!"), { snippet: {} }] })]);
    const r = await searchYoutube("dead bug", { fetch: f, apiKey: "k", base: "http://x/v3" });
    expect(r).toEqual({ status: "ok", candidates: [{ id: "abcDEF12345", title: "Dead bug & core 'form'", channel: "Fit & Co" }] });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("videoDuration=short");
    expect(calls[0]).toContain("videoEmbeddable=true");
    expect(calls[0]).toContain("safeSearch=strict");
    expect(calls[0].startsWith("http://x/v3/search?")).toBe(true);
  });

  it("коротких немає → повторний запит без обмеження тривалості", async () => {
    const { f, calls } = fakeFetch([json({ items: [] }), json({ items: [item("longvideo123")] })]);
    const r = await searchYoutube("rare move", { fetch: f, apiKey: "k" });
    expect(r.status).toBe("ok");
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("videoDuration=short");
    expect(calls[1]).not.toContain("videoDuration");
  });

  it("взагалі нічого → none", async () => {
    const { f } = fakeFetch([json({ items: [] }), json({ items: [] })]);
    expect(await searchYoutube("zzz", { fetch: f, apiKey: "k" })).toEqual({ status: "none" });
  });

  it("квота вичерпана (403 quotaExceeded) → unavailable/quota, без другого запиту", async () => {
    const { f, calls } = fakeFetch([json({ error: { errors: [{ reason: "quotaExceeded" }] } }, 403)]);
    expect(await searchYoutube("x", { fetch: f, apiKey: "k" })).toEqual({ status: "unavailable", reason: "quota" });
    expect(calls).toHaveLength(1);
  });

  it("невірний ключ / API не ввімкнено → unavailable/error", async () => {
    const { f } = fakeFetch([json({ error: { errors: [{ reason: "keyInvalid" }] } }, 400)]);
    expect(await searchYoutube("x", { fetch: f, apiKey: "bad" })).toEqual({ status: "unavailable", reason: "error" });
  });

  it("мережева помилка й не-JSON у тілі → unavailable/error, без винятків назовні", async () => {
    expect(await searchYoutube("x", { fetch: fakeFetch([new Error("ECONNRESET")]).f, apiKey: "k" })).toEqual({ status: "unavailable", reason: "error" });
    expect(await searchYoutube("x", { fetch: fakeFetch([new Response("<html>", { status: 200 })]).f, apiKey: "k" })).toEqual({ status: "unavailable", reason: "error" });
  });
});

describe("допоміжні", () => {
  it("normalizeQuery: регістр і пробіли", () => {
    expect(normalizeQuery("  Dead   BUG\texercise ")).toBe("dead bug exercise");
  });
  it("decodeEntities: іменовані й числові, невідомі лишаються", () => {
    expect(decodeEntities("A &amp; B &lt;3 &#39;x&#39; &#x41; &nope;")).toBe("A & B <3 'x' A &nope;");
  });
  it("youtubeSearchUrl кодує кирилицю й пробіли", () => {
    expect(youtubeSearchUrl("планка як робити")).toBe("https://www.youtube.com/results?search_query=%D0%BF%D0%BB%D0%B0%D0%BD%D0%BA%D0%B0%20%D1%8F%D0%BA%20%D1%80%D0%BE%D0%B1%D0%B8%D1%82%D0%B8");
  });
});
