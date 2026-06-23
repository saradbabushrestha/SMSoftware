-- CreateTable
CREATE TABLE "teacher_evaluations" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "period" TEXT NOT NULL,
    "teaching" INTEGER NOT NULL,
    "classroom" INTEGER NOT NULL,
    "collaboration" INTEGER NOT NULL,
    "punctuality" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "teacher_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teacher_evaluations_schoolId_idx" ON "teacher_evaluations"("schoolId");

-- CreateIndex
CREATE INDEX "teacher_evaluations_teacherId_idx" ON "teacher_evaluations"("teacherId");

-- AddForeignKey
ALTER TABLE "teacher_evaluations" ADD CONSTRAINT "teacher_evaluations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_evaluations" ADD CONSTRAINT "teacher_evaluations_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
