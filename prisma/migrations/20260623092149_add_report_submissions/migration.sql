-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "report_submissions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "period" TEXT,
    "summary" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "report_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_submissions_schoolId_idx" ON "report_submissions"("schoolId");

-- CreateIndex
CREATE INDEX "report_submissions_status_idx" ON "report_submissions"("status");

-- AddForeignKey
ALTER TABLE "report_submissions" ADD CONSTRAINT "report_submissions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
