-- CreateTable
CREATE TABLE "user_profile" (
    "id" TEXT NOT NULL DEFAULT 'me',
    "name" TEXT NOT NULL DEFAULT 'Атлет',
    "sex" TEXT NOT NULL DEFAULT 'male',
    "age" INTEGER NOT NULL DEFAULT 35,
    "heightCm" INTEGER NOT NULL DEFAULT 186,
    "weightKg" DOUBLE PRECISION NOT NULL DEFAULT 93.5,
    "goal" TEXT NOT NULL DEFAULT 'Зниження ваги / сушка, збереження і ріст силової витривалості',
    "limitations" TEXT NOT NULL DEFAULT 'Берегти спину та суглоби: без ривків, без осьового перевантаження, контроль техніки',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "detail" TEXT,
    "category" TEXT NOT NULL DEFAULT 'strength',
    "adjustable" BOOLEAN NOT NULL DEFAULT false,
    "maxWeightKg" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plans" (
    "id" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "summary" TEXT,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_days" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "title" TEXT,
    "durationMin" INTEGER NOT NULL,
    "caloriesEst" INTEGER NOT NULL,
    "rpe" DOUBLE PRECISION,
    "adaptedMode" TEXT,

    CONSTRAINT "workout_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "block" TEXT NOT NULL DEFAULT 'main',
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'strength',
    "equipment" TEXT,
    "sets" INTEGER,
    "reps" TEXT,
    "durationSec" INTEGER,
    "tempo" TEXT,
    "load" TEXT,
    "restSec" INTEGER NOT NULL DEFAULT 60,
    "tip" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_logs" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "kind" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_key_key" ON "equipment"("key");

-- CreateIndex
CREATE INDEX "workout_plans_weekStart_status_idx" ON "workout_plans"("weekStart", "status");

-- CreateIndex
CREATE UNIQUE INDEX "workout_days_planId_weekday_key" ON "workout_days"("planId", "weekday");

-- CreateIndex
CREATE INDEX "exercises_dayId_block_position_idx" ON "exercises"("dayId", "block", "position");

-- CreateIndex
CREATE INDEX "workout_logs_completedAt_idx" ON "workout_logs"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "workout_logs_dayId_target_key" ON "workout_logs"("dayId", "target");

-- AddForeignKey
ALTER TABLE "workout_days" ADD CONSTRAINT "workout_days_planId_fkey" FOREIGN KEY ("planId") REFERENCES "workout_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "workout_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "workout_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

