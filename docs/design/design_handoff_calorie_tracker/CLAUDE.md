# CLAUDE.md — Калькулятор калорій (Full-Stack PWA)

Персональний PWA-калькулятор калорій на двох користувачів з ШІ-аналізом їжі через Google Gemini. Цей файл — робоча специфікація для реалізації в реальному коді. Дизайн-референси й точні токени описано в `README.md`; відтворюй їх піксель-у-піксель у стеку нижче (не переноси HTML напряму).

## Стек
- **Backend:** NestJS (TypeScript), Prisma ORM (SQLite для dev / PostgreSQL для prod), `@google/generative-ai`.
- **Frontend:** React (Next.js або Vite), Tailwind CSS, shadcn/ui, Lucide React, Recharts, TanStack Query + Zustand.
- **UI/UX:** mobile-first, вигляд нативного iOS/Android, dark mode, плавні анімації. Візуальна мова — Nocturne (див. `README.md` → Design Tokens).

## Вимоги до виконання
1. Згенеруй повну структуру проєкту (NestJS backend + React/Next.js frontend).
2. Повний робочий код без скорочень, заглушок і коментарів «тут додайте свій код».
3. Усі класи, сервіси, контролери, компоненти й типи — повністю імплементовані в TypeScript.

---

## 1. Backend (NestJS)

### Prisma Schema
```prisma
model User {
  id             String    @id @default(cuid())
  name           String
  targetCalories Int        // базова денна норма калорій
  age            Int
  weight         Float
  height         Float
  meals          MealLog[]
}

model MealLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  date        String   // YYYY-MM-DD
  description String
  calories    Int
  protein     Int
  fats        Int
  carbs       Int
  imageUrl    String?
  createdAt   DateTime @default(now())
}
```

### Модулі та ендпоінти

**UsersModule**
- `GET /api/users` — список профілів.
- `POST /api/users` — створення/оновлення профілю.

**AiModule (Gemini)**
- Сервіс обробляє текстовий опис страви або фото (base64) через `gemini-1.5-flash`.
- Суворий JSON Mode (`responseSchema` / `responseMimeType: "application/json"`), повертає:
  ```ts
  { calories: number, protein: number, fats: number, carbs: number, parsedItems: string[] }
  ```
- API-ключ Gemini — з env або з профілю користувача (передається у налаштуваннях UI).

**MealsModule**
- `POST /api/meals` — приймає `{ userId, date, description, imageBase64? }`; викликає AiModule, отримує БЖУ, зберігає через Prisma, повертає створений запис.
- `GET /api/meals?userId={id}&date={date}` — прийоми їжі за день.
- `DELETE /api/meals/:id` — видалення запису.

**StatsModule (дашборд/аналітика)**
- `GET /api/stats/dashboard?userId={id}` — агрегація за останні 7 днів.
- Статус дня: `totalCalories <= targetCalories` → `green` (дефіцит/норма); `> targetCalories` → `red` (перебір).
- Формат:
  ```json
  {
    "userId": "string",
    "days": [
      {
        "date": "YYYY-MM-DD",
        "totalCalories": 0,
        "targetCalories": 0,
        "protein": 0,
        "fats": 0,
        "carbs": 0,
        "status": "green",
        "difference": 0
      }
    ]
  }
  ```

---

## 2. Frontend (React / Next.js)

Три екрани (повний опис верстки, розмірів, кольорів, копірайту — у `README.md`):

1. **Хедер** — перемикач профілів (dropdown/select активного користувача) + кнопка налаштувань (модалка: цільові калорії + GEMINI_API_KEY).
2. **Дашборд** — кільцевий прогрес-бар за сьогодні (спожито проти цілі) + тижневий Recharts `BarChart`: X — дні тижня, Y — калорії, `ReferenceLine` на `targetCalories`, стовпчики з динамічним кольором (зелений `green` / червоний `red`).
3. **Форма додавання їжі** — Textarea опису, кнопка фото/зйомки, кнопка «Розрахувати та зберегти» з loading (Skeleton/Spinner), картка ШІ-результату з розбивкою БЖУ.
4. **Список прийомів їжі за день** — картки з БЖУ та кнопкою видалення.

### Стан
- Zustand: `currentUser`, `selectedDate`, `geminiApiKey`.
- TanStack Query: `dashboard`, `meals`, мутація створення/видалення прийому.

### Статусні кольори (обов'язково)
- green: `#6bbf8a`; red: `#e0808c`; акцент/сьогодні: `#9184d9` / `#b5abfc`. Решта токенів — у `README.md`.
