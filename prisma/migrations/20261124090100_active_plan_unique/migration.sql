-- Не більше одного активного плану на тиждень: паралельна генерація з двох пристроїв не залишить дубль.
-- Перевірено: у базі на момент міграції дублікатів немає.
CREATE UNIQUE INDEX "workout_plans_one_active_per_week" ON "workout_plans"("weekStart") WHERE "status" = 'active';
