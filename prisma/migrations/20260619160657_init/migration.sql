-- CreateEnum
CREATE TYPE "FeedSlot" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TEMPERATURE', 'AMMONIA', 'FEED', 'COMBINED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('CAUTION', 'WARNING', 'CRITICAL', 'EMERGENCY');

-- CreateTable
CREATE TABLE "TelemetryReading" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DOUBLE PRECISION NOT NULL,
    "ammonia" DOUBLE PRECISION NOT NULL,
    "fanActive" BOOLEAN NOT NULL DEFAULT false,
    "heaterActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TelemetryReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedReading" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slot" "FeedSlot" NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyFeedSummary" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalKg" DOUBLE PRECISION NOT NULL,
    "isDeclineTrend" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DailyFeedSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAISummary" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,

    CONSTRAINT "DailyAISummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelemetryReading_createdAt_idx" ON "TelemetryReading"("createdAt");

-- CreateIndex
CREATE INDEX "FeedReading_date_idx" ON "FeedReading"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FeedReading_slot_date_key" ON "FeedReading"("slot", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyFeedSummary_date_key" ON "DailyFeedSummary"("date");

-- CreateIndex
CREATE INDEX "DailyFeedSummary_date_idx" ON "DailyFeedSummary"("date");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAISummary_date_key" ON "DailyAISummary"("date");
