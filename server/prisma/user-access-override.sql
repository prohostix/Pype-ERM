-- Per-user permission overrides. Adds one new table; changes nothing that exists.
-- Not applied yet. Review, back up, then run once.

-- CreateTable
CREATE TABLE "UserAccessOverride" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "roleAtGrant" TEXT NOT NULL,
    "departmentIdAtGrant" TEXT,
    "reason" TEXT,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,

    CONSTRAINT "UserAccessOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAccessOverride_organizationId_userId_idx" ON "UserAccessOverride"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "UserAccessOverride_userId_featureKey_action_revokedAt_idx" ON "UserAccessOverride"("userId", "featureKey", "action", "revokedAt");

