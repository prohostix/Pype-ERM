-- Developer audit trail: additive columns on "AuditLog" (existing rows keep working).
-- organizationId / userId become optional so faculty and failed-login events can be stored.
ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorType" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorName" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorRole" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "method" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "route" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "statusCode" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "module" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "description" TEXT;
-- the user relation now clears instead of blocking when a user is deleted
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_timestamp_idx" ON "AuditLog"("actorId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx" ON "AuditLog"("action");
