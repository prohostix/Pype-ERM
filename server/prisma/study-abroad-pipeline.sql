Loaded Prisma config from prisma.config.ts.

-- CreateTable
CREATE TABLE "StudyAbroadApplication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'application',
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "studentPhone" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "programId" TEXT NOT NULL,
    "universityId" TEXT,
    "sessionId" TEXT,
    "specialisation" TEXT,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "stageData" JSONB NOT NULL DEFAULT '{}',
    "stageHistory" JSONB NOT NULL DEFAULT '[]',
    "studentId" TEXT,
    "enrolledAt" TIMESTAMP(3),
    "commissionStatus" TEXT NOT NULL DEFAULT 'not_eligible',
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionTerms" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyAbroadApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyAbroadProgramCommission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "commissionType" TEXT NOT NULL DEFAULT 'fixed',
    "commissionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyAbroadProgramCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyAbroadPartnerPayout" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyAbroadPartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyAbroadApplication_organizationId_stage_idx" ON "StudyAbroadApplication"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "StudyAbroadApplication_partnerId_stage_idx" ON "StudyAbroadApplication"("partnerId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "StudyAbroadProgramCommission_organizationId_programId_key" ON "StudyAbroadProgramCommission"("organizationId", "programId");

-- CreateIndex
CREATE INDEX "StudyAbroadPartnerPayout_organizationId_partnerId_idx" ON "StudyAbroadPartnerPayout"("organizationId", "partnerId");

-- AddForeignKey
ALTER TABLE "StudyAbroadApplication" ADD CONSTRAINT "StudyAbroadApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyAbroadApplication" ADD CONSTRAINT "StudyAbroadApplication_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "StudyAbroadPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyAbroadProgramCommission" ADD CONSTRAINT "StudyAbroadProgramCommission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyAbroadPartnerPayout" ADD CONSTRAINT "StudyAbroadPartnerPayout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyAbroadPartnerPayout" ADD CONSTRAINT "StudyAbroadPartnerPayout_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "StudyAbroadPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyAbroadPartnerPayout" ADD CONSTRAINT "StudyAbroadPartnerPayout_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "StudyAbroadApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

