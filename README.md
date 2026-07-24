# Калькулятор калорій

Персональний PWA-калькулятор калорій з ШІ-аналізом їжі (Google Gemini).
Мультипрофільний: створюйте скільки завгодно профілів, ведіть журнал прийомів їжі,
дивіться денний прогрес (кільце + БЖУ) і тижневу динаміку.

Єдиний **Next.js (App Router)** застосунок: UI + API Route Handlers + Prisma в одному проєкті.

## Стек
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Radix UI, Lucide, Recharts, Framer Motion
- **State/Data:** Zustand (persist) + TanStack Query
- **Backend:** Next.js Route Handlers, Prisma 6, Neon Postgres
- **ШІ:** `@google/generative-ai` (Gemini, суворий JSON-режим)

## Передумови
- Node.js 20+
- Postgres-база (Neon) — рядок підключення в `.env`
- Ключ Google Gemini (для ШІ-аналізу)

## Змінні оточення (`.env`)
```
DATABASE_URL=postgres://…            # Neon pooled (спільна база)
DATABASE_URL_UNPOOLED=postgres://…   # Neon direct
CALORIES_DATABASE_URL=…?schema=calories   # похідні — цей проєкт живе в схемі "calories"
CALORIES_DIRECT_URL=…&schema=calories
GEMINI_API_KEY=AIza…                 # ключ Gemini (також можна ввести в UI → Налаштування)
# GEMINI_MODEL=gemini-2.0-flash      # опційно перевизначити модель
```
> **Ізоляція БД.** Проєкт ділить одну Neon-базу з іншим застосунком, тому всі його
> таблиці винесені в окрему Postgres-схему **`calories`** через `?schema=calories`.
> Схема `public` іншого проєкту не зачіпається. Ніколи не запускайте
> `prisma migrate reset` / `db push --force-reset` на цій базі.

## Запуск
```bash
npm install
npx prisma generate
npx prisma db push        # створює таблиці в схемі "calories"
npm run dev               # http://localhost:3000
```
Застосунок стартує **порожнім** — створіть перший профіль у UI, далі додавайте прийоми їжі.

## ШІ-аналіз (Gemini)
- Ключ береться з `GEMINI_API_KEY` (env) або з налаштувань профілю в UI.
- Модель за замовчуванням — `gemini-2.0-flash`; змінюється через `GEMINI_MODEL`.
- Помилки класифікуються зрозуміло: вичерпана квота (429), невірний ключ (401),
  недоступна модель, проблеми з мережею.

## Структура
```
src/
  app/
    (main)/            # дашборд / журнал / профіль (зі спільним layout + таб-бар)
    add/               # форма додавання їжі з ШІ
    api/               # users, meals, meals/analyze, meals/[id], stats/dashboard
  components/          # ProgressRing, WeeklyChart, MealCard, DashboardHeader, діалоги…
  hooks/               # TanStack Query-хуки
  lib/                 # prisma, gemini, api-клієнт, date, types
  store/               # Zustand
prisma/schema.prisma   # User, MealLog (схема "calories")
docs/design/           # оригінальний дизайн-хендофф (референс)
```

## Деплой (Vercel)
Проєкт готовий до Vercel. Додайте ті самі змінні оточення у налаштування проєкту
(зокрема `CALORIES_DATABASE_URL` / `CALORIES_DIRECT_URL` та `GEMINI_API_KEY`).
`prisma generate` виконується автоматично на білді.
