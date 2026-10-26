-- AlterEnum
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'LIVENESS_FAILED';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'INPUT_ANOMALY';
ALTER TYPE "IncidentType" ADD VALUE IF NOT EXISTS 'DESK_CHECK';

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'UPHELD', 'OVERTURNED');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "details" JSONB,
ADD COLUMN "seq" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "ExamSession" ADD COLUMN "pausedAt" TIMESTAMP(3),
ADD COLUMN "pausedSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "consentAt" TIMESTAMP(3),
ADD COLUMN "consentVersion" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "variantSpec" JSONB;

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "respondedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_seq_key" ON "AuditLog"("seq");

-- CreateIndex
CREATE INDEX "AuditLog_sessionId_seq_idx" ON "AuditLog"("sessionId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "Appeal_sessionId_key" ON "Appeal"("sessionId");

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
