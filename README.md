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
YOUTUBE_API_KEY=…                         # необов'язково: з ним кнопка «Як робити — відео» відкриває конкретне відео в застосунку
LIGHTS_RELAY_URL=https://elme-board.vercel.app   # необов'язково: кнопка «Світло» (LED-стрічка вдома) в шапці «Тренування»
LIGHTS_TOKEN=…                                   # вузький ключ дошки Elme лише для світла (НЕ її BOARD_TOKEN); без обох кнопки нема
```
> Ніколи не запускайте `prisma migrate reset`, `prisma migrate dev` чи `db push --force-reset`:
> база спільна з іншими проєктами. Лише `prisma migrate deploy`.

## Запуск
```bash
npm install            # postinstall → prisma generate
npm run db:migrate     # prisma migrate deploy (схема "trainer")
npm run dev
```

## Світло (LED-стрічка вдома)
Кнопка-лампочка в шапці екрана «Тренування». Застосунок на Vercel не бачить домашній ПК, тому натискання йде через дошку Elme:
`/api/lights` кладе туди «бажання», раннер на ПК (він і так опитує дошку) за ~10 с вмикає/вимикає стрічку HyperHDR і звітує
реальний стан — кнопка пульсує, поки ПК не відповів, і стає бурштиновою, якщо мовчить понад 45 с. Агенти/моделі не задіяні.
Ключ `LIGHTS_TOKEN` має бути однаковим тут і в проєкті дошки; дошка пускає його лише на `GET/POST /api/lights`. Код: `src/lib/lights.ts`.

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

## Відео-демонстрації вправ (YouTube Data API)
Без `YOUTUBE_API_KEY` кнопка «Як робити — відео» відкриває пошук на YouTube. З ключем застосунок сам підбирає конкретне
відео (коротке, з можливістю вбудування, `safeSearch=strict`), показує його в шторці з плеєром і кешує результат у таблиці
`video_cache` — один пошук на унікальний запит для всіх планів.

Ключ: [Google Cloud Console](https://console.cloud.google.com/) → проєкт → *APIs & Services → Library → YouTube Data API v3 → Enable* →
*Credentials → Create credentials → API key* → у *API restrictions* лишити лише **YouTube Data API v3**. Далі додати в Vercel Production
як `YOUTUBE_API_KEY` (і в локальний `.env`). Квота безкоштовного рівня — 10 000 одиниць/добу, пошук = 100 одиниць, тож ~100 нових запитів на добу;
повторні запити беруться з кешу.
> `YOUTUBE_API_BASE` — лише для тестів (імітація API); на Vercel не задавати.
