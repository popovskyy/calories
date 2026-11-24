# Tactical Fit — архітектура

## 1. База даних

Окрема Postgres-схема **`trainer`** на спільній Neon-базі (`?schema=trainer` в обох URL). Поряд живуть
`calories` (гілка `calories-app`), `public` і `neon_auth` — вони не змінюються. Міграції — лише
`prisma migrate deploy` (без shadow-БД); початкова: `prisma/migrations/20261123000000_trainer_init`.

| Таблиця | Призначення | Ключове |
|---|---|---|
| `user_profile` | профіль атлета, один рядок `id="me"` | дефолти 35 р. / 186 см / 93.5 кг; `goal`, `limitations` йдуть у промпт |
| `equipment` | домашній інвентар | `key` (нормалізована назва, unique) для дедуплікації; `adjustable/maxWeightKg/weightKg`; `source` manual\|vision; `active` |
| `workout_plans` | тиждень | `weekStart` (понеділок), `status` active\|archived, `summary`, `model` |
| `workout_days` | день плану | `weekday` 0–4, `date`, `type`, `focus`, `durationMin`, `caloriesEst`, `rpe`, `adaptedMode`; unique `(planId, weekday)` |
| `exercises` | рядки дня | `block` warmup\|main\|cooldown, `sets/reps/durationSec/tempo/load/restSec/tip` |
| `workout_logs` | прогрес | unique `(dayId, target)`, `target` = id вправи або `"workout"` → hold-to-complete ідемпотентний |

Каскади: видалення плану → днів → вправ → логів. Перегенерація тижня **архівує** старий план (`status=archived`), а не видаляє.

## 2. Gemini

- `POST /api/equipment/analyze` — 1–4 фото (клієнт стискає до ≤1280px JPEG; ліміт тіла Vercel 4.5 МБ) →
  `scanSchema` → злиття в `equipment` (дедуплікація по `key`, існуючі назви передаються моделі).
- `POST /api/plan/generate` — тиждень Пн–Пт: профіль + активний інвентар (аліаси `E1…En`) + історія 3 попередніх тижнів.
- `POST /api/plan/adapt` — один день під стан: `fatigued` / `short_time` / `full_power` (+ вільна примітка).

Рішення, перевірені на живому ключі:
- **zod — єдине джерело правди**: `z.toJSONSchema` → схема для Gemini, той самий zod валідує відповідь.
- Gemini відхиляє вкладені схеми з `min/maxItems`, `maxLength` та числовими межами
  («too many states for serving»), тож у запит іде спрощена схема, а межі перевіряє zod на відповіді.
- Семантична перевірка (`plan/validate.ts`): вправа може посилатись лише на предмети з активного інвентарю,
  потрібні reps або час, `weekday` = 0..4. Порушення йдуть назад моделі в одному «ремонтному» повторі.
- `thinkingLevel: LOW` для `gemini-3*`: тиждень ~32–55 с замість ~79 с.
- Модель береться з `GEMINI_MODEL` (доступність залежить від ключа).

## 3. Автентифікація

Публічний URL + платний Gemini = обов'язкові ворота. `proxy.ts` (Next 16, Node runtime) перенаправляє на `/login`
(API → 401); кожен route handler перевіряє сесію ще раз (`lib/http.ts → handle`). Одноюзерний вхід за
`TRAINER_USERNAME/TRAINER_PASSWORD` (фолбек — `ADMIN_*`; якщо задано TRAINER_*, ADMIN_* ігноруються; порівняння в сталий час), JWT у httpOnly-cookie `trainer_session`.
Без заданих змінних вхід закритий. Від підбору пароля захищає ліміт спроб по IP (`login-limit.ts`, таблиця `login_attempts`): 8 спроб на 15 хвилин,
потім 429; спроба записується ДО перевірки пароля (паралельні запити теж рахуються) і стирається після успішного входу. manifest, `sw.js` та іконки публічні (iOS тягне manifest без cookie).

## 4. Дати

«Сьогодні» і понеділок тижня рахує **клієнт** у локальному часі (`lib/dates.ts`); сервер у UTC лише додає
дні до `weekStart` чистою арифметикою. `useToday` оновлюється при поверненні на екран (iOS PWA не перезавантажується).

## 5. Структура коду

```
src/
  proxy.ts                         авторизація
  app/
    layout.tsx · manifest.ts · globals.css (токени, hold-кнопка)
    login/                         вхід
    (app)/ page · arsenal · profile   оболонка + TabBar
    api/ auth · profile · equipment[/analyze|/[id]] · plan[/generate|/adapt] · logs
  components/
    HoldToCompleteButton.tsx       ★ кругова (ring) і лінійна (bar) варіації
    plan/    PlanScreen · DaySelector · DayCard · ExerciseCard · RestTimer · AdaptSheet · GenerateSheet · GeneratingOverlay
    arsenal/ ArsenalScreen · ScannerCard · EquipmentRow · EquipmentEditSheet
    profile/ ProfileScreen
    ui/      Sheet (Radix, рендериться всередині #app-frame) · Switch
  hooks/     queries (React Query, оптимістичні логи) · useToday
  lib/
    gemini/  client · schemas · prompts
    plan/    service (БД + оркестрація) · validate · format · serialize
    dates · equipment-key · auth · session · http · api · haptics · image-compress
```

## 6. HoldToCompleteButton

Pointer Events: `down` → старт, `up/leave/cancel` → плавний відкат кільця. Тривалість 1.5 с (`HOLD_MS`).
- Прогрес і `scale` пишуться прямо в DOM з `requestAnimationFrame` (refs), без ре-рендерів на кадр.
- iOS: `touch-action: none`, `-webkit-touch-callout: none`, `user-select: none`, `contextmenu → preventDefault`;
  на дотиці pointerleave не приходить, тому вихід пальця за межі (+24 px) перевіряє `pointermove`.
- Після завершення браузер шле «хвіст»-`click` — він ігнорується 700 мс, щоб не скасувати щойно записане.
- Клавіатура: Space/Enter утримуються так само; `aria-pressed`, `prefers-reduced-motion` вимикає пульс.
- Завершення: галочка малюється `stroke-dashoffset`, пульс-світіння, оптимістичний запис у `workout_logs`
  (відкат + тост при помилці). Тап по виконаному скасовує.

## 7. Візуальна мова («electric blue»)

Палітра зібрана за мотивами vodka.bet (лише кольори, без лого й ассетів): фон `#0C111C`, картки `#121A29`/`#192232`,
головний `#2B90FE` (градієнт `#41C6FF → #1A64FC`), кардіо `#FF5B1F`, мобіліті `#FF69B4`, виконано `#4CE892`,
золото `#FFD700` — лише для завершеного тренування. Токени — в `globals.css` (`@theme`).

- Шрифти: **Oswald** (`font-display`) для великих цифр і заголовків, Inter — текст, JetBrains Mono — дрібні дані.
- Колір дня — м'яке світло в кутку картки й градієнт прогрес-бара (синій / помаранчевий / рожевий).
- **Заряджання**: під час затиску `#charge-glow` (у layout) світиться по краях екрана з яскравістю = прогрес
  (`--charge`, пишеться з rAF у `HoldToCompleteButton`); при 100% — зелений «розряд».
- Count-up (`useCountUp`) для %, хвилин, ккал.
- **«День закрито»** (`DayClosed`) — єдиний «святковий» момент, без конфеті: від кнопки завершення розходиться тонка хвиля,
  скляна картка (blur + підйом) «матеріалізується» знизу з реальними цифрами (вправ виконано, ккал) і прогресом тижня Пн–Пт;
  щойно закритий день — єдиний золотий акцент. Показується лише коли користувач сам завершив день (false → true),
  тап закриває (з фору 900 мс проти «хвоста»-кліку), інакше зникає через ~4.6 с тим самим шляхом, яким з'явилась.
- `prefers-reduced-motion`: світіння, хвилі й count-up вимкнені, картка лише проявляється; `prefers-reduced-transparency`: без блюру.

## 8. Шкала тексту (читабельність)

Шкала задана токенами в `globals.css` (`--text-*`), тож `text-xs/sm/base…` скрізь однакові: 13.5 / 15.5 / 17 / 19 / 22 / 28 / 34 px.
Раніше основний текст був 12 px, мітки 9–11 px — це стомлювало очі. Правила:
- **Мінімум 13.5 px** (`text-xs`) — лише для другорядних міток; основний текст — `text-sm` (15.5), назви вправ і поля вводу — `text-base` (17, ≥16 px
  також не викликає автозум iOS у полях).
- Без дрібного моноширинного капсу: мітки — звичайний регістр, `font-medium/semibold`; цифри — `tabular-nums` (Oswald для великих).
- Контраст: другорядний текст не темніший за `gray-400`; `gray-500` більше не використовується для тексту.
- Інтерактивні елементи ≥ 44 px заввишки (`min-h-11`), кнопка завершення росте разом із текстом (`min-h-16`).
- Перевірка: ширини 320/360/375/390/412 — без горизонтального переповнення на плані, в шторках, арсеналі й профілі.

## 9. Відео-демонстрації

- Gemini повертає для кожної вправи `videoQuery` (англійський запит). Модель не знає справжніх id відео, тому **сама відео не обирає**.
- `GET /api/video?q=…` (за сесією): кеш `video_cache` (ключ — нормалізований запит) → інакше YouTube Data API `search`
  (`videoEmbeddable`, `safeSearch=strict`, спершу `videoDuration=short`, потім будь-яка) → до 5 кандидатів. Кеш ≤ 25 днів свіжий,
  ≤ 30 днів годиться як запасний; старіше видаляється (політика YouTube API: не зберігати дані пошуку довше 30 днів).
- `GET /api/video` без `q` → `{ enabled }`: клієнт вирішує, відкривати шторку з плеєром (`VideoSheet`, `youtube-nocookie.com`) чи
  лишити звичайне посилання на пошук. Квота вичерпана / помилка / нічого не знайдено → кнопка «Шукати на YouTube» (запасний режим).
- Тести: `video/youtube.test.ts` (усі гілки з підставним `fetch`); наскрізно перевірено проти локальної імітації API.

## 10. Цілісність даних

- Частковий унікальний індекс `workout_plans_one_active_per_week` (міграція SQL): не більше одного `active` плану на тиждень; паралельна генерація
  з двох пристроїв дає другому 409 замість дубля.
- Тиждень на екрані виводиться з «сьогодні» + зсув користувача, тож після повернення в iOS-PWA наступного тижня він перемикається сам.
- Тіло запиту читається через `readJson` (зламаний JSON → 400); інші `SyntaxError` не маскуються під помилку клієнта.
- Фото для розпізнавання стискаються ступенево під загальний бюджет ~4 МБ (ліміт тіла запиту Vercel 4.5 МБ).
- Кеш service worker для `/_next/static/` обмежений 120 записами (найстаріші видаляються першими).
