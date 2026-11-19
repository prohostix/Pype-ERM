-- Custom student-directory filters (admin-defined dropdowns) + per-student values + change history.
-- Additive only: four new tables, nothing existing is changed.
CREATE TABLE IF NOT EXISTS "StudentFilterType" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentFilterType_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "StudentFilterOption" (
  "id" TEXT NOT NULL,
  "filterTypeId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "color" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentFilterOption_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "StudentFilterValue" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "filterTypeId" TEXT NOT NULL,
  "optionId" TEXT NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentFilterValue_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "StudentFilterHistory" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "filterTypeId" TEXT NOT NULL,
  "filterName" TEXT NOT NULL,
  "fromLabel" TEXT,
  "toLabel" TEXT,
  "note" TEXT,
  "changedBy" TEXT,
  "changedByName" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentFilterHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StudentFilterType_organizationId_sortOrder_idx" ON "StudentFilterType"("organizationId", "sortOrder");
CREATE INDEX IF NOT EXISTS "StudentFilterOption_filterTypeId_sortOrder_idx" ON "StudentFilterOption"("filterTypeId", "sortOrder");
CREATE UNIQUE INDEX IF NOT EXISTS "StudentFilterValue_studentId_filterTypeId_key" ON "StudentFilterValue"("studentId", "filterTypeId");
CREATE INDEX IF NOT EXISTS "StudentFilterValue_filterTypeId_optionId_idx" ON "StudentFilterValue"("filterTypeId", "optionId");
CREATE INDEX IF NOT EXISTS "StudentFilterHistory_studentId_changedAt_idx" ON "StudentFilterHistory"("studentId", "changedAt" DESC);
CREATE INDEX IF NOT EXISTS "StudentFilterHistory_organizationId_filterTypeId_idx" ON "StudentFilterHistory"("organizationId", "filterTypeId");
ALTER TABLE "StudentFilterType" ADD CONSTRAINT "StudentFilterType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFilterOption" ADD CONSTRAINT "StudentFilterOption_filterTypeId_fkey" FOREIGN KEY ("filterTypeId") REFERENCES "StudentFilterType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFilterValue" ADD CONSTRAINT "StudentFilterValue_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFilterValue" ADD CONSTRAINT "StudentFilterValue_filterTypeId_fkey" FOREIGN KEY ("filterTypeId") REFERENCES "StudentFilterType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFilterValue" ADD CONSTRAINT "StudentFilterValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "StudentFilterOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFilterHistory" ADD CONSTRAINT "StudentFilterHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
