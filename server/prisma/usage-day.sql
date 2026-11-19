-- Platform usage tracking (heartbeats): one row per user per day. Additive only.
CREATE TABLE IF NOT EXISTS "UsageDay" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "activeSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "idleSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "awaySec" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "leaves" INTEGER NOT NULL DEFAULT 0,
  "firstSeen" TIMESTAMP(3),
  "lastSeen" TIMESTAMP(3),
  "lastState" TEXT,
  "pages" JSONB NOT NULL DEFAULT '{}',
  "segments" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UsageDay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UsageDay_userId_date_key" ON "UsageDay"("userId", "date");
CREATE INDEX IF NOT EXISTS "UsageDay_organizationId_date_idx" ON "UsageDay"("organizationId", "date");
ALTER TABLE "UsageDay" ADD CONSTRAINT "UsageDay_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UsageDay" ADD CONSTRAINT "UsageDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
