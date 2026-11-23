-- CreateTable
CREATE TABLE "video_cache" (
    "key" TEXT NOT NULL,
    "candidates" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_cache_pkey" PRIMARY KEY ("key")
);
