-- AlterTable (лише додає колонки зі значеннями за замовчуванням: наявні рядки не міняються)
ALTER TABLE "user_profile" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'intermediate',
ADD COLUMN "routine" TEXT NOT NULL DEFAULT '';
