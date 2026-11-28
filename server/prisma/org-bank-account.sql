-- Organization bank accounts. Adds one new table; changes nothing that exists.
-- Applied to the live database on 2026-11-27. Do not run again there.

-- CreateTable
CREATE TABLE "OrgBankAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "ifscCode" TEXT,
    "branchName" TEXT,
    "accountType" TEXT NOT NULL DEFAULT 'current',
    "upiId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgBankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgBankAccount_organizationId_accountNumber_key" ON "OrgBankAccount"("organizationId", "accountNumber");

-- AddForeignKey
ALTER TABLE "OrgBankAccount" ADD CONSTRAINT "OrgBankAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
