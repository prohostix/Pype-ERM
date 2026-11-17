-- Admin can block a student's video lectures (portal stays open).
-- Additive and safe to run before deploying the new code.
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "videoBlocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "videoBlockReason" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "videoBlockedAt" TIMESTAMP(3);
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "videoBlockedBy" TEXT;
