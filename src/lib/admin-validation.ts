import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Єдиний формат помилки валідації для адмін-API.
 * Zod віддає англійські технічні тексти («Too big: expected number to be <=5000»),
 * які адмін бачив у тості як є. Тут ми показуємо поле + людський текст.
 */
export function validationError(error: z.ZodError): NextResponse {
  const issue = error.issues[0];
  const field = issue?.path?.join(".");
  const message = issue?.message ?? "Невалідні дані";
  return NextResponse.json(
    {
      error: field ? `${field}: ${message}` : message,
      field,
      issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    },
    { status: 400 },
  );
}

/**
 * Раніше і POST, і PATCH ловили БУДЬ-ЯКУ помилку в catch і відповідали
 * «Такий code уже є» / «Квест не знайдено». Через це збій БД виглядав як
 * помилка вводу, і адмін годинами шукав проблему не там.
 */
export function prismaError(
  err: unknown,
  map: { unique?: string; notFound?: string } = {},
): NextResponse {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: map.unique ?? "Такий запис уже існує" },
        { status: 409 },
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json(
        { error: map.notFound ?? "Запис не знайдено" },
        { status: 404 },
      );
    }
  }
  console.error("[admin-api] unexpected error:", err);
  return NextResponse.json(
    { error: "Помилка сервера. Спробуй ще раз." },
    { status: 500 },
  );
}
