-- AlterEnum
ALTER TYPE "IncidentType" ADD VALUE 'MULTIPLE_MONITORS';
ALTER TYPE "IncidentType" ADD VALUE 'VIRTUAL_CAMERA';
ALTER TYPE "IncidentType" ADD VALUE 'CLIENT_INTEGRITY';

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');

-- AlterTable
ALTER TABLE "ExamSession" ADD COLUMN "verdict" TEXT,
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "evidence" TEXT,
ADD COLUMN "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewNote" TEXT,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Incident_sessionId_createdAt_idx" ON "Incident"("sessionId", "createdAt");
