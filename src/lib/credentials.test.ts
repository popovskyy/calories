import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkCredentials } from "./credentials";

const KEYS = ["TRAINER_USERNAME", "TRAINER_PASSWORD", "ADMIN_USERNAME", "ADMIN_PASSWORD"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("checkCredentials", () => {
  it("нічого не задано → вхід закритий для будь-чого", () => {
    expect(checkCredentials("admin", "admin")).toBe(false);
    expect(checkCredentials("", "")).toBe(false);
  });

  it("працює з ADMIN_* як фолбек", () => {
    process.env.ADMIN_USERNAME = "boss";
    process.env.ADMIN_PASSWORD = "s3cret";
    expect(checkCredentials("boss", "s3cret")).toBe(true);
    expect(checkCredentials("boss", "wrong")).toBe(false);
  });

  it("TRAINER_* мають пріоритет, а старі ADMIN_* більше не пускають", () => {
    process.env.ADMIN_USERNAME = "boss";
    process.env.ADMIN_PASSWORD = "s3cret";
    process.env.TRAINER_USERNAME = "roman";
    process.env.TRAINER_PASSWORD = "pw-for-roman";
    expect(checkCredentials("roman", "pw-for-roman")).toBe(true);
    expect(checkCredentials("boss", "s3cret")).toBe(false);
  });

  it("лише один з пари TRAINER_* → закрито, без тихого фолбеку на ADMIN_*", () => {
    process.env.ADMIN_USERNAME = "boss";
    process.env.ADMIN_PASSWORD = "s3cret";
    process.env.TRAINER_USERNAME = "roman";
    expect(checkCredentials("roman", "")).toBe(false);
    expect(checkCredentials("boss", "s3cret")).toBe(false);
  });

  it("логін без урахування крайніх пробілів, пароль — точно; регістр має значення", () => {
    process.env.TRAINER_USERNAME = "roman";
    process.env.TRAINER_PASSWORD = "Pw1";
    expect(checkCredentials("  roman ", "Pw1")).toBe(true);
    expect(checkCredentials("roman", "pw1")).toBe(false);
    expect(checkCredentials("Roman", "Pw1")).toBe(false);
  });
});
