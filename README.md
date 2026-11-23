# Tactical Fit — AI Домашній Тренер

Персональний AI-тренер для домашніх тренувань у форматі iOS-орієнтованого PWA.
Арсенал розпізнається по фото (Gemini Vision), тиждень Пн–Пт генерується під профіль, інвентар
та історію тренувань, а кожну вправу фіксує кастомна кнопка «затисни для завершення» (1.5 с).

> Застосунок калькулятора калорій, що жив у цьому репозиторії раніше, збережено в гілці
> [`calories-app`](../../tree/calories-app) (разом із його схемою `calories` у БД, яку тренер не чіпає).

## Стек
- **Next.js 16** (App Router, `proxy.ts`), React 19, TypeScript, Tailwind CSS v4
- **PostgreSQL (Neon)** + **Prisma 6**, окрема Postgres-схема `trainer`
- **Gemini** (`@google/genai`): розпізнавання фото й генерація плану в структурованому JSON (zod → JSON Schema)
- TanStack Query (оптимістичні оновлення прогресу), Radix Dialog (шторки), sonner (тости)

## Змінні оточення
```
TRAINER_DATABASE_URL=…?schema=trainer     # pooled (runtime)
TRAINER_DIRECT_URL=…?schema=trainer       # direct (міграції)
AUTH_SECRET=…                             # мін. 16 символів, підпис сесії
TRAINER_USERNAME=…  TRAINER_PASSWORD=…    # єдиний вхід у застосунок; якщо не задані — береться ADMIN_USERNAME/ADMIN_PASSWORD
                                          # (без дефолтів: нічого не задано → вхід закрито)
GEMINI_API_KEY=…
GEMINI_MODEL=gemini-3.7-flash             # необов'язково
```
> Ніколи не запускайте `prisma migrate reset`, `prisma migrate dev` чи `db push --force-reset`:
> база спільна з іншими проєктами. Лише `prisma migrate deploy`.

## Запуск
```bash
npm install            # postinstall → prisma generate
npm run db:migrate     # prisma migrate deploy (схема "trainer")
npm run dev
```

## Скрипти
| | |
|-|-|
| `npm run build` | `prisma generate && next build` |
| `npm test` | vitest (чиста логіка: дати, форматування, валідація AI-плану) |
| `npm run typecheck` / `npm run lint` | |
| `npm run icons` | PNG-іконки з `public/icon.svg` |

## PWA на iPhone
Safari → «Поділитись» → «На початковий екран». Якщо цей origin раніше був встановлений як
калькулятор калорій — **видаліть стару іконку й додайте заново**: iOS тримає стару назву й іконку,
доки застосунок не перевстановлено.

Архітектура, схема БД та рішення — у [docs/trainer-architecture.md](docs/trainer-architecture.md).
