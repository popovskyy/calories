# Калькулятор калорій

Персональний PWA-калькулятор калорій з ШІ-аналізом їжі (Gemini + GPT fallback),
акаунтами, журналом, ареною та стріками.

Єдиний **Next.js (App Router)** застосунок: UI + API Route Handlers + Prisma.

## Стек
- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Radix UI, Lucide, Recharts, Framer Motion
- **State/Data:** Zustand + TanStack Query
- **Backend:** Next.js Route Handlers, Prisma 6, Neon Postgres (`schema=calories`)
- **ШІ:** Gemini (`GEMINI_MODEL`) з fallback на OpenAI (`GPT_API_KEY`)

## Передумови
- Node.js 20+
- Neon Postgres
- `GEMINI_API_KEY` (і бажано `GPT_API_KEY`)

## Змінні оточення (`.env`)
```
CALORIES_DATABASE_URL=…?schema=calories
CALORIES_DIRECT_URL=…&schema=calories
AUTH_SECRET=…                          # мін. 16 символів
GEMINI_API_KEY=…
GEMINI_MODEL=gemini-flash-latest       # опційно
GPT_API_KEY=…                          # fallback
AI_PROVIDER=gemini                     # або openai
```
> Ніколи не запускайте `prisma migrate reset` / `db push --force-reset` на спільній Neon-базі.

## Запуск
```bash
npm install
npx prisma generate   # обовʼязково після pull / зміни schema — інакше локальний login дасть 500
npx prisma db push
npm run dev
```

Якщо після оновлення коду локально падає `/api/auth/login` з Prisma `Unknown argument username` —
просто знову виконайте `npx prisma generate` і перезапустіть `npm run dev`.

## ШІ-аналіз
- Ключі лише з env (сервер), не з UI.
- Ручний ввід ккал/БЖВ на `/add`, якщо ШІ недоступний.
- Фото стискається на клієнті перед відправкою.

## Деплой (Vercel)
Ті самі env у Production. `prisma generate` у `build` / `postinstall`. Seed на деплої не крутиться і БД не чистить.
